import express from 'express'
import slotService from '../services/slotService.js'
import { getISTCalendarDay, SLOT_WINDOW_DAYS } from '../utils/dateUtils.js'

const router = express.Router()

const nextExecution = (now, hour, minute) => {
  const next = new Date(now)
  next.setUTCHours(hour, minute, 0, 0)
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1)
  return next.toISOString()
}

// @route   GET/POST /api/cron/daily-slot-refresh
// @desc    Daily 30-day slot refresh (runs at 12:01 AM IST)
// @access  Public
router.route('/daily-slot-refresh').get(dailySlotRefresh).post(dailySlotRefresh)
async function dailySlotRefresh(req, res) {
  try {
    const startTime = Date.now()
    const istTime = new Date()
    
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
      executedAt: new Date().toISOString()
    })
  }
}

// @route   GET/POST /api/cron/slot-cleanup
// @desc    Daily slot cleanup (runs at 1:00 AM IST)
// @access  Public
router.route('/slot-cleanup').get(slotCleanup).post(slotCleanup)
async function slotCleanup(req, res) {
  try {
    const startTime = Date.now()
    const istTime = new Date()
    
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
      executedAt: new Date().toISOString()
    })
  }
}

// @route   GET/POST /api/cron/appointment-cleanup
// @desc    Daily appointment cleanup (runs at 2:00 AM IST)
// @access  Public
router.route('/appointment-cleanup').get(appointmentCleanup).post(appointmentCleanup)
async function appointmentCleanup(req, res) {
  try {
    const startTime = Date.now()
    const istTime = new Date()
    
    console.log(`⏰ [CRON] Appointment cleanup started at ${istTime.toISOString()}`)
    
    // Run the appointment cleanup
    await slotService.cleanupOldSlots()
    
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
      executedAt: new Date().toISOString()
    })
  }
}

// @route   GET /api/cron/status
// @desc    Check cron job status and slot health
// @access  Public (for monitoring)
router.get('/status', async (req, res) => {
  try {
    const istTime = new Date()
    const today = getISTCalendarDay(istTime)

    // Quick slot health check
    const Slot = (await import('../models/Slot.js')).default
    const windowEnd = new Date(today)
    windowEnd.setUTCDate(today.getUTCDate() + SLOT_WINDOW_DAYS)

    const days = await Slot.aggregate([
      { $match: { date: { $gte: today, $lt: windowEnd } } },
      { $group: { _id: '$date', count: { $sum: 1 } } }
    ])
    const slotCount = days.reduce((total, day) => total + day.count, 0)
    const missingDates = []
    for (let i = 0; i < SLOT_WINDOW_DAYS; i++) {
      const date = new Date(today)
      date.setUTCDate(today.getUTCDate() + i)
      if (!days.some(day => day._id.getTime() === date.getTime())) {
        missingDates.push(date.toISOString().slice(0, 10))
      }
    }

    const healthStatus = slotCount === 0 ? 'CRITICAL' :
                        missingDates.length > 0 ? 'WARNING' : 'HEALTHY'

    res.status(200).json({
      success: true,
      currentTime: istTime.toISOString(),
      timezone: 'Asia/Kolkata (IST)',
      slotHealth: {
        status: healthStatus,
        windowDays: SLOT_WINDOW_DAYS,
        slotsNext30Days: slotCount,
        missingDates,
        message: healthStatus === 'CRITICAL' ? 'No slots for next 30 days! Manual refresh needed.' :
                healthStatus === 'WARNING' ? 'Missing dates in the 30-day window. Check cron jobs.' :
                'Slots exist for all 30 days. This does not verify cron execution.'
      },
      nextExecutions: {
        dailySlotRefresh: nextExecution(istTime, 18, 31),
        slotCleanup: nextExecution(istTime, 19, 30),
        appointmentCleanup: nextExecution(istTime, 20, 30)
      },
      cronJobs: [
        {
          name: 'Daily Slot Refresh',
          schedule: '31 18 * * *',
          description: 'Maintains 30-day rolling window of 15-minute slots (includes cleanup)'
        },
        {
          name: 'Slot Cleanup',
          schedule: '30 19 * * *',
          description: 'Removes previous IST days appointments and slots'
        },
        {
          name: 'Appointment Cleanup',
          schedule: '30 20 * * *',
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
