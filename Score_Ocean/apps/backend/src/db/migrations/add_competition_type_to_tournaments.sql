-- Add competition_type column to tournaments table
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS competition_type VARCHAR(50) DEFAULT 'TOURNAMENT';

-- Update existing records to have TOURNAMENT as default
UPDATE tournaments 
SET competition_type = 'TOURNAMENT' 
WHERE competition_type IS NULL;
