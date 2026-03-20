# Auto Team Creation on Registration

## Summary
Modified the registration flow to automatically create a team entity when a user registers with the TEAM role. This eliminates the need for a separate team creation step.

## Changes Made

### Backend: `apps/backend/src/services/auth.service.ts`

#### 1. Updated RegisterInput Interface
```typescript
export interface RegisterInput {
  email: string;
  password: string;
  role: UserRole;
  name: string;
  age?: number;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  sport?: string; // NEW: For TEAM role users
}
```

#### 2. Auto-Create Team on Registration
Added logic in the `register()` method to automatically create a team when role is TEAM:

```typescript
// If user role is TEAM, automatically create a team entity
if (input.role === UserRole.TEAM) {
  const teamName = input.name.trim();
  const city = input.city?.trim() || '';
  const state = input.state?.trim() || '';
  const country = input.country?.trim() || 'India';
  const sport = input.sport || 'CRICKET';
  
  await query(
    `INSERT INTO teams (name, sport, host_id, city, state, country, statistics)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [teamName, sport, user.id, city, state, country, 
     JSON.stringify({ matchesPlayed: 0, wins: 0, losses: 0, draws: 0 })]
  );
}
```

**Key Points:**
- Team name = User's name
- Team host_id = User's ID
- Team location = User's location
- Team sport = User-selected sport (or CRICKET as default)
- Initial statistics = All zeros
- All done within the same transaction (atomic operation)

### Frontend: `apps/frontend/src/pages/Register.tsx`

#### 1. Added Sport Field to Form State
```typescript
const [formData, setFormData] = useState({
  // ... existing fields
  sport: 'CRICKET', // Default sport for teams
});
```

#### 2. Added Sport Selection Dropdown
Shows only when TEAM role is selected:
```tsx
{formData.role === 'TEAM' && (
  <div>
    <label>Team Sport *</label>
    <select name="sport" value={formData.sport} onChange={handleChange} required>
      <option value="CRICKET">Cricket</option>
      <option value="FOOTBALL">Football</option>
      <option value="BASKETBALL">Basketball</option>
      <option value="BADMINTON">Badminton</option>
      <option value="VOLLEYBALL">Volleyball</option>
      <option value="KABADDI">Kabaddi</option>
    </select>
  </div>
)}
```

#### 3. Made City and State Required for TEAM Role
```typescript
// Validation
if (formData.role === 'TEAM' && (!formData.city || !formData.state)) {
  setError('City and State are required for team registration');
  return;
}

// Form fields show * indicator when TEAM role is selected
<label>City {formData.role === 'TEAM' && <span className="text-red-500">*</span>}</label>
<label>State {formData.role === 'TEAM' && <span className="text-red-500">*</span>}</label>
```

#### 4. Include Sport in Registration Data
```typescript
const registrationData = {
  // ... existing fields
  sport: formData.role === 'TEAM' ? formData.sport : undefined,
};
```

## User Experience Flow

### For TEAM Role Registration:

1. **User selects "Team" role**
   - Sport dropdown appears (required)
   - City and State become required fields

2. **User fills in the form:**
   - Name: "Al Firdous" (will be used as team name)
   - Email: "alfirdous@gmail.com"
   - Password: (secure password)
   - Role: "Team"
   - Sport: "Cricket" (or any other sport)
   - City: "Bhatkal" (required)
   - State: "Karnataka" (required)
   - Country: "India"

3. **User clicks "Create Account"**
   - User account is created with role='TEAM'
   - User profile is created with personal details
   - **Team entity is automatically created** with:
     - Name: "Al Firdous"
     - Sport: "Cricket"
     - Location: Bhatkal, Karnataka, India
     - Host: The newly created user
   - User is logged in and redirected to dashboard

4. **User navigates to Teams page**
   - "My Teams" tab shows "Al Firdous" team
   - "Browse Teams" tab also shows "Al Firdous" team
   - Team is immediately available for tournaments, matches, etc.

### For PLAYER/ORGANIZATION Roles:

- Sport field does NOT appear
- City and State remain optional
- No team is created
- Normal registration flow continues

## Benefits

1. **Seamless Experience** - No separate team creation step needed
2. **Immediate Availability** - Team appears in Browse Teams right away
3. **Consistent Data** - Team location matches user location
4. **Atomic Operation** - User and team created in single transaction
5. **No Orphaned Data** - If registration fails, neither user nor team is created

## Testing

### Test Case 1: Register as TEAM Role

**Steps:**
1. Go to /register
2. Select Role: "Team"
3. Verify sport dropdown appears
4. Fill in:
   - Name: "Test Team"
   - Email: "testteam@example.com"
   - Password: "Test@123"
   - Sport: "Football"
   - City: "Mumbai"
   - State: "Maharashtra"
5. Click "Create Account"

**Expected Result:**
- User account created with role='TEAM'
- Team "Test Team" created with sport='FOOTBALL'
- User logged in and redirected
- Team appears in "My Teams" and "Browse Teams"

**Database Verification:**
```sql
-- Check user
SELECT id, email, role FROM users WHERE email = 'testteam@example.com';

