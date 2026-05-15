-- Kotrou — Migration 007 : Signalement de variation de prix

-- ─────────────────────────────────────────
-- CONTEXTES DE PRIX (table de référence)
-- ─────────────────────────────────────────
CREATE TABLE contextes_prix (
  id           TEXT PRIMARY KEY,
  libelle      TEXT NOT NULL,
  description  TEXT,
  icone        TEXT,
  detecte_auto BOOLEAN DEFAULT TRUE
);

INSERT INTO contextes_prix VALUES
  ('normal',        'Normal',           'Journée ordinaire en semaine',      '☀️',  TRUE),
  ('pointe_matin',  'Heure de pointe',  'Lundi–Vendredi 6h–9h',             '🚦',  TRUE),
  ('pointe_soir',   'Heure de pointe',  'Lundi–Vendredi 17h–20h',           '🚦',  TRUE),
  ('nuit',          'Tarif nuit',       'Après 21h jusqu''à 5h',             '🌙',  TRUE),
  ('weekend',       'Weekend',          'Samedi et dimanche',                '📅',  TRUE),
  ('pluie',         'Pluie',            'Il pleut dehors',                   '🌧️', FALSE),
  ('ferie',         'Jour férié',       'Fête nationale ou jour férié',      '🎌',  FALSE),
  ('evenement',     'Événement',        'Match de foot, cérémonie, concert', '🎉',  FALSE),
  ('fin_annee',     'Fin d''année',     '24–31 décembre',                    '🎆',  TRUE);

-- ─────────────────────────────────────────
-- SIGNALEMENTS DE PRIX
-- ─────────────────────────────────────────
CREATE TABLE prix_signalements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ligne_id         UUID NOT NULL REFERENCES lignes(id) ON DELETE CASCADE,
  user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  prix_observe     INTEGER NOT NULL CHECK (prix_observe BETWEEN 50 AND 10000),
  contexte         TEXT    NOT NULL REFERENCES contextes_prix(id),

  heure_locale     INTEGER NOT NULL CHECK (heure_locale BETWEEN 0 AND 23),
  jour_semaine     INTEGER NOT NULL CHECK (jour_semaine BETWEEN 0 AND 6),
  est_ferie        BOOLEAN DEFAULT FALSE,

  note             TEXT,
  nb_confirmations INTEGER DEFAULT 0,

  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prix_ligne    ON prix_signalements(ligne_id);
CREATE INDEX idx_prix_contexte ON prix_signalements(contexte);
CREATE INDEX idx_prix_heure    ON prix_signalements(created_at DESC);

-- Wrapper immutable pour DATE_TRUNC (nécessaire pour index fonctionnel)
CREATE OR REPLACE FUNCTION trunc_hour_immutable(ts TIMESTAMPTZ)
RETURNS TIMESTAMPTZ LANGUAGE SQL IMMUTABLE PARALLEL SAFE AS $$
  SELECT DATE_TRUNC('hour', ts)
$$;

-- Contrainte : 1 signalement par utilisateur par ligne par heure
CREATE UNIQUE INDEX idx_prix_unique_hourly
  ON prix_signalements(ligne_id, user_id, (trunc_hour_immutable(created_at)));

-- ─────────────────────────────────────────
-- FONCTION : prix actuel d'une ligne
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_prix_actuel(
  p_ligne_id    UUID,
  p_contexte    TEXT,
  p_fenetre_min INTEGER DEFAULT 90
)
RETURNS TABLE(
  prix_median     INTEGER,
  nb_signalements INTEGER,
  prix_min        INTEGER,
  prix_max        INTEGER,
  dernier_signal  TIMESTAMPTZ,
  fiable          BOOLEAN
) LANGUAGE SQL STABLE AS $$
  WITH recents AS (
    SELECT prix_observe, created_at
    FROM prix_signalements
    WHERE ligne_id  = p_ligne_id
      AND contexte  = p_contexte
      AND created_at > NOW() - (p_fenetre_min * INTERVAL '1 minute')
    ORDER BY created_at DESC
    LIMIT 20
  )
  SELECT
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY prix_observe)::INTEGER,
    COUNT(*)::INTEGER,
    MIN(prix_observe),
    MAX(prix_observe),
    MAX(created_at),
    COUNT(*) >= 3
  FROM recents
$$;

-- ─────────────────────────────────────────
-- FONCTION : historique des prix par heure
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_historique_prix(
  p_ligne_id UUID,
  p_nb_jours INTEGER DEFAULT 7
)
RETURNS TABLE(
  heure_locale INTEGER,
  contexte     TEXT,
  prix_median  INTEGER,
  nb_signaux   INTEGER
) LANGUAGE SQL STABLE AS $$
  SELECT
    heure_locale,
    contexte,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY prix_observe)::INTEGER,
    COUNT(*)::INTEGER
  FROM prix_signalements
  WHERE ligne_id   = p_ligne_id
    AND created_at > NOW() - (p_nb_jours * INTERVAL '1 day')
  GROUP BY heure_locale, contexte
  HAVING COUNT(*) >= 2
  ORDER BY heure_locale, contexte
$$;

-- ─────────────────────────────────────────
-- TRIGGER : +5 points au contributeur
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION points_signalement_prix()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    UPDATE profils
    SET points        = points + 5,
        contributions = contributions + 1
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_points_prix
AFTER INSERT ON prix_signalements
FOR EACH ROW EXECUTE FUNCTION points_signalement_prix();

-- ─────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────
ALTER TABLE prix_signalements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prix_read_all" ON prix_signalements
  FOR SELECT USING (true);

CREATE POLICY "prix_insert_auth" ON prix_signalements
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
