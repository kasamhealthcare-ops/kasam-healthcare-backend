import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Slot from '../models/Slot.js'
import Appointment from '../models/Appointment.js'

// Load environment variables
dotenv.config()

const forceCleanupOldSlots = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    console.log('🧹 FORCE CLEANUP: Removing ALL old slots and appointments...\n')

    const today = new Date()
    today.setHours(0, 0, 0, 0) // Start of today

    // === STEP 1: Find and display what will be cleaned ===
    console.log('🔍 STEP 1: Analyzing data to be cleaned...')

    // Check past appointments
    const pastAppointments = await Appointment.find({
      appointmentDate: { $lt: today }
    }).sort({ appointmentDate: 1 })

    console.log(`📊 Found ${pastAppointments.length} past appointments`)

    if (pastAppointments.length > 0) {
      // Group by date for display
      const appointmentsByDate = {}
      pastAppointments.forEach(apt => {
        const dateKey = apt.appointmentDate.toDateString()
        if (!appointmentsByDate[dateKey]) {
          appointmentsByDate[dateKey] = []
        }
        appointmentsByDate[dateKey].push(apt)
      })

      console.log('   Past appointments by date:')
      for (const [date, appointments] of Object.entries(appointmentsByDate)) {
        console.log(`   📅 ${date}: ${appointments.length} appointments`)
      }
    }

    // Check past slots (both booked and unbooked)
    const pastSlots = await Slot.find({
      date: { $lt: today }
    }).sort({ date: 1 })

    console.log(`📊 Found ${pastSlots.length} past slots (booked + unbooked)`)

    if (pastSlots.length > 0) {
      // Group by date and booking status
      const slotsByDate = {}
      pastSlots.forEach(slot => {
        const dateKey = slot.date.toDateString()
        if (!slotsByDate[dateKey]) {
          slotsByDate[dateKey] = { booked: 0, unbooked: 0 }
        }
        if (slot.isBooked) {
          slotsByDate[dateKey].booked++
        } else {
          slotsByDate[dateKey].unbooked++
        }
      })

      console.log('   Past slots by date:')
      for (const [date, counts] of Object.entries(slotsByDate)) {
        console.log(`   📅 ${date}: ${counts.booked} booked, ${counts.unbooked} unbooked`)
      }
    }

    // === STEP 2: Clean up past appointments ===
    console.log('\n🔄 STEP 2: Cleaning up past appointments...')

    if (pastAppointments.length > 0) {
      // Free up associated slots first
      let slotsFreed = 0
      for (const appointment of pastAppointments) {
        const slot = await Slot.findOne({
          appointment: appointment._id,
          isBooked: true
        })

        if (slot) {
          slot.isBooked = false
          slot.bookedBy = null
          slot.appointment = null
          await slot.save()
          slotsFreed++
        }
      }

      // Delete past appointments
      const appointmentResult = await Appointment.deleteMany({
        appointmentDate: { $lt: today }
      })

      console.log(`   ✅ Deleted ${appointmentResult.deletedCount} past appointments`)
      console.log(`   🔓 Freed ${slotsFreed} associated slots`)
    }

    // === STEP 3: Clean up ALL past slots (booked and unbooked) ===
    console.log('\n🔄 STEP 3: Cleaning up ALL past slots...')

    if (pastSlots.length > 0) {
      // Delete ALL past slots (both booked and unbooked)
      const slotResult = await Slot.deleteMany({
        date: { $lt: today }
      })

      console.log(`   ✅ Deleted ${slotResult.deletedCount} past slots`)
    }

    // === STEP 4: Verify cleanup ===
    console.log('\n🔍 STEP 4: Verifying cleanup...')

    const remainingPastAppointments = await Appointment.countDocuments({
      appointmentDate: { $lt: today }
    })

    const remainingPastSlots = await Slot.countDocuments({
      date: { $lt: today }
    })

    console.log(`📊 Remaining past appointments: ${remainingPastAppointments}`)
    console.log(`📊 Remaining past slots: ${remainingPastSlots}`)

    if (remainingPastAppointments === 0 && remainingPastSlots === 0) {
      console.log('✅ Cleanup completed successfully - no old data remaining')
    } else {
      console.log('⚠️  Some old data still remains - may need manual intervention')
    }

    // === STEP 5: Show current data summary ===
    console.log('\n📈 STEP 5: Current data summary...')

    const totalAppointments = await Appointment.countDocuments()
    const totalSlots = await Slot.countDocuments()
    const bookedSlots = await Slot.countDocuments({ isBooked: true })
    const availableSlots = await Slot.countDocuments({ isBooked: false, isAvailable: true })

    console.log(`📊 Total appointments: ${totalAppointments}`)
    console.log(`📊 Total slots: ${totalSlots}`)
    console.log(`📊 Booked slots: ${bookedSlots}`)
    console.log(`📊 Available slots: ${availableSlots}`)

    console.log('\n🎉 Force cleanup completed!')

  } catch (error) {
    console.error('❌ Force cleanup failed:', error)
  } finally {
    await mongoose.disconnect()
    console.log('👋 Disconnected from MongoDB')
    process.exit(0)
  }
}

// Run the cleanup
forceCleanupOldSlots()