-- Check team (use user id from above)
SELECT id, name, sport, city, state, host_id 
FROM teams 
WHERE host_id = '<user_id>';
```

### Test Case 2: Register as PLAYER Role

**Steps:**
1. Go to /register
2. Select Role: "Player"
3. Verify sport dropdown does NOT appear
4. Fill in required fields (city/state optional)
5. Click "Create Account"

**Expected Result:**
- User account created with role='PLAYER'
- NO team is created
- User logged in and redirected

### Test Case 3: Validation - Missing City/State for TEAM

**Steps:**
1. Go to /register
2. Select Role: "Team"
3. Fill in name, email, password, sport
4. Leave city and state empty
5. Click "Create Account"

**Expected Result:**
- Error message: "City and State are required for team registration"
- Form not submitted
- User remains on registration page

## Database Schema

The teams table already supports all required fields:

```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  sport VARCHAR(50) NOT NULL,
  host_id UUID REFERENCES users(id),
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  statistics JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Edge Cases Handled

1. **Transaction Rollback** - If team creation fails, user creation is also rolled back
2. **Default Values** - Sport defaults to 'CRICKET' if not provided
3. **Empty Location** - City/State default to empty string if not provided
4. **Name Trimming** - Whitespace is trimmed from team name
5. **Statistics Initialization** - Team starts with zero statistics

## Future Enhancements (Optional)

1. **Custom Team Name** - Allow user to specify a different team name than their own name
2. **Multiple Teams** - Allow TEAM role users to create multiple teams
3. **Team Logo** - Upload team logo during registration
4. **Team Description** - Add team description field
5. **Invite Players** - Prompt to invite players immediately after registration

## Related Files

- `apps/backend/src/services/auth.service.ts` - Auto-creates team on registration
- `apps/frontend/src/pages/Register.tsx` - Shows sport field for TEAM role
- `apps/backend/src/db/schema.sql` - Teams table schema
- `apps/backend/src/services/team.service.ts` - Team management service
- `apps/frontend/src/pages/Teams.tsx` - Displays teams (My Teams & Browse Teams)

## Migration Notes

**For Existing TEAM Role Users:**

If there are existing users with role='TEAM' who don't have teams yet, you can run this migration:

```sql
-- Create teams for existing TEAM role users who don't have teams
INSERT INTO teams (name, sport, host_id, city, state, country, statistics)
SELECT 
  up.name,
  'CRICKET' as sport,
  u.id as host_id,
  up.city,
  up.state,
  up.country,
  '{"matchesPlayed": 0, "wins": 0, "losses": 0, "draws": 0}'::jsonb as statistics
FROM users u
JOIN user_profiles up ON u.id = up.user_id
WHERE u.role = 'TEAM'
AND NOT EXISTS (
  SELECT 1 FROM teams t WHERE t.host_id = u.id
);
```

This will create teams for all existing TEAM users who don't have teams yet.
