-- 009 — Durcissement sécurité (audit 2026-09-23)
--
-- Principe : les rôles client (anon, authenticated) ne peuvent plus écrire
-- les colonnes « de confiance » (confiance, points, badges, user_id, durées).
-- Les triggers qui les calculent passent en SECURITY DEFINER : ils s'exécutent
-- avec les droits du propriétaire et contournent donc la protection.
-- Rejouable : chaque CREATE POLICY / TRIGGER est précédé de son DROP IF EXISTS.

-- Rôle courant = rôle client ? (faux dans une fonction SECURITY DEFINER, où
-- current_user devient le propriétaire.)
CREATE OR REPLACE FUNCTION est_role_client()
RETURNS BOOLEAN
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$ SELECT current_user IN ('anon', 'authenticated') $$;


-- ── 1. Privilèges de table ──────────────────────────────────────────────────
-- RLS ne s'applique pas à TRUNCATE : les grants par défaut de Supabase
-- permettaient à anon de vider n'importe quelle table.
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE TRUNCATE ON TABLES FROM anon, authenticated;

-- Tables de référence : lecture seule pour les clients.
REVOKE INSERT, UPDATE, DELETE ON arrets, contextes_prix FROM anon, authenticated;
GRANT SELECT ON arrets, contextes_prix TO anon, authenticated;

ALTER TABLE arrets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS arrets_read_all ON arrets;
CREATE POLICY arrets_read_all ON arrets FOR SELECT USING (true);

ALTER TABLE contextes_prix ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS contextes_prix_read_all ON contextes_prix;
CREATE POLICY contextes_prix_read_all ON contextes_prix FOR SELECT USING (true);


-- ── 2. Confiance des lignes ─────────────────────────────────────────────────
-- Avant : confiance = SUM(votes), exécuté sans droit d'UPDATE sur lignes, donc
-- sans effet. Et s'il avait marché, un seul vote -1 aurait exclu la ligne.
-- Maintenant : mise à jour incrémentale (base 1 + votes nets), qui préserve les
-- boosts GPS. Une ligne n'est exclue du routeur qu'à confiance < 0, c'est-à-dire
-- avec au moins 2 votes négatifs nets.
CREATE OR REPLACE FUNCTION update_confiance()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ligne UUID;
  v_delta INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_ligne := NEW.ligne_id; v_delta := NEW.vote;
  ELSIF TG_OP = 'UPDATE' THEN
    v_ligne := NEW.ligne_id; v_delta := NEW.vote - OLD.vote;
  ELSE
    v_ligne := OLD.ligne_id; v_delta := -OLD.vote;
  END IF;

  IF v_delta <> 0 THEN
    UPDATE lignes SET confiance = confiance + v_delta WHERE id = v_ligne;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_confiance ON votes;
CREATE TRIGGER trigger_confiance
AFTER INSERT OR UPDATE OR DELETE ON votes
FOR EACH ROW EXECUTE FUNCTION update_confiance();

-- Pas de vote sur sa propre ligne.
CREATE OR REPLACE FUNCTION interdire_auto_vote()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM lignes WHERE id = NEW.ligne_id AND contributeur_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Impossible de voter pour sa propre ligne'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_votes_interdire_auto_vote ON votes;
CREATE TRIGGER trg_votes_interdire_auto_vote
BEFORE INSERT OR UPDATE ON votes
FOR EACH ROW EXECUTE FUNCTION interdire_auto_vote();

-- Recalage des lignes existantes sur la nouvelle règle (base 1 + votes nets).
UPDATE lignes l
SET confiance = 1 + COALESCE((SELECT SUM(v.vote) FROM votes v WHERE v.ligne_id = l.id), 0);

-- Le contributeur peut mettre à jour sa propre ligne (ajout de la photo après
-- upload : Contribution.jsx). Le trigger ci-dessous limite l'UPDATE client à photo_url.
DROP POLICY IF EXISTS lignes_update_contributeur ON lignes;
CREATE POLICY lignes_update_contributeur ON lignes FOR UPDATE
  USING ((SELECT auth.uid()) = contributeur_id)
  WITH CHECK ((SELECT auth.uid()) = contributeur_id);

CREATE OR REPLACE FUNCTION proteger_lignes()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_photo TEXT;
BEGIN
  IF NOT est_role_client() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.confiance := 1;
    NEW.contributeur_id := auth.uid();
    NEW.created_at := now();
  ELSE
    v_photo := NEW.photo_url;
    NEW := OLD;
    NEW.photo_url := v_photo;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_lignes ON lignes;
CREATE TRIGGER trg_proteger_lignes
BEFORE INSERT OR UPDATE ON lignes
FOR EACH ROW EXECUTE FUNCTION proteger_lignes();

