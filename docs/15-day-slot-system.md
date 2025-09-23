# 15-Day Rolling Slot Management System

## Overview

The healthcare application now uses a **15-day rolling window** for appointment slot management. This system automatically maintains exactly 15 days of future appointment slots at all times, with daily refresh and cleanup operations.

## Key Features

### 🔄 Daily Refresh
- **Schedule**: Every day at 12:01 AM IST
- **Function**: Ensures slots exist for the next 15 days
- **Behavior**: Creates missing slots, maintains rolling window

### 🗑️ Daily Cleanup
- **Schedule**: Every day at 1:00 AM IST
- **Function**: Removes old unbooked slots (older than 3 days)
- **Behavior**: Preserves all booked slots regardless of age

### 📅 Slot Distribution (15-minute intervals)
- **Monday-Saturday**: Ghodasar Clinic (30 slots/day) + Vastral Clinic (12 slots/day)
- **Sunday**: Gandhinagar Clinic only (20 slots/day)
- **Slot Duration**: 15 minutes per slot (doubled capacity from previous 30-minute slots)

## How It Works

### Initialization
When the server starts:
1. Connects to MongoDB
2. Ensures slots exist for next 15 days
3. Starts automated cron jobs
4. Logs initialization status

### Daily Operations

#### 12:01 AM IST - Daily Refresh
```javascript
// Maintains 15-day rolling window
await slotService.ensureSlotsExist(15)
await slotService.cleanupOldSlots()
```

#### 1:00 AM IST - Cleanup
```javascript
// Removes unbooked slots older than 3 days
await Slot.deleteMany({
  date: { $lt: cutoffDate },
  isBooked: false
})
```

## Benefits

### ✅ Advantages
- **Efficient Storage**: Only maintains necessary slots
- **Automatic Management**: No manual intervention required
- **Consistent Availability**: Always 15 days of bookable slots
- **Clean Database**: Regular cleanup prevents bloat
- **Preserves History**: Keeps all booked appointments

### 📊 Performance
- Reduced database size
- Faster queries (smaller dataset)
- Efficient indexing
- Minimal storage overhead

## Testing

### Test Scripts Available

#### 1. Comprehensive Test
```bash
npm run test-15day-slots
```
- Tests initialization
- Verifies 15-day window
- Checks slot distribution
- Validates cleanup

#### 2. Manual Refresh
```bash
npm run trigger-daily-refresh
```
- Simulates daily cron job
- Shows before/after state
- Validates 15-day maintenance

### Manual Testing
```javascript
// Check current slots
const slots = await Slot.countDocuments()

// Check 15-day window
const futureSlots = await Slot.countDocuments({
  date: {
    $gte: new Date(),
    $lt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
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
```javascript
// Daily refresh at 12:01 AM IST
cron.schedule('1 0 * * *', generateDailySlots, {
  timezone: 'Asia/Kolkata'
})

// Daily cleanup at 1:00 AM IST
cron.schedule('0 1 * * *', cleanupOldSlots, {
  timezone: 'Asia/Kolkata'
})
```

## Monitoring

### Log Messages
- `🔄 Daily slot refresh started`
- `✅ Daily 15-day slot refresh completed`
- `🗑️ Cleaned up X old unbooked slots`
- `📅 Maintaining slots for next 15 days`

### Health Checks
Monitor these metrics:
- Total slots in database
- Slots for next 15 days
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
- Check 15-day generation logic
- Verify clinic schedules

### Manual Recovery
```javascript
// Emergency slot generation
await slotService.ensureSlotsExist(15)

// Force cleanup
await slotService.cleanupOldSlots()

// Full reinitialization
await slotService.initialize()
```

## Migration Notes

### Changes from Previous System
- **Before**: 7-day rolling window
- **After**: 15-day rolling window
- **Cleanup**: Daily instead of weekly
- **Storage**: Moderately increased but still efficient

### Backward Compatibility
- All existing booked slots preserved
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
