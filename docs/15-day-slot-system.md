# 30-Day Rolling Slot Management System

## Overview

The healthcare application uses a **30-day rolling window**, including today and the next 29 IST calendar days. Daily refresh creates missing slots without resetting existing bookings. The document filename is retained for existing links.

## Key Features

### 🔄 Daily Refresh
- **Schedule**: Every day at 12:01 AM IST
- **Function**: Ensures slots exist for all 30 calendar days
- **Behavior**: Creates missing slots, maintains rolling window

### 🗑️ Daily Cleanup
- **Schedule**: Every day at 1:00 AM IST
- **Function**: Removes slots and appointments from previous IST calendar days
- **Behavior**: Removes past appointments before slots, including booked slots. Today's and future bookings are preserved. Past appointment history is permanently deleted.

### 📅 Slot Distribution (15-minute intervals)
- **Monday-Saturday**: Ghodasar Clinic (30 slots/day) + Vastral Clinic (12 slots/day)
- **Sunday**: Gandhinagar Clinic only (20 slots/day)
- **Slot Duration**: 15 minutes per slot (doubled capacity from previous 30-minute slots)

## How It Works

### Initialization
When the local server starts:
1. Connects to MongoDB
2. Ensures slots exist for the 30-day window
3. Logs the Vercel cron schedules (local startup does not start a scheduler)
4. Logs initialization status

On Vercel, requests await the database connection. Cold starts do not run cleanup
or slot generation; only scheduled jobs perform these operations.

### Daily Operations

#### 12:01 AM IST - Daily Refresh
```javascript
// Uses the configured 30-day default.
await slotService.ensureSlotsExist()
await slotService.cleanupOldSlots()
```

#### 1:00 AM IST - Cleanup
```javascript
// Removes previous-day appointments first, then all previous-day slots.
await slotService.cleanupOldSlots()
```

## Benefits

### ✅ Advantages
- **Efficient Storage**: Only maintains necessary slots
- **Automatic Management**: No manual intervention required
- **Consistent Availability**: 30 calendar days of bookable slots, including today
- **Clean Database**: Regular cleanup prevents bloat
- **Retention Policy**: Past appointments are permanently deleted along with past slots

### 📊 Performance
- Reduced database size
- Faster queries (smaller dataset)
- Efficient indexing
- Minimal storage overhead

## Testing

Existing manual scripts below connect to a database and can
create or delete data; do not run them against production just to validate a deployment.

### Legacy Scripts

Scripts named `test15DaySlots` and `migrateTo15DaySystem` are legacy 15-day
tools, not validation or migration tools for the current window. Do not run
the old migration against production: it can remove slots beyond 15 days.

#### 1. Comprehensive Test
```bash
npm run test-15day-slots
```
- Tests initialization
- Verifies the legacy 15-day window, not the current 30-day configuration
- Checks slot distribution
- Validates cleanup

#### 2. Manual Refresh
```bash
npm run trigger-daily-refresh
```
- Simulates daily cron job
- Shows before/after state
- Generates and reports the configured 30-day window

### Manual Testing
```javascript
// Check current slots
const slots = await Slot.countDocuments()

// Check the 30-day window (date fields encode IST calendar days as UTC midnight)
const today = getISTCalendarDay()
const end = new Date(today)
end.setUTCDate(end.getUTCDate() + SLOT_WINDOW_DAYS)
const futureSlots = await Slot.countDocuments({
  date: {
    $gte: today,
    $lt: end
  }
})
```

## Configuration

### Time Slots by Clinic

#### Ghodasar Clinic (Monday-Saturday)
- Morning: 7:00-8:30 AM (6 slots × 15-min)
- Extended Morning: 9:00 AM-12:00 PM (12 slots × 15-min)
- Afternoon: 1:00-2:00 PM (4 slots × 15-min)
- Evening: 8:30-10:30 PM (8 slots × 15-min)
- **Total: 30 slots per day**

#### Vastral Clinic (Monday-Saturday)
- Afternoon: 4:00-7:00 PM (12 slots × 15-min)
- **Total: 12 slots per day**

#### Gandhinagar Clinic (Sunday only)
- Afternoon: 12:00-5:00 PM (20 slots × 15-min)
- **Total: 20 slots per day**

### Cron Schedule
Vercel uses UTC schedules and sends GET requests:

The daily schedule stays unchanged when increasing the window: the refresh
handler now ensures 30 days. Deploy both backend and frontend so generation,
booking validation, and the date picker agree on the final bookable date.

| Endpoint | UTC expression | IST time |
| --- | --- | --- |
| `/api/cron/daily-slot-refresh` | `31 18 * * *` | 12:01 AM |
| `/api/cron/slot-cleanup` | `30 19 * * *` | 1:00 AM |
| `/api/cron/appointment-cleanup` | `30 20 * * *` | 2:00 AM |

Both cleanup endpoints remove previous-day appointments before deleting slots.
POST remains supported for existing manual integrations.

Cron endpoints do not require authentication or `CRON_SECRET`. Anyone who knows
the URLs can invoke generation or permanently delete previous-day appointments
and slots. These endpoints are public, not restricted to Vercel.

Redeploy the backend after changing the schedules or handlers. Inspect the backend
project's Cron Jobs and runtime logs for each endpoint. Service failures return
500 rather than success. `/api/cron/status` reports slot counts and expected
schedule times, not proof that a cron invocation succeeded. On Hobby plans,
execution timing can vary within the scheduled hour.

## Monitoring

### Log Messages
- `🔄 Daily slot refresh started`
- `✅ Daily 30-day slot refresh completed`
- `🗑️ Cleaned up X past slots`
- `📅 Maintaining slots for next 30 days`

### Health Checks
Monitor these metrics:
- Total slots in database
- Slots for next 30 days and missing dates from `/api/cron/status`
- Old unbooked slots count
- Clinic distribution balance

## Troubleshooting

### Common Issues

#### No Slots Generated
- Check doctor exists in database
- Verify MongoDB connection
- Check cron job status
- Review error logs

#### Too Many Old Slots
- Run manual cleanup: `slotService.cleanupOldSlots()`
- Check cleanup cron job
- Verify date calculations

#### Missing Future Slots
- Run manual refresh: `slotService.generateDailySlots()`
- Check 30-day generation logic
- Verify clinic schedules

### Manual Recovery
```javascript
// Emergency slot generation
await slotService.ensureSlotsExist()

// Force cleanup
await slotService.cleanupOldSlots()

// Full reinitialization
await slotService.initialize()
```

## Migration Notes

### Changes from Previous System
- **Before**: 15-day rolling window
- **After**: 30-day rolling window (today plus 29 days)
- **Cleanup**: Daily instead of weekly
- **Storage**: Moderately increased but still efficient

### Backward Compatibility
- Today's and future booked slots preserved; previous-day appointments and slots are removed
- API endpoints unchanged
- Frontend compatibility maintained
- Database schema unchanged

## Future Enhancements

### Possible Improvements
- Dynamic slot duration based on appointment type
- Holiday schedule integration
- Multiple doctor support
- Clinic-specific time slot customization
- Real-time slot availability updates

### Monitoring Dashboard
Consider adding:
- Slot utilization metrics
- Booking patterns analysis
- Clinic performance comparison
- Automated alerts for issues
