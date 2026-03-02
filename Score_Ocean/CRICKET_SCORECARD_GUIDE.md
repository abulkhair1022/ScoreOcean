# Cricket Scorecard - Quick Guide 🏏

## What's New?

Your cricket matches now display with a professional cricket scorecard format, just like ICC matches!

## Cricket Scorecard Display

### Before (Generic)
```
Al firdous          VS          jamia
    0                              0
```

### After (Cricket-Specific)
```
┌─────────────────────────────────────┐
│ Al firdous              [BATTING]   │
│ 176/8                               │
│ Overs: 20.0                        │
│ Run Rate: 8.80                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ jamia                               │
│ 31/0                                │
│ Overs: 3.1                         │
│ Run Rate: 10.00                    │
└─────────────────────────────────────┘

Match Summary:
jamia need 146 runs to win
```

## How to Update Cricket Scores

### Step 1: Start the Match
Click "Start Match" button

### Step 2: Update Score Form
You'll see cricket-specific inputs:

**For Each Team:**
- **Runs**: Total runs scored (e.g., 176)
- **Wickets**: Wickets fallen (0-10)
- **Overs**: Complete overs bowled (e.g., 20)
- **Balls**: Extra balls in current over (0-5)

### Step 3: Enter Scores
Example for "176 runs in 20 overs with 8 wickets":
- Runs: 176
- Wickets: 8
- Overs: 20
- Balls: 0

Example for "31 runs in 3.1 overs with 0 wickets":
- Runs: 31
- Wickets: 0
- Overs: 3
- Balls: 1

### Step 4: Click Update Score
The system automatically:
- Converts overs + balls to decimal (3 overs 1 ball = 3.1)
- Calculates run rate (runs ÷ overs)
- Updates scorecard in real-time
- Shows match summary

## Features

### ✅ Automatic Calculations
- **Overs**: Converts "15 overs 3 balls" to "15.3 overs"
- **Run Rate**: Calculates runs per over automatically
- **Match Summary**: Shows runs needed or lead

### ✅ Real-time Updates
- All viewers see updates instantly
- No page refresh needed
- WebSocket-powered live scoring

### ✅ Cricket-Specific Display
- Runs/Wickets format (176/8)
- Overs with decimal precision (20.0, 3.1)
- Run rate with 2 decimal places (8.80)
- Batting indicator for current batting team

### ✅ Smart Validation
- Wickets automatically capped at 10
- Balls automatically capped at 5
- Negative values prevented
- Division by zero handled

## Sport Detection

The system automatically detects the match sport:

- **CRICKET** → Shows cricket scorecard
- **FOOTBALL** → Shows generic score (goals)
- **BASKETBALL** → Shows generic score (points)
- **Other sports** → Shows generic score

## Example Scenarios

### Scenario 1: T20 Match
```
Team A: 185/6 in 20.0 overs (Run Rate: 9.25)
Team B: 142/3 in 15.2 overs (Run Rate: 9.26)

Match Summary: Team B need 44 runs in 4.4 overs
```

### Scenario 2: ODI Match
```
Team A: 287/8 in 50.0 overs (Run Rate: 5.74)
Team B: 156/2 in 28.3 overs (Run Rate: 5.47)

Match Summary: Team B need 132 runs in 21.3 overs
```

### Scenario 3: Test Match
```
Team A: 412/10 in 98.4 overs (Run Rate: 4.18)
Team B: 89/2 in 24.0 overs (Run Rate: 3.71)

Match Summary: Team A leading by 323 runs
```

## Tips for Hosts

1. **Update Regularly**: Update scores after each over or significant event
2. **Check Wickets**: Make sure wickets count is correct (max 10)
3. **Verify Overs**: Enter complete overs + remaining balls separately
4. **Watch Run Rate**: System calculates automatically, no need to enter

## What Viewers See

### Live Match
- Current score (runs/wickets)
- Overs bowled
- Current run rate
- LIVE indicator
- Match summary
- Real-time updates

### Completed Match
- Final score
- Total overs
- Final run rate
- Match result
- Score history

## Technical Details

### Data Format
```json
{
  "homeScore": 176,
  "awayScore": 31,
  "sportSpecificData": {
    "home": {
      "runs": 176,
      "wickets": 8,
      "overs": 20.0,
      "runRate": 8.80
    },
    "away": {
      "runs": 31,
      "wickets": 0,
      "overs": 3.1,
      "runRate": 10.00
    }
  }
}
```

### Overs Calculation
- Input: 15 overs + 3 balls
- Calculation: 15 + (3 ÷ 10) = 15.3
- Display: "15.3 overs"

### Run Rate Calculation
- Formula: Runs ÷ Overs
- Example: 176 ÷ 20 = 8.80
- Display: "8.80"

## Comparison with ICC Format

### ✅ Implemented
- Runs/Wickets display
- Overs bowled
- Run rate
- Team names
- Live indicator
- Match summary

### ⏳ Coming Soon (Phase 2)
- Ball-by-ball commentary
- Player statistics
- Current batsmen
- Current bowler
- Extras (wides, no-balls)
- Required run rate (RRR)
- Partnerships
- Fall of wickets

## Troubleshooting

### Q: Scorecard shows generic format instead of cricket
**A**: Make sure the match sport is set to "CRICKET" when creating the match challenge

### Q: Run rate shows 0.00
**A**: Enter overs > 0. Run rate cannot be calculated with 0 overs

### Q: Overs showing wrong decimal
**A**: Remember: 6 balls = 1 over. Use balls field for remaining balls (0-5)

### Q: Can't enter more than 10 wickets
**A**: This is correct! Maximum 10 wickets per innings in cricket

### Q: Updates not showing in real-time
**A**: Check your internet connection. Refresh the page if needed

## Quick Reference

| Field | Range | Example | Notes |
|-------|-------|---------|-------|
| Runs | 0+ | 176 | Unlimited |
| Wickets | 0-10 | 8 | Max 10 |
| Overs | 0+ | 20 | Complete overs |
| Balls | 0-5 | 0 | Extra balls |

## Summary

✅ Cricket matches now have professional scorecards
✅ Automatic calculations for overs and run rate
✅ Real-time updates for all viewers
✅ Easy-to-use score update form
✅ Works seamlessly with other sports

---

**Ready to Use**: Yes! Start a cricket match and see the new scorecard in action!

**Need Help?**: Check the full documentation in `CRICKET_SCORING_IMPLEMENTATION.md`
