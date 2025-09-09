# 7-Day Rolling Slot Management System

## Overview

The healthcare application now uses a **7-day rolling window** for appointment slot management. This system automatically maintains exactly 7 days of future appointment slots at all times, with daily refresh and cleanup operations.

## Key Features

### 🔄 Daily Refresh
- **Schedule**: Every day at 12:01 AM IST
- **Function**: Ensures slots exist for the next 7 days
- **Behavior**: Creates missing slots, maintains rolling window

### 🗑️ Daily Cleanup
- **Schedule**: Every day at 1:00 AM IST
- **Function**: Removes old unbooked slots (older than 3 days)
- **Behavior**: Preserves all booked slots regardless of age

### 📅 Slot Distribution
- **Monday & Thursday**: Ghodasar Clinic
- **Tuesday & Friday**: Jasodanagar Clinic
- **Wednesday & Saturday**: Paldi Clinic (Ellis Bridge)
- **Sunday**: No slots (clinic closed)

## How It Works

### Initialization
When the server starts:
1. Connects to MongoDB
2. Ensures slots exist for next 7 days
3. Starts automated cron jobs
4. Logs initialization status

### Daily Operations

#### 12:01 AM IST - Daily Refresh
```javascript
// Maintains 7-day rolling window
await slotService.ensureSlotsExist(7)
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
- **Consistent Availability**: Always 7 days of bookable slots
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
npm run test-7day-slots
```
- Tests initialization
- Verifies 7-day window
- Checks slot distribution
- Validates cleanup

#### 2. Manual Refresh
```bash
npm run trigger-daily-refresh
```
- Simulates daily cron job
- Shows before/after state
- Validates 7-day maintenance

### Manual Testing
```javascript
// Check current slots
const slots = await Slot.countDocuments()

// Check 7-day window
const futureSlots = await Slot.countDocuments({
  date: {
    $gte: new Date(),
    $lt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }
})
```

## Configuration

### Time Slots by Clinic

#### Ghodasar Clinic (Monday & Thursday)
- Morning: 9:00 AM - 12:00 PM (30-min slots)
- Evening: 6:00 PM - 9:00 PM (30-min slots)

#### Jasodanagar Clinic (Tuesday & Friday)
- Morning: 9:00 AM - 12:00 PM (30-min slots)
- Evening: 6:00 PM - 9:00 PM (30-min slots)

#### Paldi Clinic (Wednesday & Saturday)
- Morning: 9:00 AM - 12:00 PM (30-min slots)
- Evening: 6:00 PM - 9:00 PM (30-min slots)

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
- `✅ Daily 7-day slot refresh completed`
- `🗑️ Cleaned up X old unbooked slots`
- `📅 Maintaining slots for next 7 days`

### Health Checks
Monitor these metrics:
- Total slots in database
- Slots for next 7 days
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
- Check 7-day generation logic
- Verify clinic schedules

### Manual Recovery
```javascript
// Emergency slot generation
await slotService.ensureSlotsExist(7)

// Force cleanup
await slotService.cleanupOldSlots()

// Full reinitialization
await slotService.initialize()
```

## Migration Notes

### Changes from Previous System
- **Before**: 30-day ahead generation
- **After**: 7-day rolling window
- **Cleanup**: Daily instead of weekly
- **Storage**: Significantly reduced

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
