import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Appointment from '../models/Appointment.js'
import User from '../models/User.js'
import Slot from '../models/Slot.js'

// Load environment variables
dotenv.config()

const createTestAppointment = async () => {
  try {
    console.log('🆕 Creating a new test appointment...')
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kasam-healthcare')
    console.log('✅ Connected to MongoDB')

    // Find patient and doctor
    const patient = await User.findOne({ email: 'patient@example.com' })
    const doctor = await User.findOne({ role: 'admin' })

    if (!patient || !doctor) {
      console.log('❌ Patient or doctor not found!')
      return
    }

    console.log(`✅ Found patient: ${patient.firstName} ${patient.lastName}`)
    console.log(`✅ Found doctor: Dr. ${doctor.firstName} ${doctor.lastName}`)

    // Create a past appointment for testing cancellation
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 1) // Yesterday
    pastDate.setHours(0, 0, 0, 0)

    // Create a slot first
    const testSlot = new Slot({
      doctor: doctor._id,
      date: pastDate,
      startTime: '10:00',
      endTime: '10:30',
      duration: 30,
      isAvailable: true,
      isBooked: false,
      createdBy: doctor._id
    })

    await testSlot.save()
    console.log(`✅ Created test slot: ${testSlot._id}`)

    // Create the appointment
    const testAppointment = new Appointment({
      patient: patient._id,
      doctor: doctor._id,
      appointmentDate: pastDate,
      appointmentTime: '10:00',
      service: 'General Checkup',
      reason: 'Test past appointment for cancellation testing',
      status: 'confirmed',
      priority: 'normal',
      duration: 30,
      createdBy: patient._id
    })

    await testAppointment.save()
    console.log(`✅ Created test appointment: ${testAppointment._id}`)

    // Book the slot
    testSlot.isBooked = true
    testSlot.bookedBy = patient._id
    testSlot.appointment = testAppointment._id
    await testSlot.save()
    console.log(`✅ Booked slot for appointment`)

    // Test if it can be cancelled
    const canCancel = testAppointment.canBeCancelled()
    console.log(`\n📋 Test Appointment Details:`)
    console.log(`   ID: ${testAppointment._id}`)
    console.log(`   Service: ${testAppointment.service}`)
    console.log(`   Date: ${testAppointment.appointmentDate.toDateString()}`)
    console.log(`   Time: ${testAppointment.appointmentTime}`)
    console.log(`   Status: ${testAppointment.status}`)
    console.log(`   Can be cancelled: ${canCancel ? '✅ Yes' : '❌ No'}`)

    console.log(`\n🎯 Use this appointment ID to test cancellation: ${testAppointment._id}`)
    console.log(`   Test URL: http://localhost:5000/api/appointments/${testAppointment._id}`)

  } catch (error) {
    console.error('❌ Error creating test appointment:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Database connection closed')
    process.exit(0)
  }
}

// Run the script
createTestAppointment()
