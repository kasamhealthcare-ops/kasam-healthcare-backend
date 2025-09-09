import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Appointment from '../models/Appointment.js'
import User from '../models/User.js'
import Slot from '../models/Slot.js'

// Load environment variables
dotenv.config()

const testDirectCancellation = async () => {
  try {
    console.log('🧪 Testing direct cancellation logic...')
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kasam-healthcare')
    console.log('✅ Connected to MongoDB')

    // Find the specific appointment
    const appointmentId = '68416f1cc8c0a5e16f90304b'
    const appointment = await Appointment.findById(appointmentId)

    if (!appointment) {
      console.log('❌ Appointment not found!')
      return
    }

    console.log(`\n📋 Testing appointment: ${appointment.service}`)
    console.log(`   Status: ${appointment.status}`)
    console.log(`   Date: ${appointment.appointmentDate}`)
    console.log(`   Time: ${appointment.appointmentTime}`)

    // Test the canBeCancelled method
    console.log(`\n🧪 Testing canBeCancelled():`)
    const canCancel = appointment.canBeCancelled()
    console.log(`   Result: ${canCancel ? '✅ Yes' : '❌ No'}`)

    if (!canCancel) {
      console.log('❌ Cannot cancel - checking why...')
      const statusRestrictions = ['completed', 'cancelled', 'no-show']
      if (statusRestrictions.includes(appointment.status)) {
        console.log(`   Reason: Status '${appointment.status}' prevents cancellation`)
      }
      return
    }

    // Simulate the backend cancellation logic
    console.log(`\n🔄 Simulating backend cancellation logic...`)

    // Check permissions (simulate user being the patient)
    const patient = await User.findOne({ email: 'patient@example.com' })
    if (!patient) {
      console.log('❌ Patient not found!')
      return
    }

    const canDelete = (
      patient.role === 'admin' ||
      appointment.patient.toString() === patient._id.toString() ||
      appointment.doctor.toString() === patient._id.toString()
    )

    console.log(`   Permission check: ${canDelete ? '✅ Allowed' : '❌ Denied'}`)
    console.log(`   Patient ID: ${patient._id}`)
    console.log(`   Appointment patient ID: ${appointment.patient}`)
    console.log(`   Match: ${appointment.patient.toString() === patient._id.toString()}`)

    if (!canDelete) {
      console.log('❌ Permission denied')
      return
    }

    // Perform the actual cancellation
    console.log(`\n✅ All checks passed - performing cancellation...`)
    
    // Find associated slot
    const slot = await Slot.findOne({
      appointment: appointment._id,
      isBooked: true
    })

    if (slot) {
      console.log(`📍 Found associated slot: ${slot._id}`)
    }

    // Cancel the appointment
    appointment.status = 'cancelled'
    appointment.updatedBy = patient._id
    await appointment.save()

    // Free up the slot
    if (slot) {
      slot.isBooked = false
      slot.bookedBy = null
      slot.appointment = null
      await slot.save()
      console.log('✅ Slot freed up')
    }

    console.log('✅ Appointment cancelled successfully!')

    // Verify
    const updatedAppointment = await Appointment.findById(appointmentId)
    console.log(`\n📊 Verification:`)
    console.log(`   New status: ${updatedAppointment.status}`)
    console.log(`   Can still be cancelled: ${updatedAppointment.canBeCancelled() ? 'Yes' : 'No (correct)'}`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Database connection closed')
    process.exit(0)
  }
}

// Run the test
testDirectCancellation()
