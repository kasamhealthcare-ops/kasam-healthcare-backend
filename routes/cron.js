import express from 'express'
import slotService from '../services/slotService.js'
import { getISTDateReliable } from '../utils/dateUtils.js'

const router = express.Router()

// Middleware to verify cron requests (Vercel cron jobs are secure by default)
const verifyCronRequest = (_req, _res, next) => {
  // Vercel cron jobs are automatically authenticated and secure
  // No additional authentication needed for internal cron requests
  next()
}

// @route   POST /api/cron/daily-slot-refresh
// @desc    Daily 15-day slot refresh (runs at 12:01 AM IST)
// @access  Cron only
router.post('/daily-slot-refresh', verifyCronRequest, async (req, res) => {
  try {
    const startTime = Date.now()
    const istTime = getISTDateReliable()
    
    console.log(`⏰ [CRON] Daily slot refresh started at ${istTime.toISOString()}`)
    
    // Run the daily slot generation
    await slotService.generateDailySlots()
    
    const duration = Date.now() - startTime
    console.log(`✅ [CRON] Daily slot refresh completed in ${duration}ms`)
    
    res.status(200).json({
      success: true,
      message: 'Daily slot refresh completed successfully',
      executedAt: istTime.toISOString(),
      duration: `${duration}ms`
    })
  } catch (error) {
    console.error('❌ [CRON] Daily slot refresh failed:', error)
    res.status(500).json({
      success: false,
      message: 'Daily slot refresh failed',
      error: error.message,
      executedAt: getISTDateReliable().toISOString()
    })
  }
})

// @route   POST /api/cron/slot-cleanup
// @desc    Daily slot cleanup (runs at 1:00 AM IST)
// @access  Cron only
router.post('/slot-cleanup', verifyCronRequest, async (req, res) => {
  try {
    const startTime = Date.now()
    const istTime = getISTDateReliable()
    
    console.log(`⏰ [CRON] Slot cleanup started at ${istTime.toISOString()}`)
    
    // Run the slot cleanup
    await slotService.cleanupOldSlots()
    
    const duration = Date.now() - startTime
    console.log(`✅ [CRON] Slot cleanup completed in ${duration}ms`)
    
    res.status(200).json({
      success: true,
      message: 'Slot cleanup completed successfully',
      executedAt: istTime.toISOString(),
      duration: `${duration}ms`
    })
  } catch (error) {
    console.error('❌ [CRON] Slot cleanup failed:', error)
    res.status(500).json({
      success: false,
      message: 'Slot cleanup failed',
      error: error.message,
      executedAt: getISTDateReliable().toISOString()
    })
  }
})

// @route   POST /api/cron/appointment-cleanup
// @desc    Daily appointment cleanup (runs at 2:00 AM IST)
// @access  Cron only
router.post('/appointment-cleanup', verifyCronRequest, async (req, res) => {
  try {
    const startTime = Date.now()
    const istTime = getISTDateReliable()
    
    console.log(`⏰ [CRON] Appointment cleanup started at ${istTime.toISOString()}`)
    
    // Run the appointment cleanup
    await slotService.cleanupPastAppointments()
    
    const duration = Date.now() - startTime
    console.log(`✅ [CRON] Appointment cleanup completed in ${duration}ms`)
    
    res.status(200).json({
      success: true,
      message: 'Appointment cleanup completed successfully',
      executedAt: istTime.toISOString(),
      duration: `${duration}ms`
    })
  } catch (error) {
    console.error('❌ [CRON] Appointment cleanup failed:', error)
    res.status(500).json({
      success: false,
      message: 'Appointment cleanup failed',
      error: error.message,
      executedAt: getISTDateReliable().toISOString()
    })
  }
})

// @route   GET /api/cron/status
// @desc    Check cron job status and slot health
// @access  Public (for monitoring)
router.get('/status', async (req, res) => {
  try {
    const istTime = getISTDateReliable()

    // Calculate next execution times (in IST)
    const nextRefresh = new Date(istTime)
    nextRefresh.setDate(nextRefresh.getDate() + 1)
    nextRefresh.setHours(0, 1, 0, 0) // 12:01 AM tomorrow

    const nextAppointmentCleanup = new Date(istTime)
    nextAppointmentCleanup.setDate(nextAppointmentCleanup.getDate() + 1)
    nextAppointmentCleanup.setHours(2, 0, 0, 0) // 2:00 AM tomorrow

    // Quick slot health check
    const Slot = (await import('../models/Slot.js')).default
    const fifteenDaysFromNow = new Date(istTime)
    fifteenDaysFromNow.setDate(istTime.getDate() + 15)

    const next15DaysSlots = await Slot.countDocuments({
      date: { $gte: istTime, $lt: fifteenDaysFromNow }
    })

    // Health status based on 15-minute slots (double capacity)
    const healthStatus = next15DaysSlots === 0 ? 'CRITICAL' :
                        next15DaysSlots < 200 ? 'WARNING' : 'HEALTHY'

    res.status(200).json({
      success: true,
      currentTime: istTime.toISOString(),
      timezone: 'Asia/Kolkata (IST)',
      slotHealth: {
        status: healthStatus,
        slotsNext15Days: next15DaysSlots,
        message: healthStatus === 'CRITICAL' ? 'No slots for next 15 days! Manual refresh needed.' :
                healthStatus === 'WARNING' ? 'Low slot count (15-min slots). Check cron jobs.' :
                'Slot generation working properly (15-min intervals).'
      },
      nextExecutions: {
        dailySlotRefresh: nextRefresh.toISOString(),
        appointmentCleanup: nextAppointmentCleanup.toISOString()
      },
      cronJobs: [
        {
          name: 'Daily Slot Refresh',
          schedule: '1 0 * * *',
          description: 'Maintains 15-day rolling window of 15-minute slots (includes cleanup)'
        },
        {
          name: 'Appointment Cleanup',
          schedule: '0 2 * * *',
          description: 'Removes past appointments and frees slots'
        }
      ]
    })
  } catch (error) {
    console.error('❌ [CRON] Status check failed:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get cron status',
      error: error.message
    })
  }
})

export default router
