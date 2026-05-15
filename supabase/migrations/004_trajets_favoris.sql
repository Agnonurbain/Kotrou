-- Kotrou — Migration 004 : Trajets favoris + Push notifications

-- ─────────────────────────────────────────
-- TRAJETS FAVORIS
-- ─────────────────────────────────────────
CREATE TABLE trajets_favoris (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nom             TEXT NOT NULL,
  depart_nom      TEXT NOT NULL,
  depart_coords   GEOGRAPHY(POINT, 4326) NOT NULL,
  arrivee_nom     TEXT NOT NULL,
  arrivee_coords  GEOGRAPHY(POINT, 4326) NOT NULL,
  trajet_line     GEOGRAPHY(LINESTRING, 4326),
  heure_depart    TIME,
  heure_arrivee   TIME,
  jours_actifs    TEXT[] DEFAULT '{"lun","mar","mer","jeu","ven"}',
  alertes_actives BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, depart_coords, arrivee_coords)
);

CREATE INDEX idx_favoris_user    ON trajets_favoris(user_id);
CREATE INDEX idx_favoris_depart  ON trajets_favoris USING GIST(depart_coords);
CREATE INDEX idx_favoris_arrivee ON trajets_favoris USING GIST(arrivee_coords);
CREATE INDEX idx_favoris_line    ON trajets_favoris USING GIST(trajet_line);

-- ─────────────────────────────────────────
-- ABONNEMENTS WEB PUSH
-- ─────────────────────────────────────────
CREATE TABLE push_subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint      TEXT NOT NULL UNIQUE,
  p256dh        TEXT NOT NULL,
  auth_key      TEXT NOT NULL,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_push_user ON push_subscriptions(user_id);

-- ─────────────────────────────────────────
-- HISTORIQUE DES NOTIFICATIONS
-- ─────────────────────────────────────────
CREATE TABLE notifications_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES auth.users(id),
  trajet_id      UUID REFERENCES trajets_favoris(id) ON DELETE SET NULL,
  signalement_id UUID REFERENCES signalements(id) ON DELETE SET NULL,
  titre          TEXT NOT NULL,
  corps          TEXT NOT NULL,
  envoyee_at     TIMESTAMPTZ DEFAULT NOW(),
  lue            BOOLEAN DEFAULT FALSE
);

-- ─────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────
ALTER TABLE trajets_favoris    ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_log  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favoris_own" ON trajets_favoris FOR ALL TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "push_own" ON push_subscriptions FOR ALL TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "notif_own" ON notifications_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- FONCTION PostGIS : trajets affectes par un signalement
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION trajets_affectes_par_signalement(
  signal_coords  GEOGRAPHY,
  rayon_metres   INTEGER DEFAULT 500
)
RETURNS TABLE(
  trajet_id   UUID,
  user_id     UUID,
  nom         TEXT,
  depart_nom  TEXT,
  arrivee_nom TEXT
)
LANGUAGE SQL STABLE AS $$
  SELECT
    tf.id AS trajet_id,
    tf.user_id,
    tf.nom,
    tf.depart_nom,
    tf.arrivee_nom
  FROM trajets_favoris tf
  WHERE tf.alertes_actives = TRUE
    AND (
      (tf.trajet_line IS NOT NULL
        AND ST_DWithin(tf.trajet_line, signal_coords, rayon_metres))
      OR
      (tf.trajet_line IS NULL
        AND ST_DWithin(
          ST_MakeLine(tf.depart_coords::geometry, tf.arrivee_coords::geometry)::geography,
          signal_coords,
          rayon_metres + 200
        ))
    );
$$;

-- ─────────────────────────────────────────
-- TRIGGER : notifier via Edge Function apres INSERT signalement
-- Utilise pg_net (pre-installe sur Supabase)
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION appeler_edge_function_notifier()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM net.http_post(
    url     := current_setting('app.edge_function_url', true)
                || '/notifier-trajets-affectes',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body    := jsonb_build_object(
      'signalement_id', NEW.id,
      'type',           NEW.type,
      'lat',            ST_Y(NEW.coords::geometry),
      'lng',            ST_X(NEW.coords::geometry)
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Edge function call failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notifier_signalement
AFTER INSERT ON signalements
FOR EACH ROW
WHEN (NEW.type IN ('danger', 'fermeture', 'accident'))
EXECUTE FUNCTION appeler_edge_function_notifier();
