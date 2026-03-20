# Quick Start: Cricket Data Persistence 🏏

## What's New?

Cricket match data now persists to the database! Your batting scores, bowling figures, and ball-by-ball details are saved automatically and survive page refreshes.

## Setup (One-Time)

### Step 1: Run Database Migrations

```bash
# Make the script executable (if not already)
chmod +x run-cricket-migrations.sh

# Run the migrations
./run-cricket-migrations.sh
```

This creates three new tables:
- `cricket_batting_stats` - Batsman statistics
- `cricket_bowling_stats` - Bowler statistics
- `cricket_ball_details` - Ball-by-ball history

### Step 2: Restart Backend

```bash
cd apps/backend
npm run dev
```

The backend will now have the new cricket stats API endpoints.

## How to Use

### 1. Start a Cricket Match

- Go to a cricket match page
- Click "Start Match"
- Enter bowler name (mandatory)
- Enter striker and non-striker names

### 2. Score Balls

- Click run buttons: 0, 1, 2, 3, 4, 5, 6
- Click extras: Wide, No Ball, Bye, Leg Bye
- Click Wicket when a batsman is out
- Data saves automatically after each ball

### 3. View Statistics

Scroll down to "Detailed Scorecard" section to see:

**Batting Table**:
- Batsman name
- Dismissal status
- Runs, Balls, 4s, 6s
- Strike Rate

**Bowling Figures Table** (NEW!):
- Bowler name
- Overs bowled
- Maiden overs
- Runs conceded
- Wickets taken
- Economy rate
- Wides and No balls

**Ball-by-Ball Summary**:
- Grouped by over
- Shows bowler name
- Shows all balls with color coding

### 4. Page Refresh

- Refresh the page anytime
- All data loads automatically
- Continue scoring from where you left off

### 5. End Match

- Click "End Match" when done
- Final statistics are saved
- Match marked as completed

## New Features

### ✅ Bowling Figures Display

A new table shows complete bowling analysis:

```
┌──────────┬─────┬───┬────┬───┬──────┬────┬────┐
│ Bowler   │  O  │ M │ R  │ W │ Econ │ Wd │ NB │
├──────────┼─────┼───┼────┼───┼──────┼────┼────┤
│ Bumrah   │ 4.0 │ 1 │ 24 │ 2 │ 6.00 │  2 │  0 │
│ Shami    │ 3.2 │ 0 │ 28 │ 1 │ 8.40 │  1 │  1 │
│ Jadeja   │ 2.0 │ 0 │ 12 │ 0 │ 6.00 │  0 │  0 │
└──────────┴─────┴───┴────┴───┴──────┴────┴────┘
```

Legend:
- **O** = Overs (e.g., 4.0 = 4 overs, 3.2 = 3 overs 2 balls)
- **M** = Maiden overs (no runs scored)
- **R** = Runs conceded
- **W** = Wickets taken
- **Econ** = Economy rate (runs per over)
- **Wd** = Wides bowled
- **NB** = No balls bowled

### ✅ Data Persistence

- Every ball is saved to database
- Batsman scores persist
- Bowling figures persist
- Ball-by-ball history persists
- Survives page refresh
- Permanent record keeping

### ✅ Real-time Updates

- Instant UI feedback
- Background database saves
- WebSocket broadcasts to other viewers
- No blocking operations

## Troubleshooting

### Migration Fails

If the migration script fails:

```bash
# Check PostgreSQL is running
psql -U your_user -d score_ocean -c "SELECT 1"

# Run migrations manually
psql -U your_user -d score_ocean -f apps/backend/src/db/migrations/add_cricket_match_details.sql
psql -U your_user -d score_ocean -f apps/backend/src/db/migrations/add_innings_to_cricket_stats.sql
```

### Data Not Loading

1. Check backend is running
2. Check browser console for errors
3. Verify migrations ran successfully
4. Check database connection in `.env` file

### Bowling Figures Not Showing

1. Score at least one ball
2. Refresh the page
3. Check the "Detailed Scorecard" section
4. Verify bowler name was entered

## API Endpoints

If you need to access the data programmatically:

```bash
# Get all match stats
GET /api/cricket-stats/:matchId

# Get bowling figures
GET /api/cricket-stats/:matchId/bowling-figures

# Save a ball
POST /api/cricket-stats/:matchId/ball
```

## What Gets Saved

### After Each Ball
- Ball number and over
- Bowler name
- Batsman name
- Runs scored
- Extras (if any)
- Wicket (if any)

### When Match Ends
- Final batting statistics
- Final bowling statistics
- Complete match record

## Benefits

✅ Never lose data on refresh
✅ Professional record keeping
✅ Complete match statistics
✅ Historical analysis
✅ Bowling performance tracking
✅ Player statistics
✅ Match comparisons

## Support

For issues or questions:
1. Check `CRICKET_DATA_PERSISTENCE_COMPLETE.md` for detailed documentation
2. Check browser console for errors
3. Check backend logs for errors
4. Verify database migrations ran successfully

---

**Quick Reference**:
- Migrations: `./run-cricket-migrations.sh`
- Backend: `cd apps/backend && npm run dev`
- Frontend: `cd apps/frontend && npm run dev`
- Test: Create match → Score balls → Refresh page

**Status**: ✅ Ready to Use
**Date**: 2026-02-26
