# Player Selection Feature - Quick Start Guide 🏏

## What's New?

Batsmen and bowlers are now selected from team rosters using dropdowns instead of manual text entry. All statistics are automatically linked to player profiles!

## Setup (One-Time)

### Step 1: Run Database Migration

```bash
# Run the updated migration script
./run-cricket-migrations.sh
```

This adds player ID columns to cricket statistics tables.

### Step 2: Restart Backend

```bash
cd apps/backend
npm run dev
```

### Step 3: Ensure Teams Have Players

Make sure both teams have players in their rosters:
- Go to Teams page
- Add players to each team
- Players must be registered users

## How to Use

### 1. Start a Cricket Match

- Navigate to match page
- Click "Start Match"
- Dropdowns will automatically load team players

### 2. Select Players

**Striker Dropdown**:
- Shows batting team players
- Displays jersey numbers (#10 Player Name)
- Select the batsman on strike

**Non-Striker Dropdown**:
- Shows batting team players
- Select the batsman at non-striker end

**Bowler Dropdown**:
- Shows bowling team players (opposite team)
- Select the current bowler

### 3. Score Balls

- Select players from dropdowns
- Click run buttons (0-6)
- Player statistics automatically saved
- Stats linked to player profiles

### 4. View Statistics

- Detailed scorecard shows player names
- Stats persist on page refresh
- Player profiles updated automatically
- Career statistics tracked

## Features

### ✅ Dropdown Selection
- No typing required
- No spelling errors
- Professional interface
- Jersey numbers displayed

### ✅ Team Integration
- Players from team rosters
- Batting team for batsmen
- Bowling team for bowlers
- Automatic filtering

### ✅ Data Persistence
- Player IDs saved to database
- Stats linked to user profiles
- Survives page refresh
- Complete history

### ✅ Real-time Updates
- WebSocket broadcasts
- Other viewers see updates
- Instant synchronization
- No data loss

## Example

### Before (Text Input)
```
Striker: [Type name here...]
Bowler: [Type name here...]
```
Problems:
- Typing errors
- Inconsistent names
- No validation

### After (Dropdown)
```
Striker: [Select from dropdown ▼]
  - #18 Virat Kohli
  - #45 Rohit Sharma
  - #7 MS Dhoni

Bowler: [Select from dropdown ▼]
  - #93 Jasprit Bumrah
  - #11 Mohammed Shami
```
Benefits:
- No errors
- Consistent data
- Professional UI

## Dropdown Behavior

### Striker & Non-Striker
- Shows **batting team** players only
- Changes when innings switches
- Home team batting → Shows home players
- Away team batting → Shows away players

### Bowler
- Shows **bowling team** players only
- Opposite of batting team
- Home team batting → Shows away players
- Away team batting → Shows home players

## Data Flow

```
User selects player from dropdown
  ↓
Player ID stored in state
  ↓
Player name displayed in UI
  ↓
Ball scored
  ↓
Player ID saved to database
  ↓
Stats linked to user profile
  ↓
WebSocket broadcast
  ↓
Other viewers updated
```

## Requirements

### Teams Must Have Players
- Both teams need players in rosters
- Players must be registered users
- Add players via Teams page

### Players Must Be in Database
- Players need user accounts
- Must be added to team rosters
- Check `team_rosters` table

## Troubleshooting

### Empty Dropdowns

**Problem**: No players showing in dropdowns

**Solutions**:
1. Check teams have players in rosters
2. Verify players are registered users
3. Check database `team_rosters` table
4. Refresh the page

### Wrong Team Players

**Problem**: Bowler dropdown shows batting team

**Solutions**:
1. Check `currentInnings` state
2. Verify team IDs are correct
3. Check match setup

### Player Names Not Showing

**Problem**: Seeing player IDs instead of names

**Solutions**:
1. Check `playerNameMap` is populated
2. Verify `fetchTeamRosters()` ran
3. Check API response

### Data Not Persisting

**Problem**: Player selections lost on refresh

**Solutions**:
1. Run database migration
2. Check player IDs are being saved
3. Verify backend is running
4. Check browser console for errors

## Benefits

### For Users
✅ Easy player selection
✅ No typing errors
✅ Professional interface
✅ Jersey numbers visible
✅ Quick selection

### For Data
✅ Consistent player names
✅ Linked to profiles
✅ Proper foreign keys
✅ Data integrity
✅ Query optimization

### For Statistics
✅ Career stats tracking
✅ Player performance history
✅ Team analytics
✅ Player comparisons
✅ Advanced reporting

## Testing Steps

1. **Setup**:
   - Run migration
   - Restart backend
   - Add players to teams

2. **Create Match**:
   - Create cricket match
   - Start the match

3. **Select Players**:
   - Open striker dropdown
   - Verify batting team players shown
   - Select a player
   - Repeat for non-striker and bowler

4. **Score Balls**:
   - Score some runs
   - Check player stats update
   - Verify names display correctly

5. **Refresh Page**:
   - Refresh browser
   - Verify data persists
   - Check player selections restored

6. **Switch Innings**:
   - Click "Switch Innings"
   - Verify dropdowns update
   - Check correct teams shown

## API Endpoints

### Get Team Rosters
```
GET /api/matches/:matchId/rosters
```

Returns players for both teams with jersey numbers.

### Save Ball with Player IDs
```
POST /api/cricket-stats/:matchId/ball
```

Saves ball details with batsman and bowler IDs.

## Summary

✅ **Dropdowns**: Replace text inputs
✅ **Team Rosters**: Players from teams
✅ **Data Persistence**: Player IDs saved
✅ **Profile Linking**: Stats to users
✅ **Real-time**: WebSocket updates

**Status**: ✅ Ready to Use
**Priority**: HIGH
**Impact**: Major UX improvement

---

**Quick Start**:
1. Run `./run-cricket-migrations.sh`
2. Restart backend
3. Add players to teams
4. Start match and select from dropdowns

**Date**: 2026-02-26
