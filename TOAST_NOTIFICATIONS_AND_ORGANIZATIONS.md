# Toast Notifications and Organization Listing

## Summary
Replaced all `alert()` calls with toast notifications and implemented organization listing in the "Join Organization" modal.

## Changes Made

### 1. Toast Notification System

#### Installed Library
```bash
npm install react-hot-toast
```

#### Created Toast Utility (`apps/frontend/src/utils/toast.ts`)

**Features:**
- `showToast.success(message)` - Green success toast
- `showToast.error(message)` - Red error toast
- `showToast.loading(message)` - Blue loading toast
- `showToast.dismiss(toastId)` - Dismiss specific toast
- `showToast.promise(promise, messages)` - Promise-based toast

**Configuration:**
- Position: top-right
- Duration: 3s (success), 4s (error)
- Custom styling with colors
- Auto-dismiss

#### Updated App.tsx
Added `<Toaster />` component at the root level to enable toasts throughout the app.

### 2. Organization Listing

#### Backend: New Endpoint

**Endpoint:** `GET /api/users/organizations/all`

**Location:** `apps/backend/src/routes/user.ts`

**Parameters:**
- `limit` (optional) - Default: 100

**Response:**
```json
[
  {
    "id": "uuid",
    "email": "org@example.com",
    "role": "ORGANIZATION",
    "name": "Organization Name",
    "location": {
      "city": "Mumbai",
      "state": "Maharashtra",
      "country": "India"
    },
    "avatarUrl": "url",
    "createdAt": "2026-02-23T..."
  }
]
```

#### Frontend: Team Dashboard Updates

**New State:**
```typescript
const [availableOrganizations, setAvailableOrganizations] = useState<any[]>([]);
const [orgSearchQuery, setOrgSearchQuery] = useState('');
```

**New Functions:**
- `fetchAvailableOrganizations()` - Fetches all organizations
- `openOrganizationModal()` - Opens modal and loads organizations
- Real-time search with 300ms debounce

**Updated Modal:**
- Shows all organizations immediately
- Search bar with real-time filtering
- Organization cards with name, location
- "Join" button for each organization
- Better empty states

### 3. Replaced All Alerts with Toasts

**Updated Functions:**

1. **`handleInvitePlayer()`**
   - Success: "Invitation sent successfully!"
   - Error: Shows error message

2. **`handleRemoveMember()`**
   - Success: "Player removed successfully"
   - Error: Shows error message

3. **`handleAssignCaptain()`**
   - Success: "Captain assigned successfully"
   - Error: Shows error message

4. **`handleJoinOrganization()`**
   - Success: "Successfully joined organization"
   - Error: Shows error message

5. **`handleAddSport()`**
   - Success: "{Sport} added successfully!"
   - Error: Shows error message

6. **`handleChangePrimarySport()`**
   - Success: "Primary sport changed successfully!"
   - Error: Shows error message

7. **`handleRemoveSport()`**
   - Success: "{Sport} removed successfully!"
   - Error: Shows error message

## User Experience

### Before
- Browser `alert()` boxes (blocking, ugly)
- No organization listing (just "coming soon" message)
- Had to click "OK" to dismiss

### After
- Beautiful toast notifications (non-blocking)
- Auto-dismiss after 3-4 seconds
- Shows all organizations with search
- Can interact with page while toast is visible
- Consistent styling across all notifications

## Toast Examples

### Success Toast
```typescript
showToast.success('Invitation sent successfully!');
```
- Green background
- White text
- Checkmark icon
- 3 second duration

### Error Toast
```typescript
showToast.error('Failed to send invitation');
```
- Red background
- White text
- X icon
- 4 second duration

### Loading Toast
```typescript
const toastId = showToast.loading('Sending invitation...');
// Later...
showToast.dismiss(toastId);
showToast.success('Done!');
```

### Promise Toast
```typescript
showToast.promise(
  apiClient.post('/endpoint'),
  {
    loading: 'Sending...',
    success: 'Sent successfully!',
    error: 'Failed to send'
  }
);
```

