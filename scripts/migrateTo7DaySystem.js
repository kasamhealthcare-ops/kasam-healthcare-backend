import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Slot from '../models/Slot.js'

// Load environment variables
dotenv.config()

const migrateTo7DaySystem = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    console.log('🔄 Migrating to 7-Day Rolling Slot System...\n')

    // Get current state
    const today = new Date()
    const sevenDaysFromNow = new Date(today)
    sevenDaysFromNow.setDate(today.getDate() + 7)

    const totalSlots = await Slot.countDocuments()
    const futureSlots = await Slot.countDocuments({
      date: { $gte: today, $lt: sevenDaysFromNow }
    })
    const slotsBeyon7Days = await Slot.countDocuments({
      date: { $gte: sevenDaysFromNow },
      isBooked: false
    })
    const bookedSlotsBeyond7Days = await Slot.countDocuments({
      date: { $gte: sevenDaysFromNow },
      isBooked: true
    })

    console.log('📊 Current State:')
    console.log(`   Total slots: ${totalSlots}`)
    console.log(`   Next 7 days: ${futureSlots}`)
    console.log(`   Unbooked slots beyond 7 days: ${slotsBeyon7Days}`)
    console.log(`   Booked slots beyond 7 days: ${bookedSlotsBeyond7Days}`)

    // Step 1: Remove all unbooked slots beyond 7 days
    console.log('\n🗑️  Step 1: Removing unbooked slots beyond 7 days...')
    const deleteResult = await Slot.deleteMany({
      date: { $gte: sevenDaysFromNow },
      isBooked: false
    })
    console.log(`   ✅ Deleted ${deleteResult.deletedCount} unbooked slots beyond 7 days`)

    // Step 2: Remove old unbooked slots (older than 3 days)
    console.log('\n🗑️  Step 2: Removing old unbooked slots (>3 days ago)...')
    const threeDaysAgo = new Date(today)
    threeDaysAgo.setDate(today.getDate() - 3)
    
    const oldDeleteResult = await Slot.deleteMany({
      date: { $lt: threeDaysAgo },
      isBooked: false
    })
    console.log(`   ✅ Deleted ${oldDeleteResult.deletedCount} old unbooked slots`)

    // Step 3: Verify the 7-day window
    console.log('\n📅 Step 3: Verifying 7-day window...')
    const remainingTotal = await Slot.countDocuments()
    const remaining7Days = await Slot.countDocuments({
      date: { $gte: today, $lt: sevenDaysFromNow }
    })
    const remainingBeyond7Days = await Slot.countDocuments({
      date: { $gte: sevenDaysFromNow },
      isBooked: false
    })

    console.log(`   Total slots after cleanup: ${remainingTotal}`)
    console.log(`   Slots in 7-day window: ${remaining7Days}`)
    console.log(`   Unbooked slots beyond 7 days: ${remainingBeyond7Days}`)

    // Step 4: Show detailed 7-day breakdown
    console.log('\n📈 7-Day Window Breakdown:')
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
    if (remainingBeyond7Days === 0) {
      console.log('   ✓ No unbooked slots beyond 7 days')
    } else {
      console.log(`   ❌ Still ${remainingBeyond7Days} unbooked slots beyond 7 days`)
    }

    if (remaining7Days > 0) {
      console.log('   ✓ Slots exist for 7-day window')
    } else {
      console.log('   ❌ No slots in 7-day window')
    }

    console.log(`   ✓ Preserved ${bookedAppointments} booked appointments`)
    console.log(`   ✓ Reduced database size by ${totalSlots - remainingTotal} slots`)

    console.log('\n🎉 Migration to 7-Day Rolling System completed successfully!')
    console.log('\n📋 Next Steps:')
    console.log('   1. The system will now maintain exactly 7 days of future slots')
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

migrateTo7DaySystem()
