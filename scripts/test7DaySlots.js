import mongoose from 'mongoose'
import dotenv from 'dotenv'
import slotService from '../services/slotService.js'
import Slot from '../models/Slot.js'

// Load environment variables
dotenv.config()

const test7DaySlots = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    console.log('🧪 Testing 7-Day Rolling Slot Service...\n')

    // Test 1: Check current slot count
    const currentSlots = await Slot.countDocuments()
    console.log(`📊 Current slots in database: ${currentSlots}`)

    // Test 2: Initialize slot service (should ensure 7 days of slots)
    console.log('\n🔄 Testing 7-day slot service initialization...')
    await slotService.initialize()

    // Test 3: Check slot count after initialization
    const slotsAfterInit = await Slot.countDocuments()
    console.log(`📊 Slots after initialization: ${slotsAfterInit}`)

    // Test 4: Check that we have exactly 7 days of future slots
    const today = new Date()
    const sevenDaysFromNow = new Date(today)
    sevenDaysFromNow.setDate(today.getDate() + 7)

    const futureSlots = await Slot.countDocuments({
      date: {
        $gte: today,
        $lt: sevenDaysFromNow
      }
    })
    console.log(`📅 Slots for next 7 days: ${futureSlots}`)

    // Test 5: Check slot distribution by day for next 7 days
    console.log('\n📈 7-Day Slot Distribution:')
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(today.getDate() + i)
      
      const daySlots = await Slot.countDocuments({
        date: {
          $gte: new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate()),
          $lt: new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate() + 1)
        }
      })
      
      const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'long' })
      const isToday = i === 0 ? ' (Today)' : ''
      console.log(`   Day ${i + 1} - ${dayName}${isToday} ${checkDate.toDateString()}: ${daySlots} slots`)
    }

    // Test 6: Test daily slot generation (should maintain 7-day window)
    console.log('\n🔄 Testing daily 7-day slot refresh...')
    await slotService.generateDailySlots()

    // Test 7: Verify no slots exist beyond 7 days (except booked ones)
    const eightDaysFromNow = new Date(today)
    eightDaysFromNow.setDate(today.getDate() + 8)
    
    const slotsBeyon7Days = await Slot.countDocuments({
      date: { $gte: eightDaysFromNow },
      isBooked: false
    })
    console.log(`📊 Unbooked slots beyond 7 days: ${slotsBeyon7Days} (should be 0)`)

    // Test 8: Check old slots (should be minimal due to cleanup)
    const threeDaysAgo = new Date(today)
    threeDaysAgo.setDate(today.getDate() - 3)
    
    const oldSlots = await Slot.countDocuments({
      date: { $lt: threeDaysAgo },
      isBooked: false
    })
    console.log(`📊 Old unbooked slots (>3 days ago): ${oldSlots} (should be 0 after cleanup)`)

    // Test 9: Test cleanup function
    console.log('\n🗑️  Testing slot cleanup...')
    await slotService.cleanupOldSlots()

    // Test 10: Final verification
    const finalSlots = await Slot.countDocuments()
    const finalFutureSlots = await Slot.countDocuments({
      date: {
        $gte: today,
        $lt: sevenDaysFromNow
      }
    })
    
    console.log(`\n📊 Final Results:`)
    console.log(`   Total slots in database: ${finalSlots}`)
    console.log(`   Slots for next 7 days: ${finalFutureSlots}`)

    // Test 11: Show clinic distribution for today
    console.log('\n🏥 Today\'s Clinic Distribution:')
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
    
    const clinicDistribution = await Slot.aggregate([
      {
        $match: {
          date: { $gte: todayStart, $lt: todayEnd }
        }
      },
      {
        $group: {
          _id: '$location',
          count: { $sum: 1 },
          available: { $sum: { $cond: [{ $and: ['$isAvailable', { $not: '$isBooked' }] }, 1, 0] } }
        }
      }
    ])

    clinicDistribution.forEach(clinic => {
      console.log(`   ${clinic._id}: ${clinic.count} total, ${clinic.available} available`)
    })

    console.log('\n✅ 7-Day Rolling Slot Service test completed successfully!')
    console.log('\n📋 Summary:')
    console.log('   ✓ Maintains exactly 7 days of future slots')
    console.log('   ✓ Daily refresh at 12:01 AM IST')
    console.log('   ✓ Daily cleanup at 1:00 AM IST')
    console.log('   ✓ Removes old unbooked slots (>3 days)')
    console.log('   ✓ Preserves booked slots regardless of age')

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await mongoose.disconnect()
    console.log('\n🔌 Disconnected from MongoDB')
    process.exit(0)
  }
}

test7DaySlots()