## Organization Modal Features

### Automatic Loading
- All organizations load when modal opens
- No search required initially
- Shows up to 100 organizations

### Real-Time Search
- Type to filter organizations
- Searches: name, email, location
- Debounced 300ms
- Case-insensitive

### Organization Cards
- Organization name (bold)
- Location or email
- "Join" button
- Hover effects

### Empty States
- No organizations: "No organizations available"
- No search results: "No organizations found matching your search"
- Helpful icons

## API Usage

### Get All Organizations
```bash
GET /api/users/organizations/all
Authorization: Bearer <token>

Response: 200 OK
[
  {
    "id": "123",
    "name": "Sports Club",
    "email": "club@example.com",
    "location": {"city": "Mumbai", "state": "Maharashtra", "country": "India"}
  }
]
```

### Limit Results
```bash
GET /api/users/organizations/all?limit=50
Authorization: Bearer <token>
```

## Testing

### Manual Test Steps

#### Test Toast Notifications

1. **Invite Player**
   - Click "Invite Player"
   - Select a player
   - Click "Invite"
   - Verify green toast appears: "Invitation sent successfully!"
   - Verify toast auto-dismisses after 3 seconds

2. **Error Handling**
   - Try an action that fails
   - Verify red toast appears with error message
   - Verify toast auto-dismisses after 4 seconds

3. **Multiple Toasts**
   - Trigger multiple actions quickly
   - Verify toasts stack properly
   - Verify each dismisses independently

#### Test Organization Listing

1. **Open Modal**
   - Click "Join Organization"
   - Verify all organizations load immediately
   - Verify no "coming soon" message

2. **Search Organizations**
   - Type organization name
   - Verify list filters in real-time
   - Clear search
   - Verify all organizations reappear

3. **Join Organization**
   - Click "Join" on an organization
   - Verify toast notification appears
   - Verify modal closes (if successful)

### Database Verification

```sql
-- Check all organizations
SELECT u.id, up.name, u.email
FROM users u
JOIN user_profiles up ON u.id = up.user_id
WHERE u.role = 'ORGANIZATION'
ORDER BY up.name;
```

## Benefits

### Toast Notifications
1. **Non-Blocking** - Users can continue working
2. **Auto-Dismiss** - No need to click "OK"
3. **Beautiful** - Modern, styled notifications
4. **Consistent** - Same look across all actions
5. **Informative** - Clear success/error messages

### Organization Listing
1. **Discoverable** - See all organizations
2. **Searchable** - Find specific organizations
3. **Fast** - Loads immediately
4. **User-Friendly** - Clear UI with hover effects

## Future Enhancements

### Toast Notifications
1. **Action Buttons** - Add "Undo" or "View" buttons
2. **Custom Icons** - Different icons per notification type
3. **Sound Effects** - Optional sound on notification
4. **Notification History** - View past notifications
5. **Grouped Notifications** - Combine similar notifications

### Organization Listing
1. **Organization Details** - Show more info on hover/click
2. **Filters** - Filter by location, sport, size
3. **Sorting** - Sort by name, date, members
4. **Pagination** - For many organizations
5. **Organization Preview** - Modal with full details

## Related Files

- `apps/frontend/src/utils/toast.ts` - Toast utility functions
- `apps/frontend/src/App.tsx` - Toaster component
- `apps/backend/src/routes/user.ts` - Organizations endpoint
- `apps/frontend/src/pages/dashboards/TeamDashboard.tsx` - Updated with toasts and org listing
- `package.json` - Added react-hot-toast dependency

## Notes

- Toast notifications appear in top-right corner
- Multiple toasts stack vertically
- Toasts are accessible (keyboard navigation, screen readers)
- Organization endpoint returns all ORGANIZATION role users
- Search is client-side (no API call per keystroke)
- Confirm dialogs still use browser `confirm()` (can be replaced with custom modal if needed)
