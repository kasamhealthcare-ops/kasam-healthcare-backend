import mongoose from 'mongoose'
import dotenv from 'dotenv'
import slotService from '../services/slotService.js'
import Slot from '../models/Slot.js'

// Load environment variables
dotenv.config()

const triggerDailyRefresh = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    console.log('🔄 Manually triggering daily 15-day slot refresh...\n')

    // Show current state
    const today = new Date()
    const fifteenDaysFromNow = new Date(today)
    fifteenDaysFromNow.setDate(today.getDate() + 15)

    console.log('📊 Before refresh:')
    const beforeTotal = await Slot.countDocuments()
    const beforeFuture = await Slot.countDocuments({
      date: { $gte: today, $lt: fifteenDaysFromNow }
    })
    console.log(`   Total slots: ${beforeTotal}`)
    console.log(`   Next 15 days: ${beforeFuture}`)

    // Trigger the daily refresh
    console.log('\n⏰ Running daily slot refresh (simulating 12:01 AM cron job)...')
    await slotService.generateDailySlots()

    // Show state after refresh
    console.log('\n📊 After refresh:')
    const afterTotal = await Slot.countDocuments()
    const afterFuture = await Slot.countDocuments({
      date: { $gte: today, $lt: fifteenDaysFromNow }
    })
    console.log(`   Total slots: ${afterTotal}`)
    console.log(`   Next 15 days: ${afterFuture}`)

    // Show detailed breakdown for next 15 days
    console.log('\n📅 Detailed 15-day breakdown:')
    for (let i = 0; i < 15; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(today.getDate() + i)
      
      const daySlots = await Slot.countDocuments({
        date: {
          $gte: new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate()),
          $lt: new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate() + 1)
        }
      })
      
      const availableSlots = await Slot.countDocuments({
        date: {
          $gte: new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate()),
          $lt: new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate() + 1)
        },
        isAvailable: true,
        isBooked: false
      })
      
      const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'short' })
      const isToday = i === 0 ? ' (Today)' : ''
      console.log(`   ${dayName}${isToday} ${checkDate.toDateString()}: ${daySlots} total, ${availableSlots} available`)
    }

    // Check for any slots beyond 15 days
    const beyondFifteenDays = await Slot.countDocuments({
      date: { $gte: fifteenDaysFromNow },
      isBooked: false
    })

    if (beyondFifteenDays > 0) {
      console.log(`\n⚠️  Warning: Found ${beyondFifteenDays} unbooked slots beyond 15 days`)
    } else {
      console.log('\n✅ Perfect! No unbooked slots beyond 15 days')
    }

    // Check for old slots
    const threeDaysAgo = new Date(today)
    threeDaysAgo.setDate(today.getDate() - 3)
    
    const oldSlots = await Slot.countDocuments({
      date: { $lt: threeDaysAgo },
      isBooked: false
    })
    
    if (oldSlots > 0) {
      console.log(`⚠️  Found ${oldSlots} old unbooked slots (>3 days ago) - cleanup may be needed`)
    } else {
      console.log('✅ No old unbooked slots found - cleanup is working properly')
    }

    console.log('\n🎉 Daily refresh simulation completed!')
    console.log('\n📋 Next scheduled runs:')
    console.log('   🕐 Daily refresh: 12:01 AM IST (maintains 15-day window)')
    console.log('   🗑️  Daily cleanup: 1:00 AM IST (removes old unbooked slots)')

  } catch (error) {
    console.error('❌ Daily refresh failed:', error)
  } finally {
    await mongoose.disconnect()
    console.log('\n🔌 Disconnected from MongoDB')
    process.exit(0)
  }
}

triggerDailyRefresh()
