# Reference Cuts ID-Based System + AJAX-Style Submission

## Overview
Implemented a database-backed reference cuts system with unique IDs for easy tracing and no duplicates.

Also implemented AJAX-style booking submission with database-backed status tracking for duplicate prevention.

## Changes Made

### 1. `js/main.js` - Core Reference Cuts Functions
- Added `DEFAULT_REFERENCE_CUTS` array with unique IDs (e.g., 'cut-puppy', 'cut-teddy-bear')
- Added helper functions:
  - `getReferenceCuts()` - Get all reference cuts from localStorage/Firebase
  - `saveReferenceCuts(cuts)` - Save reference cuts to storage
  - `getReferenceCutById(cutId)` - Get a single cut by ID
  - `getReferenceCutName(cutId)` - Get display name from ID
  - `getActiveReferenceCuts(petType)` - Get active cuts, optionally filtered by pet type
  - `initializeReferenceCuts()` - Initialize cuts on app load

### 2. `booking.html` - Updated Cut Buttons
- Changed `data-cut` attributes from names to IDs:
  - `data-cut="Puppy Cut"` → `data-cut="cut-puppy"`
  - `data-cut="Teddy Bear Cut"` → `data-cut="cut-teddy-bear"`
  - `data-cut="Lion Cut"` → `data-cut="cut-lion"`
  - `data-cut="Summer Cut"` → `data-cut="cut-summer"`
  - `data-cut="Kennel Cut"` → `data-cut="cut-kennel"`
  - `data-cut="Show Cut"` → `data-cut="cut-show"`
- Updated `onclick` handlers to pass cut IDs

### 3. `js/booking.js` - Updated Cut Selection
- `selectGroomingCut(cutId, ev)` now:
  - Stores cut ID (not name) in `bookingData.referenceCut`
  - Uses `getReferenceCutName()` to get display name for notes field
  - Highlights selected button by ID
- `updateSummary()` now:
  - Displays preferred cut with name lookup from ID
  - Filters out cut name from notes if already displayed

### 4. `js/admin.js` - Updated Cut Display
- `extractPreferredCut(notes, booking)` now:
  - First checks `booking.referenceCut` for ID-based lookup
  - Falls back to searching notes for cut names (legacy support)
  - Uses `getReferenceCutName()` to convert ID to display name
- Updated all calls to `extractPreferredCut()` to pass booking object
- Updated booking detail modal to show cut name from ID

### 5. `js/customer.js` - Updated Cut Display
- Updated booking details to show cut name from ID
- Filters out cut name from notes if already displayed

### 6. `js/main.js` - Updated Reviews Display
- Updated preferred cut extraction to support ID-based system
- Falls back to searching notes for legacy bookings

## Reference Cut IDs

| ID | Display Name |
|---|---|
| `cut-puppy` | Puppy Cut |
| `cut-teddy-bear` | Teddy Bear Cut |
| `cut-lion` | Lion Cut |
| `cut-summer` | Summer Cut |
| `cut-kennel` | Kennel Cut |
| `cut-show` | Show Cut |

## Data Structure

```javascript
// Reference Cut Object
{
  id: 'cut-puppy',           // Unique ID stored in booking
  name: 'Puppy Cut',         // Display name
  description: 'Short & uniform all over, easy to maintain',
  image: 'assets/cuts/puppy-cut.jpg',
  petTypes: ['dog', 'cat'],  // Which pet types this cut applies to
  isActive: true,            // Whether this cut is available
  sortOrder: 1               // Display order
}

// Booking Object (stores cut ID)
{
  referenceCut: 'cut-puppy', // Cut ID, not name
  bookingNotes: 'Puppy Cut\nPlease trim ears short',
  // ... other booking fields
}
```

## Benefits

1. **Unique IDs** - Each cut has a unique identifier for database tracking
2. **No Duplicates** - IDs prevent duplicate entries
3. **Easy Tracing** - Can trace bookings by cut ID
4. **Backward Compatible** - Legacy bookings with names still work
5. **Extensible** - Easy to add new cuts via admin UI (future)
6. **Localization Ready** - Display names can be translated without changing IDs


---

# AJAX-Style Booking Submission System

## Overview
Implemented database-backed submission status tracking to prevent duplicate bookings, similar to AJAX/jQuery patterns but using modern async/await.

## How It Works

### Status Flow
```
idle -> submitting -> success/failed -> idle
```

### Database Structure
```javascript
// Stored in localStorage key: 'bookingSubmissionStatus'
{
  status: 'idle',        // idle, submitting, success, failed
  token: 'sub-xxx-xxx',  // Unique submission token
  userId: 'user-123',    // User who is submitting
  startedAt: 1703001234, // When submission started
  completedAt: null,     // When submission completed
  bookingId: null,       // Created booking ID (on success)
  error: null            // Error message (on failure)
}
```

## Functions Added (js/main.js)

| Function | Description |
|---|---|
| `getSubmissionStatus()` | Get current submission status from database |
| `saveSubmissionStatus(status)` | Save submission status to database |
| `generateSubmissionToken()` | Generate unique submission token |
| `startSubmission(userId)` | Start submission, returns token or null if blocked |
| `completeSubmissionSuccess(token, bookingId)` | Mark submission as successful |
| `completeSubmissionFailed(token, error)` | Mark submission as failed |
| `resetSubmissionStatus()` | Reset status to idle |
| `canSubmit(userId)` | Check if submission is allowed |

## Duplicate Prevention Layers

### Layer 1: Local Flag (Fast)
```javascript
if (isSubmittingBooking) {
  return; // Blocked
}
```

### Layer 2: Database Status (Reliable)
```javascript
if (!canSubmit(userId)) {
  return; // Blocked - another submission in progress
}
```

### Layer 3: Cooldown (Rate Limiting)
```javascript
if (timeSinceLastSubmit < SUBMIT_COOLDOWN_MS) {
  return; // Blocked - too fast
}
```

### Layer 4: Submission Token (Atomic Lock)
```javascript
const token = startSubmission(userId);
if (!token) {
  return; // Blocked - could not acquire lock
}
```

### Layer 5: Database Duplicate Check
```javascript
const isDuplicate = existingBookings.some(b => 
  b.userId === user.id &&
  b.date === booking.date &&
  b.time === booking.time &&
  b.petName === booking.petName &&
  b.packageId === booking.packageId &&
  (Date.now() - b.createdAt) < (5 * 60 * 1000)
);
```

## Benefits

1. **Database-Backed** - Status persists across page refreshes
2. **Unique Tokens** - Each submission has a unique identifier
3. **Stale Detection** - Auto-clears submissions older than 30 seconds
4. **Auto-Reset** - Status resets to idle after success/failure
5. **Logging** - All attempts logged for security monitoring
6. **Simple** - Easy to read and debug in database
