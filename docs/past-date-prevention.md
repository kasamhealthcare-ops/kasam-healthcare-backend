# Past Date Prevention & Cleanup System

## Overview

This document describes the comprehensive past date prevention and cleanup system implemented in the Kasam Healthcare application. The system prevents patients from booking appointments for past dates and automatically cleans up past appointments daily.

## Features

### 1. Past Date Booking Prevention

#### Frontend Prevention
- **Date Picker Restrictions**: The appointment booking form uses dynamic date restrictions
  - `min`: Today's date (prevents past date selection)
  - `max`: One year from today (prevents excessive future bookings)
- **File**: `kasam-healthcare-react/src/pages/Contact.jsx`

#### Backend API Validation
- **Slots API**: Blocks requests for past dates
  - Returns 400 error for past date requests
  - Message: "Cannot view slots for past dates. Please select today or a future date."
- **File**: `kasam-healthcare-backend/routes/slots.js`

#### Database Validation
- **Appointment Model**: Validates appointment dates during creation
  - Prevents past dates: "Appointment date cannot be in the past"
  - Limits future dates: "Appointment date cannot be more than 1 year in advance"
- **File**: `kasam-healthcare-backend/middleware/validation.js`

### 2. Automated Past Appointment Cleanup

#### Daily Cleanup Process
- **Schedule**: Runs daily at 2:00 AM IST
- **Process**:
  1. Finds all appointments with dates before today
  2. Frees up associated booked slots
  3. Deletes past appointments from database
  4. Logs cleanup statistics

#### Cleanup Service
- **Location**: `kasam-healthcare-backend/services/slotService.js`
- **Method**: `cleanupPastAppointments()`
- **Cron Schedule**: `'0 2 * * *'` (2:00 AM daily)

## Implementation Details

### Date Validation Logic

```javascript
// Frontend - Dynamic date restrictions
min={new Date().toISOString().split('T')[0]}
max={new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]}

// Backend - Appointment validation
const appointmentDate = new Date(value)
const today = new Date()

appointmentDate.setHours(0, 0, 0, 0)
today.setHours(0, 0, 0, 0)

if (appointmentDate < today) {
  throw new Error('Appointment date cannot be in the past')
}
```

### Cleanup Process

```javascript
// Find past appointments
const pastAppointments = await Appointment.find({
  appointmentDate: { $lt: today }
})

// For each appointment:
// 1. Free associated slot
// 2. Delete appointment
// 3. Log results
```

## Automated Scheduling

The system runs three automated processes daily:

1. **12:01 AM**: Daily slot refresh (maintains 7-day rolling window)
2. **1:00 AM**: Old slot cleanup (removes unbooked slots older than 3 days)
3. **2:00 AM**: Past appointment cleanup (removes past appointments)

## Testing Scripts

### Available Test Scripts

1. **`scripts/testPastDatePrevention.js`**
   - Comprehensive testing of all prevention mechanisms
   - Tests database, API, and frontend validations
   - Includes cleanup functionality testing

2. **`scripts/cleanupPastAppointments.js`**
   - Manual cleanup script for past appointments
   - Detailed logging and error handling
   - Verification of cleanup results

3. **`scripts/testPastDateValidation.js`**
   - Focused testing of date validation logic
   - Tests various date scenarios
   - Validates error messages

### Running Tests

```bash
# Test comprehensive past date prevention
node scripts/testPastDatePrevention.js

# Manual cleanup of past appointments
node scripts/cleanupPastAppointments.js

# Test date validation logic
node scripts/testPastDateValidation.js
```

## Error Messages

### User-Friendly Messages

- **Frontend**: Date picker prevents selection (no error needed)
- **API**: "Cannot view slots for past dates. Please select today or a future date."
- **Validation**: "Appointment date cannot be in the past. Please select today or a future date."

### System Messages

- **Cleanup Success**: "Successfully cleaned up X past appointments"
- **Cleanup Info**: "Freed up X associated slots"
- **No Cleanup Needed**: "No past appointments to clean up"

## Benefits

1. **User Experience**: Prevents confusion by blocking invalid date selections
2. **Data Integrity**: Maintains clean appointment data
3. **System Performance**: Reduces database size by removing old appointments
4. **Automated Maintenance**: No manual intervention required
5. **Comprehensive Coverage**: Multiple layers of validation

## Monitoring

### Logs to Monitor

- Daily cleanup statistics (2:00 AM IST)
- Validation error patterns
- API request patterns for past dates

### Key Metrics

- Number of past appointments cleaned daily
- Number of slots freed during cleanup
- Validation error frequency

## Configuration

### Timezone
- All cron jobs use `Asia/Kolkata` timezone
- Date comparisons use local server time

### Cleanup Retention
- Appointments: Cleaned immediately after date passes
- Slots: Unbooked slots cleaned after 3 days
- Booked slots: Preserved until appointment cleanup

## Troubleshooting

### Common Issues

1. **Timezone Mismatches**: Ensure server timezone is correctly configured
2. **Cleanup Not Running**: Check cron job status and logs
3. **Validation Bypassed**: Verify all validation layers are active

### Debug Commands

```bash
# Check current appointments
db.appointments.find({appointmentDate: {$lt: new Date()}})

# Check cleanup logs
grep "cleanup" logs/application.log

# Test validation manually
node scripts/testPastDateValidation.js
```
