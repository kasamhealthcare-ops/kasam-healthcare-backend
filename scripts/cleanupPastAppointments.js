import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Appointment from '../models/Appointment.js'
import Slot from '../models/Slot.js'

// Load environment variables
dotenv.config()

async function cleanupPastAppointments() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    const today = new Date()
    today.setHours(0, 0, 0, 0) // Start of today

    console.log(`🗓️  Today's date: ${today.toISOString().split('T')[0]}`)
    console.log('🔍 Searching for past appointments...')

    // Find appointments from past dates
    const pastAppointments = await Appointment.find({
      appointmentDate: { $lt: today }
    }).populate('patient', 'firstName lastName email')
      .populate('doctor', 'firstName lastName')

    if (pastAppointments.length === 0) {
      console.log('✅ No past appointments found to clean up')
      return
    }

    console.log(`\n📊 Found ${pastAppointments.length} past appointments:`)
    pastAppointments.forEach((appointment, index) => {
      const appointmentDate = new Date(appointment.appointmentDate).toISOString().split('T')[0]
      console.log(`   ${index + 1}. ${appointmentDate} ${appointment.appointmentTime} - ${appointment.service} (${appointment.status})`)
      console.log(`      Patient: ${appointment.patient?.firstName} ${appointment.patient?.lastName}`)
      console.log(`      Doctor: ${appointment.doctor?.firstName} ${appointment.doctor?.lastName}`)
    })

    console.log('\n🗑️  Starting cleanup process...')

    let cleanedCount = 0
    let slotsFreedCount = 0
    let errors = []

    for (const appointment of pastAppointments) {
      try {
        console.log(`\n🔄 Processing appointment ${appointment._id}...`)
        
        // Find and free up associated slot
        const slot = await Slot.findOne({
          appointment: appointment._id,
          isBooked: true
        })

        if (slot) {
          console.log(`   📍 Found associated slot: ${slot._id}`)
          slot.isBooked = false
          slot.bookedBy = null
          slot.appointment = null
          await slot.save()
          slotsFreedCount++
          console.log('   ✅ Slot freed up successfully')
        } else {
          console.log('   ℹ️  No associated slot found or slot already freed')
        }

        // Delete the appointment
        await Appointment.findByIdAndDelete(appointment._id)
        cleanedCount++
        console.log('   ✅ Appointment deleted successfully')

      } catch (appointmentError) {
        const errorMsg = `Error cleaning up appointment ${appointment._id}: ${appointmentError.message}`
        console.error(`   ❌ ${errorMsg}`)
        errors.push(errorMsg)
      }
    }

    console.log('\n🎉 Cleanup Summary:')
    console.log(`✅ Successfully cleaned up ${cleanedCount} past appointments`)
    console.log(`🔓 Freed up ${slotsFreedCount} associated slots`)
    
    if (errors.length > 0) {
      console.log(`❌ Errors encountered: ${errors.length}`)
      errors.forEach(error => console.log(`   - ${error}`))
    }

    // Verify cleanup
    const remainingPastAppointments = await Appointment.countDocuments({
      appointmentDate: { $lt: today }
    })

    console.log(`\n🔍 Verification: ${remainingPastAppointments} past appointments remaining`)

    if (remainingPastAppointments === 0) {
      console.log('✅ All past appointments successfully cleaned up!')
    } else {
      console.log('⚠️  Some past appointments may still exist (check errors above)')
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Database connection closed')
    process.exit(0)
  }
}

// Run the cleanup
cleanupPastAppointments()
