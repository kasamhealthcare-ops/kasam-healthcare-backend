import mongoose from 'mongoose'
import dotenv from 'dotenv'
import slotService from '../services/slotService.js'
import Slot from '../models/Slot.js'
import { getISTCalendarDay, SLOT_WINDOW_DAYS } from '../utils/dateUtils.js'

// Load environment variables
dotenv.config()

const triggerDailyRefresh = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    console.log(`🔄 Manually triggering daily ${SLOT_WINDOW_DAYS}-day slot refresh...\n`)

    // Show current state
    const today = getISTCalendarDay()
    const windowEnd = new Date(today)
    windowEnd.setUTCDate(today.getUTCDate() + SLOT_WINDOW_DAYS)

    console.log('📊 Before refresh:')
    const beforeTotal = await Slot.countDocuments()
    const beforeFuture = await Slot.countDocuments({
      date: { $gte: today, $lt: windowEnd }
    })
    console.log(`   Total slots: ${beforeTotal}`)
    console.log(`   Next ${SLOT_WINDOW_DAYS} days: ${beforeFuture}`)

    // Trigger the daily refresh
    console.log('\n⏰ Running daily slot refresh (simulating 12:01 AM cron job)...')
    await slotService.generateDailySlots()

    // Show state after refresh
    console.log('\n📊 After refresh:')
    const afterTotal = await Slot.countDocuments()
    const afterFuture = await Slot.countDocuments({
      date: { $gte: today, $lt: windowEnd }
    })
    console.log(`   Total slots: ${afterTotal}`)
    console.log(`   Next ${SLOT_WINDOW_DAYS} days: ${afterFuture}`)

    console.log(`\n📅 Detailed ${SLOT_WINDOW_DAYS}-day breakdown:`)
    for (let i = 0; i < SLOT_WINDOW_DAYS; i++) {
      const checkDate = new Date(today)
      checkDate.setUTCDate(today.getUTCDate() + i)
      const nextDay = new Date(checkDate)
      nextDay.setUTCDate(checkDate.getUTCDate() + 1)
      
      const daySlots = await Slot.countDocuments({
        date: {
          $gte: checkDate,
          $lt: nextDay
        }
      })
      
      const availableSlots = await Slot.countDocuments({
        date: {
          $gte: checkDate,
          $lt: nextDay
        },
        isAvailable: true,
        isBooked: false
      })
      
      const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
      const isToday = i === 0 ? ' (Today)' : ''
      console.log(`   ${dayName}${isToday} ${checkDate.toISOString().slice(0, 10)}: ${daySlots} total, ${availableSlots} available`)
    }

    const beyondWindow = await Slot.countDocuments({
      date: { $gte: windowEnd },
      isBooked: false
    })

    if (beyondWindow > 0) {
      console.log(`\n⚠️  Warning: Found ${beyondWindow} unbooked slots beyond ${SLOT_WINDOW_DAYS} days`)
    } else {
      console.log(`\n✅ No unbooked slots beyond ${SLOT_WINDOW_DAYS} days`)
    }

    // Check for old slots
    const oldSlots = await Slot.countDocuments({
      date: { $lt: today }
    })
    
    if (oldSlots > 0) {
      console.log(`⚠️  Found ${oldSlots} previous-day slots - cleanup may be needed`)
    } else {
      console.log('✅ No previous-day slots found')
    }

    console.log('\n🎉 Daily refresh simulation completed!')
    console.log('\n📋 Next scheduled runs:')
    console.log(`   🕐 Daily refresh: 12:01 AM IST (maintains ${SLOT_WINDOW_DAYS}-day window)`)
    console.log('   🗑️  Daily cleanup: 1:00 AM IST (removes previous-day appointments and slots)')

  } catch (error) {
    console.error('❌ Daily refresh failed:', error)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
    console.log('\n🔌 Disconnected from MongoDB')
  }
}

triggerDailyRefresh()
