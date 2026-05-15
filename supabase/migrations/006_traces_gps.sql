-- Kotrou — Migration 006 : Traces GPS + mode "Je suis dans le gbaka"

-- Étendre coords_precision pour accepter 'trace_gps'
ALTER TABLE lignes DROP CONSTRAINT IF EXISTS lignes_coords_precision_check;
ALTER TABLE lignes ADD CONSTRAINT lignes_coords_precision_check
  CHECK (coords_precision IN ('exacte', 'quartier', 'commune', 'trace_gps'));

-- Ajouter colonne trajet_line sur la table lignes (polyline GPS consolidée)
ALTER TABLE lignes ADD COLUMN IF NOT EXISTS trajet_line GEOGRAPHY(LINESTRING, 4326);

-- ─────────────────────────────────────────
-- TRACES GPS BRUTES
-- ─────────────────────────────────────────
CREATE TABLE traces_gps (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ligne_id           UUID REFERENCES lignes(id) ON DELETE SET NULL,

  trace              GEOGRAPHY(LINESTRING, 4326) NOT NULL,
  points_bruts       JSONB,

  nb_points          INTEGER NOT NULL,
  distance_km        NUMERIC(6,2),
  duree_minutes      INTEGER,
  vitesse_moyenne    NUMERIC(5,1),
  heure_depart       TIMESTAMPTZ,
  heure_arrivee      TIMESTAMPTZ,

  precision_moyenne  NUMERIC(5,1),
  pct_points_valides NUMERIC(4,1),

  statut             TEXT DEFAULT 'en_attente'
                       CHECK (statut IN ('en_attente', 'traite', 'rejete', 'insuffisant')),
  traite_at          TIMESTAMPTZ,

  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_traces_ligne  ON traces_gps(ligne_id);
CREATE INDEX idx_traces_statut ON traces_gps(statut);
CREATE INDEX idx_traces_geom   ON traces_gps USING GIST(trace);

-- ─────────────────────────────────────────
-- VUE : lignes avec nombre de traces validées
-- ─────────────────────────────────────────
CREATE VIEW lignes_avec_traces AS
  SELECT
    l.*,
    COUNT(t.id)          AS nb_traces,
    AVG(t.precision_moyenne) AS precision_avg,
    MAX(t.created_at)    AS derniere_trace_at
  FROM lignes l
  LEFT JOIN traces_gps t ON t.ligne_id = l.id AND t.statut = 'traite'
  GROUP BY l.id;

-- ─────────────────────────────────────────
-- FONCTION : consensus des traces pour une ligne
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION calculer_consensus_trace(p_ligne_id UUID)
RETURNS GEOGRAPHY LANGUAGE SQL STABLE AS $$
  WITH traces_valides AS (
    SELECT trace
    FROM traces_gps
    WHERE ligne_id = p_ligne_id
      AND statut = 'traite'
      AND nb_points >= 10
    ORDER BY precision_moyenne ASC
    LIMIT 5
  )
  SELECT ST_Union(ARRAY(SELECT trace::geometry FROM traces_valides))::geography
$$;

-- ─────────────────────────────────────────
-- FONCTION : vérifier si deux traces sont concordantes (Hausdorff)
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION traces_concordantes(
  trace_a GEOGRAPHY,
  trace_b GEOGRAPHY,
  tolerance_m INTEGER DEFAULT 150
)
RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
  SELECT ST_HausdorffDistance(trace_a::geometry, trace_b::geometry) < tolerance_m
$$;

-- ─────────────────────────────────────────
-- FONCTION : extraire début et fin d'une LINESTRING
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION extraire_extremites_linestring(linestring GEOGRAPHY)
RETURNS TABLE(debut GEOGRAPHY, fin GEOGRAPHY) LANGUAGE SQL STABLE AS $$
  SELECT
    ST_StartPoint(linestring::geometry)::geography AS debut,
    ST_EndPoint(linestring::geometry)::geography   AS fin
$$;

-- ─────────────────────────────────────────
-- FONCTION : lignes les plus proches d'une position GPS
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION lignes_proches(lng DOUBLE PRECISION, lat DOUBLE PRECISION, rayon INTEGER DEFAULT 2000, limite INTEGER DEFAULT 3)
RETURNS TABLE(
  id UUID, nom_ligne TEXT, type TEXT,
  depart_gare TEXT, arrivee_gare TEXT, distance_m DOUBLE PRECISION
)
LANGUAGE SQL STABLE AS $$
  SELECT
    l.id, l.nom_ligne, l.type, l.depart_gare, l.arrivee_gare,
    ST_Distance(l.depart_coords, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) AS distance_m
  FROM lignes l
  WHERE l.depart_coords IS NOT NULL
    AND ST_DWithin(l.depart_coords, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, rayon)
  ORDER BY distance_m
  LIMIT limite
$$;

-- ─────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────
ALTER TABLE traces_gps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "traces_read_own" ON traces_gps FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "traces_insert_own" ON traces_gps FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- FONCTION : booster la confiance d'une ligne (utilisé par l'Edge Function)
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION boost_confiance_ligne(p_ligne_id UUID, p_min INTEGER DEFAULT 5)
RETURNS VOID LANGUAGE SQL AS $$
  UPDATE lignes SET confiance = GREATEST(confiance, p_min) WHERE id = p_ligne_id
$$;

-- ─────────────────────────────────────────
-- Gamification : +15 points par trace uploadée
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_contributions_trace()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profils
  SET contributions = contributions + 1,
      points        = points + 15
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_contributions_trace
AFTER INSERT ON traces_gps
FOR EACH ROW EXECUTE FUNCTION update_contributions_trace();
