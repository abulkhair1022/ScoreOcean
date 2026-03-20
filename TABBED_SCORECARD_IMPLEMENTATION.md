# Tabbed Scorecard Implementation

The detailed scorecard now has professional tabs to switch between team innings, just like real cricket scorecards.

## Changes Made

1. Added `selectedScorecardTab` state to track which team's scorecard is displayed
2. Created tab buttons for Home Team and Away Team innings
3. Separated batting, bowling, and ball-by-ball data for each team
4. Shows current score in tab labels (e.g., "176/8")
5. Conditional rendering based on selected tab and current innings

## Features

- **Tab Navigation**: Click tabs to switch between team scorecards
- **Score Display**: Shows current score in tab label
- **Color Coding**: Blue for home team, purple for away team
- **Active Indicator**: Border highlight on active tab
- **Smart Data Display**: Only shows data for the team currently batting
- **Professional Layout**: Matches real cricket scorecard format

## Usage

Users can now:
1. View home team batting + away team bowling in one tab
2. View away team batting + home team bowling in another tab
3. See ball-by-ball summary for each innings separately
4. Switch between tabs anytime during or after the match
