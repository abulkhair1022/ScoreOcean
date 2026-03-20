# Match Challenges - View & Manage Feature

## Overview

Added a "View Challenges" button and modal to the Team Dashboard where users can see and manage their match challenges (both received and sent).

## Features Added

### 1. View Challenges Button ✅
- Added blue "View Challenges" button next to "Create Match" button
- Opens a modal showing all challenges

### 2. Challenges Modal ✅
- Two tabs: "Received" and "Sent"
- Shows count of challenges in each tab
- Scrollable content area
- Responsive design

### 3. Received Challenges Tab ✅
Shows challenges from other teams:
- Challenger team name
- Status badge (PENDING, ACCEPTED, DECLINED)
- Sport, date, venue, and notes
- Accept/Decline buttons for pending challenges
- Empty state with helpful message

### 4. Sent Challenges Tab ✅
Shows challenges you've sent:
- Opponent team name
- Status badge
- Sport, date, venue, and notes
- Cancel button for pending challenges
- Empty state with "Create Match Challenge" button

### 5. Challenge Actions ✅
- **Accept**: Creates a scheduled match
- **Decline**: Rejects the challenge
- **Cancel**: Cancels a sent challenge (only for pending)

## UI Components

### View Challenges Button
```tsx
<button
  onClick={handleOpenChallenges}
  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
>
  View Challenges
</button>
```

### Challenge Card
Each challenge displays:
- Team name (challenger or opponent)
- Status badge with color coding:
  - Yellow: PENDING
  - Green: ACCEPTED
  - Red: DECLINED/CANCELLED
- Match details (sport, date, venue, notes)
- Action buttons (context-dependent)

## User Flows

### Flow 1: View Received Challenges
1. Click "View Challenges" button
2. See "Received" tab (default)
3. View challenges from other teams
4. Click "Accept" or "Decline"
5. See success toast
6. Challenge list updates

### Flow 2: View Sent Challenges
1. Click "View Challenges" button
2. Click "Sent" tab
3. View challenges you've sent
4. Click "Cancel" for pending challenges
5. See success toast
6. Challenge list updates

### Flow 3: No Challenges
1. Click "View Challenges" button
2. See empty state message
3. Click "Create Match Challenge" (in Sent tab)
4. Opens Create Match modal

## API Integration

### Fetch Challenges
```typescript
const fetchMatchChallenges = async () => {
  const [receivedRes, sentRes] = await Promise.all([
    apiClient.get('/match-challenges/received'),
    apiClient.get('/match-challenges/sent')
  ]);
  
  setReceivedChallenges(receivedRes.data.data || []);
  setSentChallenges(sentRes.data.data || []);
};
```

### Accept Challenge
```typescript
await apiClient.post(`/match-challenges/${challengeId}/accept`);
// Creates match and updates status
```

### Decline Challenge
```typescript
await apiClient.post(`/match-challenges/${challengeId}/decline`);
// Updates status to DECLINED
```

### Cancel Challenge
```typescript
await apiClient.post(`/match-challenges/${challengeId}/cancel`);
// Updates status to CANCELLED
```

## Status Colors

| Status | Color | Badge Style |
|--------|-------|-------------|
| PENDING | Yellow | `bg-yellow-100 text-yellow-800` |
| ACCEPTED | Green | `bg-green-100 text-green-800` |
| DECLINED | Red | `bg-red-100 text-red-800` |
| CANCELLED | Gray | `bg-gray-100 text-gray-800` |

## Empty States

### Received Tab (No Challenges)
```
📥 Icon
"No challenges received yet"
```

### Sent Tab (No Challenges)
```
📤 Icon
"No challenges sent yet"
[Create Match Challenge] button
```

## Responsive Design

- Modal width: `max-w-4xl` (56rem/896px)
- Scrollable content: `max-h-[calc(100vh-250px)]`
- Mobile-friendly with padding and spacing
- Buttons stack appropriately on small screens

## State Management

New state variables added:
```typescript
const [receivedChallenges, setReceivedChallenges] = useState<any[]>([]);
const [sentChallenges, setSentChallenges] = useState<any[]>([]);
const [showChallengesModal, setShowChallengesModal] = useState(false);
const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
```

## Functions Added

1. `fetchMatchChallenges()` - Fetches both received and sent challenges
2. `handleAcceptChallenge(id)` - Accepts a challenge
3. `handleDeclineChallenge(id)` - Declines a challenge
4. `handleCancelChallenge(id)` - Cancels a sent challenge
5. `handleOpenChallenges()` - Opens modal and fetches challenges

## Toast Notifications

- ✅ "Challenge accepted! Match has been scheduled."
- ✅ "Challenge declined"
- ✅ "Challenge cancelled"
- ❌ Error messages for failed actions

## Files Modified

- ✅ `apps/frontend/src/pages/dashboards/TeamDashboard.tsx`
  - Added state variables
  - Added fetch and action functions
  - Added "View Challenges" button
  - Added Match Challenges modal

## Testing

### Test Case 1: View Received Challenges
1. ✅ Login as team host
2. ✅ Another team sends you a challenge
3. ✅ Click "View Challenges"
4. ✅ See challenge in "Received" tab
5. ✅ Click "Accept" or "Decline"
6. ✅ Verify action completes

### Test Case 2: View Sent Challenges
1. ✅ Login as team host
2. ✅ Create a match challenge
3. ✅ Click "View Challenges"
4. ✅ Click "Sent" tab
5. ✅ See your challenge
6. ✅ Click "Cancel" if pending

### Test Case 3: Empty States
1. ✅ New user with no challenges
2. ✅ Click "View Challenges"
3. ✅ See empty state messages
4. ✅ Click "Create Match Challenge" in Sent tab

## Screenshots

### Received Challenges Tab
- List of challenges from other teams
- Accept/Decline buttons for pending
- Status badges

### Sent Challenges Tab
- List of challenges you've sent
- Cancel button for pending
- Status tracking

## Next Steps (Future Enhancements)

- [ ] Real-time updates via WebSocket
- [ ] Challenge notifications badge
- [ ] Filter challenges by status
- [ ] Search challenges
- [ ] Challenge history/archive
- [ ] Counter-proposal feature
- [ ] Match details link after acceptance

---

**Status**: ✅ Complete and Ready to Use

**Added on**: 2026-02-26

