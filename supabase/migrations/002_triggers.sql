-- Trigger : mise à jour du score de confiance après vote
CREATE OR REPLACE FUNCTION update_confiance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE lignes
  SET confiance = (SELECT COALESCE(SUM(vote), 0) FROM votes WHERE ligne_id = NEW.ligne_id)
  WHERE id = NEW.ligne_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_confiance
AFTER INSERT OR UPDATE ON votes
FOR EACH ROW EXECUTE FUNCTION update_confiance();

-- Trigger : mise à jour du compteur de contributions dans profils
CREATE OR REPLACE FUNCTION update_contributions()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profils
  SET contributions = contributions + 1,
      points        = points + 10
  WHERE id = NEW.contributeur_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_contributions
AFTER INSERT ON lignes
FOR EACH ROW
WHEN (NEW.source = 'communaute')
EXECUTE FUNCTION update_contributions();
