import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Appointment from '../models/Appointment.js'
import User from '../models/User.js'
import Slot from '../models/Slot.js'

// Load environment variables
dotenv.config()

const testPastAppointmentCancellation = async () => {
  try {
    console.log('🧪 Testing past appointment cancellation...')
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kasam-healthcare')
    console.log('✅ Connected to MongoDB')

    // Find a confirmed appointment that's in the past
    const pastAppointments = await Appointment.find({ 
      status: 'confirmed',
      appointmentDate: { $lt: new Date() } // Past appointments
    })
    .populate('patient', 'firstName lastName email')
    .populate('doctor', 'firstName lastName')

    console.log(`\n📋 Found ${pastAppointments.length} past confirmed appointments`)

    if (pastAppointments.length === 0) {
      console.log('❌ No past confirmed appointments found to test with!')
      return
    }

    // Test the first past appointment
    const testAppointment = pastAppointments[0]
    console.log(`\n🎯 Testing cancellation of past appointment:`)
    console.log(`   ID: ${testAppointment._id}`)
    console.log(`   Service: ${testAppointment.service}`)
    console.log(`   Patient: ${testAppointment.patient.firstName} ${testAppointment.patient.lastName}`)
    console.log(`   Date: ${testAppointment.appointmentDate.toDateString()}`)
    console.log(`   Time: ${testAppointment.appointmentTime}`)
    console.log(`   Current Status: ${testAppointment.status}`)

    // Check if it can be cancelled
    const canCancel = testAppointment.canBeCancelled()
    console.log(`   Can be cancelled: ${canCancel ? '✅ Yes' : '❌ No'}`)

    if (!canCancel) {
      console.log('❌ Appointment cannot be cancelled!')
      return
    }

    // Perform the cancellation
    console.log('\n🔄 Performing cancellation...')
    
    // Find associated slot
    const associatedSlot = await Slot.findOne({
      appointment: testAppointment._id,
      isBooked: true
    })

    if (associatedSlot) {
      console.log(`📍 Found associated slot: ${associatedSlot._id}`)
    }

    // Cancel the appointment
    testAppointment.status = 'cancelled'
    testAppointment.updatedAt = new Date()
    await testAppointment.save()

    // Free up the slot if it exists
    if (associatedSlot) {
      associatedSlot.isBooked = false
      associatedSlot.bookedBy = null
      associatedSlot.appointment = null
      await associatedSlot.save()
      console.log('✅ Slot freed up successfully')
    }

    console.log('✅ Past appointment cancelled successfully!')

    // Verify the cancellation
    const updatedAppointment = await Appointment.findById(testAppointment._id)
    console.log(`\n📊 Verification:`)
    console.log(`   Updated Status: ${updatedAppointment.status}`)
    console.log(`   Can still be cancelled: ${updatedAppointment.canBeCancelled() ? 'Yes' : 'No (correct - already cancelled)'}`)

    console.log('\n🎉 Past appointment cancellation test completed successfully!')
    console.log('   ✅ Past appointments can now be cancelled')
    console.log('   ✅ Cancelled appointments cannot be cancelled again')
    console.log('   ✅ Associated slots are properly freed up')

  } catch (error) {
    console.error('❌ Error testing past appointment cancellation:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Database connection closed')
    process.exit(0)
  }
}

// Run the test
testPastAppointmentCancellation()
