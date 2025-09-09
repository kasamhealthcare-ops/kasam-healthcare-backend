import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Slot from '../models/Slot.js'
import Appointment from '../models/Appointment.js'

// Load environment variables
dotenv.config()

const cleanupPastData = async () => {
  try {
    console.log('🚀 Starting comprehensive cleanup of past data...')

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kasam-healthcare')
    console.log('✅ Connected to MongoDB')

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    console.log(`📅 Today: ${today.toDateString()}`)
    console.log(`🔍 Cleaning up all data before: ${today.toISOString()}`)

    // === STEP 1: Clean up past appointments ===
    console.log('\n🔄 STEP 1: Cleaning up past appointments...')

    const pastAppointments = await Appointment.find({
      appointmentDate: { $lt: today }
    }).sort({ appointmentDate: 1 })

    console.log(`📊 Found ${pastAppointments.length} past appointments`)

    if (pastAppointments.length > 0) {
      // Group by date for display
      const appointmentsByDate = {}
      pastAppointments.forEach(apt => {
        const dateKey = new Date(apt.appointmentDate).toDateString()
        if (!appointmentsByDate[dateKey]) {
          appointmentsByDate[dateKey] = []
        }
        appointmentsByDate[dateKey].push(apt)
      })

      console.log('   Past appointments by date:')
      for (const [date, apts] of Object.entries(appointmentsByDate)) {
        console.log(`   📅 ${date}: ${apts.length} appointments`)
      }

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

    // === STEP 2: Clean up past unbooked slots ===
    console.log('\n🔄 STEP 2: Cleaning up past unbooked slots...')

    const pastSlots = await Slot.find({
      date: { $lt: today },
      isBooked: false
    }).sort({ date: 1 })

    console.log(`📊 Found ${pastSlots.length} past unbooked slots`)

    if (pastSlots.length > 0) {
      // Group by date for display
      const slotsByDate = {}
      pastSlots.forEach(slot => {
        const dateKey = slot.date.toDateString()
        if (!slotsByDate[dateKey]) {
          slotsByDate[dateKey] = []
        }
        slotsByDate[dateKey].push(slot)
      })

      console.log('   Past unbooked slots by date:')
      for (const [date, slots] of Object.entries(slotsByDate)) {
        console.log(`   📅 ${date}: ${slots.length} slots`)
      }

      // Delete past unbooked slots
      const slotResult = await Slot.deleteMany({
        date: { $lt: today },
        isBooked: false
      })

      console.log(`   ✅ Deleted ${slotResult.deletedCount} past unbooked slots`)
    }

    // === STEP 3: Clean up any orphaned booked slots from past ===
    console.log('\n🔄 STEP 3: Checking for orphaned past booked slots...')

    const pastBookedSlots = await Slot.find({
      date: { $lt: today },
      isBooked: true
    })

    console.log(`📊 Found ${pastBookedSlots.length} past booked slots`)

    if (pastBookedSlots.length > 0) {
      console.log('   ⚠️  Warning: Found past booked slots - these should have been cleaned up with appointments')

      // Check if they have valid appointments
      let orphanedSlots = 0
      for (const slot of pastBookedSlots) {
        if (slot.appointment) {
          const appointment = await Appointment.findById(slot.appointment)
          if (!appointment) {
            // Orphaned slot - free it up
            slot.isBooked = false
            slot.bookedBy = null
            slot.appointment = null
            await slot.save()
            orphanedSlots++
          }
        } else {
          // No appointment reference - free it up
          slot.isBooked = false
          slot.bookedBy = null
          await slot.save()
          orphanedSlots++
        }
      }

      if (orphanedSlots > 0) {
        console.log(`   🔧 Fixed ${orphanedSlots} orphaned booked slots`)
      }
    }

    // === FINAL VERIFICATION ===
    console.log('\n📊 FINAL STATE VERIFICATION:')

    const totalSlots = await Slot.countDocuments()
    const futureSlots = await Slot.countDocuments({ date: { $gte: today } })
    const remainingPastSlots = await Slot.countDocuments({ date: { $lt: today } })
    const totalAppointments = await Appointment.countDocuments()
    const futureAppointments = await Appointment.countDocuments({ appointmentDate: { $gte: today } })
    const remainingPastAppointments = await Appointment.countDocuments({ appointmentDate: { $lt: today } })

    console.log(`   📅 Slots - Total: ${totalSlots}, Future: ${futureSlots}, Past: ${remainingPastSlots}`)
    console.log(`   📋 Appointments - Total: ${totalAppointments}, Future: ${futureAppointments}, Past: ${remainingPastAppointments}`)

    if (remainingPastSlots === 0 && remainingPastAppointments === 0) {
      console.log(`   ✅ Database is clean - no past data remaining!`)
    } else {
      console.log(`   ⚠️  Warning: Still have ${remainingPastSlots} past slots and ${remainingPastAppointments} past appointments`)
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
  } finally {
    await mongoose.disconnect()
    console.log('\n👋 Disconnected from MongoDB')
  }
}

// Run the cleanup
cleanupPastData()
