ALTER TABLE lignes ADD COLUMN IF NOT EXISTS coords_precision
  TEXT DEFAULT 'exacte' CHECK (coords_precision IN ('exacte', 'quartier', 'commune'));
