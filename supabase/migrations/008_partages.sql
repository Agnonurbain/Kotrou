-- Kotrou — Migration 008 : Partage d'itinéraire par lien court

CREATE TABLE itineraires_partages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT NOT NULL UNIQUE,

  itineraire   JSONB NOT NULL,

  depart_nom   TEXT NOT NULL,
  arrivee_nom  TEXT NOT NULL,
  prix_total   INTEGER,
  duree_total  INTEGER,

  nb_vues      INTEGER DEFAULT 0,

  expire_at    TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_partages_code   ON itineraires_partages(code);
CREATE INDEX idx_partages_expire ON itineraires_partages(expire_at);

-- ─────────────────────────────────────────
-- Générer un code court unique (6 chars, sans ambiguïtés)
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION generer_code_court()
RETURNS TEXT LANGUAGE SQL VOLATILE AS $$
  SELECT string_agg(
    substr('abcdefghjkmnpqrstuvwxyz23456789',
           ceil(random() * 32)::integer, 1),
    ''
  )
  FROM generate_series(1, 6)
$$;

-- ─────────────────────────────────────────
-- Créer un partage et retourner le code
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION creer_partage(p_itineraire JSONB)
RETURNS TEXT LANGUAGE plpgsql VOLATILE AS $$
DECLARE
  v_code  TEXT;
  v_essai INTEGER := 0;
BEGIN
  LOOP
    v_code := generer_code_court();
    BEGIN
      INSERT INTO itineraires_partages (
        code, itineraire, depart_nom, arrivee_nom, prix_total, duree_total
      ) VALUES (
        v_code,
        p_itineraire,
        COALESCE(p_itineraire->>'depart_nom', 'Départ'),
        COALESCE(p_itineraire->>'arrivee_nom', 'Arrivée'),
        (p_itineraire->>'prix_total')::INTEGER,
        (p_itineraire->>'duree_total')::INTEGER
      );
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      v_essai := v_essai + 1;
      IF v_essai >= 5 THEN RAISE; END IF;
    END;
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────
-- Lire un partage et incrémenter les vues
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION lire_partage(p_code TEXT)
RETURNS TABLE(
  itineraire  JSONB,
  depart_nom  TEXT,
  arrivee_nom TEXT,
  prix_total  INTEGER,
  duree_total INTEGER,
  nb_vues     INTEGER,
  created_at  TIMESTAMPTZ,
  expire_at   TIMESTAMPTZ
) LANGUAGE plpgsql VOLATILE AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM itineraires_partages
    WHERE code = p_code AND expire_at > NOW()
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
    UPDATE itineraires_partages
    SET nb_vues = itineraires_partages.nb_vues + 1
    WHERE code = p_code AND expire_at > NOW()
    RETURNING itineraire, depart_nom, arrivee_nom, prix_total, duree_total,
              itineraires_partages.nb_vues, itineraires_partages.created_at,
              itineraires_partages.expire_at;
END;
$$;

-- ─────────────────────────────────────────
-- RLS : lecture publique, insertion ouverte
-- ─────────────────────────────────────────
ALTER TABLE itineraires_partages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partages_read_public" ON itineraires_partages
  FOR SELECT USING (expire_at > NOW());

CREATE POLICY "partages_insert_all" ON itineraires_partages
  FOR INSERT WITH CHECK (true);
