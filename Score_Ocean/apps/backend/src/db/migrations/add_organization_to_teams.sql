-- Add organization_id column to teams table
-- This allows teams to be associated with an organization

ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add index for organization lookups
CREATE INDEX IF NOT EXISTS idx_teams_organization ON teams(organization_id);

-- Add comment
COMMENT ON COLUMN teams.organization_id IS 'The organization this team belongs to';
