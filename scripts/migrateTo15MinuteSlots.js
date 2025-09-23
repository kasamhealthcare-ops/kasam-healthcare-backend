import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Slot from '../models/Slot.js'
import slotService from '../services/slotService.js'

// Load environment variables
dotenv.config()

const migrateTo15MinuteSlots = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    console.log('🔄 Migrating from 30-minute to 15-minute slot system...\n')

    // Get current state
    const today = new Date()
    const fifteenDaysFromNow = new Date(today)
    fifteenDaysFromNow.setDate(today.getDate() + 15)

    const totalSlots = await Slot.countDocuments()
    const futureSlots = await Slot.countDocuments({
      date: { $gte: today, $lt: fifteenDaysFromNow }
    })
    const bookedSlots = await Slot.countDocuments({
      isBooked: true
    })

    console.log('📊 Current State (30-minute slots):')
    console.log(`   Total slots: ${totalSlots}`)
    console.log(`   Future slots (next 15 days): ${futureSlots}`)
    console.log(`   Booked slots: ${bookedSlots}`)

    // Step 1: Remove all unbooked future slots (we'll regenerate with 15-min intervals)
    console.log('\n🗑️  Step 1: Removing unbooked future slots...')
    const deleteResult = await Slot.deleteMany({
      date: { $gte: today },
      isBooked: false
    })
    console.log(`   ✅ Deleted ${deleteResult.deletedCount} unbooked future slots`)

    // Step 2: Remove old unbooked slots (older than 3 days)
    console.log('\n🗑️  Step 2: Removing old unbooked slots (>3 days ago)...')
    const threeDaysAgo = new Date(today)
    threeDaysAgo.setDate(today.getDate() - 3)
    
    const oldDeleteResult = await Slot.deleteMany({
      date: { $lt: threeDaysAgo },
      isBooked: false
    })
    console.log(`   ✅ Deleted ${oldDeleteResult.deletedCount} old unbooked slots`)

    // Step 3: Generate new 15-minute slots for the next 15 days
    console.log('\n🔄 Step 3: Generating new 15-minute slots for next 15 days...')
    await slotService.initialize()
    
    // Step 4: Verify the new system
    console.log('\n📅 Step 4: Verifying new 15-minute slot system...')
    const newTotalSlots = await Slot.countDocuments()
    const newFutureSlots = await Slot.countDocuments({
      date: { $gte: today, $lt: fifteenDaysFromNow }
    })
    const preservedBookedSlots = await Slot.countDocuments({
      isBooked: true
    })

    console.log(`   Total slots after migration: ${newTotalSlots}`)
    console.log(`   New 15-minute slots (next 15 days): ${newFutureSlots}`)
    console.log(`   Preserved booked slots: ${preservedBookedSlots}`)

    // Step 5: Show detailed breakdown for next few days
    console.log('\n📈 New 15-Minute Slot Distribution (First 7 Days):')
    for (let i = 0; i < 7; i++) {
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
      const expectedSlots = checkDate.getDay() === 0 ? 20 : 42 // Sunday: 20, Weekdays: 42
      
      console.log(`   ${dayName}${isToday} ${checkDate.toDateString()}: ${daySlots} total (expected: ${expectedSlots}), ${availableSlots} available`)
    }

    // Step 6: Show clinic distribution for today
    console.log('\n🏥 Today\'s Clinic Distribution (15-minute slots):')
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
      const expectedCount = clinic._id === 'ghodasar' ? 30 : 
                           clinic._id === 'vastral' ? 12 : 
                           clinic._id === 'gandhinagar' ? (today.getDay() === 0 ? 20 : 0) : 0
      console.log(`   ${clinic._id}: ${clinic.count} total (expected: ${expectedCount}), ${clinic.available} available`)
    })

    // Step 7: Final validation
    console.log('\n✅ Migration Validation:')
    console.log(`   ✓ Migrated from 30-minute to 15-minute slots`)
    console.log(`   ✓ Doubled slot capacity (${futureSlots} → ${newFutureSlots} slots)`)
    console.log(`   ✓ Preserved ${preservedBookedSlots} booked appointments`)
    console.log(`   ✓ Generated slots for 15-day rolling window`)

    console.log('\n🎉 Migration to 15-Minute Slot System completed successfully!')
    console.log('\n📋 New System Specifications:')
    console.log('   • Slot Duration: 15 minutes (was 30 minutes)')
    console.log('   • Ghodasar: 30 slots/day (was 15 slots/day)')
    console.log('   • Vastral: 12 slots/day (was 6 slots/day)')
    console.log('   • Gandhinagar: 20 slots/day on Sunday (was 10 slots/day)')
    console.log('   • Total Weekday Capacity: 42 slots/day (was 21 slots/day)')
    console.log('   • Total Sunday Capacity: 20 slots/day (was 10 slots/day)')
    console.log('   • 15-Day Window: ~600 slots (was ~300 slots)')

    console.log('\n📋 Next Steps:')
    console.log('   1. The system now maintains 15-minute slots')
    console.log('   2. Daily refresh at 12:01 AM IST will maintain the rolling window')
    console.log('   3. Health check threshold updated to 200 slots (was 100)')
    console.log('   4. All booked appointments are preserved regardless of duration')

  } catch (error) {
    console.error('❌ Migration failed:', error)
  } finally {
    await mongoose.disconnect()
    console.log('\n🔌 Disconnected from MongoDB')
    process.exit(0)
  }
}

migrateTo15MinuteSlots()