-- Le boost GPS modifie lignes : il doit passer outre la protection.
ALTER FUNCTION boost_confiance_ligne(UUID, INTEGER)
  SECURITY DEFINER SET search_path = public, extensions, pg_temp;
REVOKE EXECUTE ON FUNCTION boost_confiance_ligne(UUID, INTEGER) FROM PUBLIC, anon, authenticated;


-- ── 3. Profils : points / contributions / badges calculés côté serveur ──────
CREATE OR REPLACE FUNCTION proteger_profils()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT est_role_client() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.points := 0;
    NEW.contributions := 0;
    NEW.badges := '{}';
  ELSE
    NEW.points := OLD.points;
    NEW.contributions := OLD.contributions;
    NEW.badges := OLD.badges;
    NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_profils ON profils;
CREATE TRIGGER trg_proteger_profils
BEFORE INSERT OR UPDATE ON profils
FOR EACH ROW EXECUTE FUNCTION proteger_profils();

ALTER FUNCTION update_contributions() SECURITY DEFINER;
ALTER FUNCTION update_contributions_trace() SECURITY DEFINER;
ALTER FUNCTION points_signalement_prix() SECURITY DEFINER;

-- Points pour un signalement (le client appelait un RPC inexistant, incrementer_points).
CREATE OR REPLACE FUNCTION points_signalement()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    UPDATE profils SET points = points + 2 WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_points_signalement ON signalements;
CREATE TRIGGER trigger_points_signalement
AFTER INSERT ON signalements
FOR EACH ROW EXECUTE FUNCTION points_signalement();


-- ── 4. Signalements : auteur, durée et débit imposés ─────────────────────────
-- Compte hors RLS : la policy de lecture masque les signalements expirés, ce
-- qui permettait de contourner la limite avec des durées courtes.
-- Limite « best effort » : deux inserts concurrents peuvent la dépasser de peu.
-- Sans paramètre : ne compte que ceux de l'appelant, donc sans fuite d'info.
CREATE OR REPLACE FUNCTION nb_mes_signalements_recents()
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT count(*)::INTEGER FROM signalements
  WHERE user_id = auth.uid() AND created_at > now() - INTERVAL '1 hour'
$$;
REVOKE EXECUTE ON FUNCTION nb_mes_signalements_recents() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION nb_mes_signalements_recents() TO authenticated;

-- Durées max alignées sur BoutonSignalement.jsx (minutes).
-- Nommé « trg_signalements_a_… » pour s'exécuter avant trg_signalements_expire
-- (les triggers BEFORE s'exécutent par ordre alphabétique).
CREATE OR REPLACE FUNCTION normaliser_signalement()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_max INTEGER;
BEGIN
  v_max := CASE NEW.type
    WHEN 'embouteillage' THEN 60
    WHEN 'accident'      THEN 120
    WHEN 'danger'        THEN 480
    WHEN 'fermeture'     THEN 1440
  END;
  NEW.duree_validite := LEAST(GREATEST(COALESCE(NEW.duree_validite, v_max), 5), v_max);

  IF est_role_client() THEN
    NEW.user_id := auth.uid();
    NEW.created_at := now();

    IF nb_mes_signalements_recents() >= 20 THEN
      RAISE EXCEPTION 'Trop de signalements, réessayez plus tard'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_signalements_a_normaliser ON signalements;
CREATE TRIGGER trg_signalements_a_normaliser
BEFORE INSERT ON signalements
FOR EACH ROW EXECUTE FUNCTION normaliser_signalement();

ALTER TABLE signalements ALTER COLUMN user_id SET DEFAULT auth.uid();
CREATE INDEX IF NOT EXISTS idx_signal_user_recent ON signalements (user_id, created_at DESC);


-- ── 5. Fonctions internes non exposées à l'API ─────────────────────────────
REVOKE EXECUTE ON FUNCTION appeler_edge_function_notifier() FROM PUBLIC, anon, authenticated;


-- ── 6. search_path figé sur les fonctions existantes ────────────────────────
DO $$
DECLARE
  f RECORD;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname IN (
        'set_expire_at', 'update_contributions', 'get_historique_prix',
        'trajets_affectes_par_signalement', 'appeler_edge_function_notifier',
        'calculer_consensus_trace', 'traces_concordantes',
        'extraire_extremites_linestring', 'lignes_proches',
        'update_contributions_trace', 'trunc_hour_immutable', 'get_prix_actuel',
        'points_signalement_prix', 'generer_code_court', 'creer_partage', 'lire_partage'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions, pg_temp', f.sig);
  END LOOP;
END;
$$;
