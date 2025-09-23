import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Slot from '../models/Slot.js'

// Load environment variables
dotenv.config()

const migrateTo15DaySystem = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    console.log('🔄 Migrating to 15-Day Rolling Slot System...\n')

    // Get current state
    const today = new Date()
    const fifteenDaysFromNow = new Date(today)
    fifteenDaysFromNow.setDate(today.getDate() + 15)

    const totalSlots = await Slot.countDocuments()
    const futureSlots = await Slot.countDocuments({
      date: { $gte: today, $lt: fifteenDaysFromNow }
    })
    const slotsBeyond15Days = await Slot.countDocuments({
      date: { $gte: fifteenDaysFromNow },
      isBooked: false
    })
    const bookedSlotsBeyond15Days = await Slot.countDocuments({
      date: { $gte: fifteenDaysFromNow },
      isBooked: true
    })

    console.log('📊 Current State:')
    console.log(`   Total slots: ${totalSlots}`)
    console.log(`   Next 15 days: ${futureSlots}`)
    console.log(`   Unbooked slots beyond 15 days: ${slotsBeyond15Days}`)
    console.log(`   Booked slots beyond 15 days: ${bookedSlotsBeyond15Days}`)

    // Step 1: Remove all unbooked slots beyond 15 days
    console.log('\n🗑️  Step 1: Removing unbooked slots beyond 15 days...')
    const deleteResult = await Slot.deleteMany({
      date: { $gte: fifteenDaysFromNow },
      isBooked: false
    })
    console.log(`   ✅ Deleted ${deleteResult.deletedCount} unbooked slots beyond 15 days`)

    // Step 2: Remove old unbooked slots (older than 3 days)
    console.log('\n🗑️  Step 2: Removing old unbooked slots (>3 days ago)...')
    const threeDaysAgo = new Date(today)
    threeDaysAgo.setDate(today.getDate() - 3)
    
    const oldDeleteResult = await Slot.deleteMany({
      date: { $lt: threeDaysAgo },
      isBooked: false
    })
    console.log(`   ✅ Deleted ${oldDeleteResult.deletedCount} old unbooked slots`)

    // Step 3: Verify the 15-day window
    console.log('\n📅 Step 3: Verifying 15-day window...')
    const remainingTotal = await Slot.countDocuments()
    const remaining15Days = await Slot.countDocuments({
      date: { $gte: today, $lt: fifteenDaysFromNow }
    })
    const remainingBeyond15Days = await Slot.countDocuments({
      date: { $gte: fifteenDaysFromNow },
      isBooked: false
    })

    console.log(`   Total slots after cleanup: ${remainingTotal}`)
    console.log(`   Slots in 15-day window: ${remaining15Days}`)
    console.log(`   Unbooked slots beyond 15 days: ${remainingBeyond15Days}`)

    // Step 4: Show detailed 15-day breakdown
    console.log('\n📈 15-Day Window Breakdown:')
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

    // Step 5: Show preserved booked appointments
    const bookedAppointments = await Slot.countDocuments({ isBooked: true })
    const futureBookedAppointments = await Slot.countDocuments({
      isBooked: true,
      date: { $gte: today }
    })
    const pastBookedAppointments = await Slot.countDocuments({
      isBooked: true,
      date: { $lt: today }
    })

    console.log('\n📋 Preserved Booked Appointments:')
    console.log(`   Total booked appointments: ${bookedAppointments}`)
    console.log(`   Future booked appointments: ${futureBookedAppointments}`)
    console.log(`   Past booked appointments: ${pastBookedAppointments}`)

    // Step 6: Final validation
    console.log('\n✅ Migration Validation:')
    if (remainingBeyond15Days === 0) {
      console.log('   ✓ No unbooked slots beyond 15 days')
    } else {
      console.log(`   ❌ Still ${remainingBeyond15Days} unbooked slots beyond 15 days`)
    }

    if (remaining15Days > 0) {
      console.log('   ✓ Slots exist for 15-day window')
    } else {
      console.log('   ❌ No slots in 15-day window')
    }

    console.log(`   ✓ Preserved ${bookedAppointments} booked appointments`)
    console.log(`   ✓ Reduced database size by ${totalSlots - remainingTotal} slots`)

    console.log('\n🎉 Migration to 15-Day Rolling System completed successfully!')
    console.log('\n📋 Next Steps:')
    console.log('   1. The system will now maintain exactly 15 days of future slots')
    console.log('   2. Daily refresh at 12:01 AM IST will maintain the rolling window')
    console.log('   3. Daily cleanup at 1:00 AM IST will remove old unbooked slots')
    console.log('   4. All booked appointments are preserved regardless of date')

  } catch (error) {
    console.error('❌ Migration failed:', error)
  } finally {
    await mongoose.disconnect()
    console.log('\n🔌 Disconnected from MongoDB')
    process.exit(0)
  }
}

migrateTo15DaySystem()
