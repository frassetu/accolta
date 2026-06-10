-- =============================================
-- ACCOLTA — Schéma Supabase
-- À exécuter dans SQL Editor > New query > Run
-- =============================================

-- Table principale
CREATE TABLE IF NOT EXISTS chansons (
  id         BIGSERIAL PRIMARY KEY,
  artiste    TEXT NOT NULL,
  album      TEXT,
  titre      TEXT NOT NULL,
  annee      INTEGER,
  numero     INTEGER,
  paroles    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contrainte d'unicité (nécessaire pour le upsert depuis l'app)
ALTER TABLE chansons
  DROP CONSTRAINT IF EXISTS chansons_artiste_titre_unique;

ALTER TABLE chansons
  ADD CONSTRAINT chansons_artiste_titre_unique
  UNIQUE (artiste, titre);

-- Index de recherche full-text
CREATE INDEX IF NOT EXISTS idx_chansons_artiste
  ON chansons USING gin(to_tsvector('simple', artiste));
CREATE INDEX IF NOT EXISTS idx_chansons_titre
  ON chansons USING gin(to_tsvector('simple', titre));
CREATE INDEX IF NOT EXISTS idx_chansons_paroles
  ON chansons USING gin(to_tsvector('simple', coalesce(paroles, '')));
CREATE INDEX IF NOT EXISTS idx_chansons_created
  ON chansons (created_at DESC);

-- Mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chansons_updated_at ON chansons;
CREATE TRIGGER chansons_updated_at
  BEFORE UPDATE ON chansons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- Sécurité RLS
-- =============================================

ALTER TABLE chansons ENABLE ROW LEVEL SECURITY;

-- Lecture publique pour tout le monde
DROP POLICY IF EXISTS "lecture_publique" ON chansons;
CREATE POLICY "lecture_publique" ON chansons
  FOR SELECT USING (true);

-- Écriture uniquement via service_role (l'API route de l'app)
DROP POLICY IF EXISTS "ecriture_service_role" ON chansons;
CREATE POLICY "ecriture_service_role" ON chansons
  FOR ALL USING (auth.role() = 'service_role');

SELECT 'Schéma créé avec succès !' AS status;
