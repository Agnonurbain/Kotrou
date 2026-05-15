-- Kotrou — Migration initiale
-- Transport communautaire pour Abidjan

-- Activer PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- ─────────────────────────────────────────
-- LIGNES DE TRANSPORT
-- ─────────────────────────────────────────
CREATE TABLE lignes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_ligne        TEXT NOT NULL,
  type             TEXT NOT NULL CHECK (type IN ('gbaka', 'woro', 'sotra')),

  depart_commune   TEXT NOT NULL,
  depart_quartier  TEXT,
  depart_gare      TEXT NOT NULL,
  depart_reperes   TEXT,
  depart_coords    GEOGRAPHY(POINT, 4326),

  arrivee_commune  TEXT NOT NULL,
  arrivee_quartier TEXT,
  arrivee_gare     TEXT,
  arrivee_coords   GEOGRAPHY(POINT, 4326),

  prix             INTEGER,
  duree            INTEGER,
  horaire_debut    TIME    DEFAULT '05:00',
  horaire_fin      TIME    DEFAULT '22:00',
  confiance        INTEGER DEFAULT 1,
  photo_url        TEXT,
  contributeur_id  UUID REFERENCES auth.users(id),
  source           TEXT    DEFAULT 'communaute',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lignes_depart  ON lignes USING GIST(depart_coords);
CREATE INDEX idx_lignes_arrivee ON lignes USING GIST(arrivee_coords);
CREATE INDEX idx_lignes_type    ON lignes(type);
CREATE INDEX idx_lignes_conf    ON lignes(confiance DESC);

-- ─────────────────────────────────────────
-- ARRÊTS INTERMÉDIAIRES
-- ─────────────────────────────────────────
CREATE TABLE arrets (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ligne_id  UUID REFERENCES lignes(id) ON DELETE CASCADE,
  nom       TEXT NOT NULL,
  coords    GEOGRAPHY(POINT, 4326),
  ordre     INTEGER NOT NULL
);

-- ─────────────────────────────────────────
-- SIGNALEMENTS TEMPS RÉEL
-- ─────────────────────────────────────────
CREATE TABLE signalements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type           TEXT NOT NULL
                   CHECK (type IN ('embouteillage','accident','danger','fermeture')),
  coords         GEOGRAPHY(POINT, 4326) NOT NULL,
  description    TEXT,
  user_id        UUID REFERENCES auth.users(id),
  duree_validite INTEGER DEFAULT 60,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  expire_at      TIMESTAMPTZ GENERATED ALWAYS AS
                   (created_at + (duree_validite * INTERVAL '1 minute')) STORED
);

CREATE INDEX idx_signal_coords  ON signalements USING GIST(coords);
CREATE INDEX idx_signal_expire  ON signalements(expire_at);

-- ─────────────────────────────────────────
-- PROFILS UTILISATEURS
-- ─────────────────────────────────────────
CREATE TABLE profils (
  id            UUID PRIMARY KEY REFERENCES auth.users(id),
  telephone     TEXT UNIQUE NOT NULL,
  points        INTEGER DEFAULT 0,
  contributions INTEGER DEFAULT 0,
  badges        TEXT[]  DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- VOTES SUR LES CONTRIBUTIONS
-- ─────────────────────────────────────────
CREATE TABLE votes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ligne_id   UUID REFERENCES lignes(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES auth.users(id),
  vote       SMALLINT NOT NULL CHECK (vote IN (1, -1)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ligne_id, user_id)
);

-- ─────────────────────────────────────────
-- VUE : lignes fiables (score votes >= -2)
-- ─────────────────────────────────────────
CREATE VIEW lignes_fiables AS
  SELECT l.*, COALESCE(SUM(v.vote), 0) AS score_votes, COUNT(v.id) AS nb_votes
  FROM lignes l
  LEFT JOIN votes v ON v.ligne_id = l.id
  GROUP BY l.id
  HAVING COALESCE(SUM(v.vote), 0) >= -2;

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────
ALTER TABLE lignes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE signalements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE profils       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lignes_read_all"    ON lignes FOR SELECT USING (true);
CREATE POLICY "lignes_insert_auth" ON lignes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = contributeur_id);

CREATE POLICY "signal_read_actifs" ON signalements FOR SELECT USING (expire_at > NOW());
CREATE POLICY "signal_insert_auth" ON signalements FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "votes_own"          ON votes FOR ALL TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "profils_own"        ON profils FOR ALL TO authenticated
  USING (auth.uid() = id);
