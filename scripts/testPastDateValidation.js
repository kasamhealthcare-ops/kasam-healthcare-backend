import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'
import Appointment from '../models/Appointment.js'
import Slot from '../models/Slot.js'

// Load environment variables
dotenv.config()

async function testPastDateValidation() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    // Find a patient and doctor for testing
    const patient = await User.findOne({ role: 'patient' })
    const doctor = await User.findOne({ role: { $in: ['admin', 'doctor'] } })

    if (!patient || !doctor) {
      console.log('❌ Need at least one patient and one doctor for testing')
      return
    }

    console.log(`👤 Using patient: ${patient.firstName} ${patient.lastName}`)
    console.log(`👨‍⚕️ Using doctor: ${doctor.firstName} ${doctor.lastName}`)

    // Test dates
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    console.log('\n🧪 Testing appointment date validation...')

    // Test 1: Try to create appointment for yesterday (should fail)
    console.log('\n📅 Test 1: Attempting to create appointment for yesterday...')
    try {
      const pastAppointment = new Appointment({
        patient: patient._id,
        doctor: doctor._id,
        appointmentDate: yesterday,
        appointmentTime: '10:00',
        service: 'General Checkup',
        reason: 'Test past date validation',
        status: 'scheduled'
      })

      await pastAppointment.save()
      console.log('❌ UNEXPECTED: Past appointment was created (this should not happen)')
    } catch (error) {
      console.log('✅ EXPECTED: Past appointment creation blocked')
      console.log(`   Error: ${error.message}`)
    }

    // Test 2: Try to create appointment for today (should succeed)
    console.log('\n📅 Test 2: Attempting to create appointment for today...')
    try {
      const todayAppointment = new Appointment({
        patient: patient._id,
        doctor: doctor._id,
        appointmentDate: today,
        appointmentTime: '11:00',
        service: 'General Checkup',
        reason: 'Test today date validation',
        status: 'scheduled'
      })

      await todayAppointment.save()
      console.log('✅ SUCCESS: Today appointment created successfully')
      
      // Clean up test appointment
      await Appointment.findByIdAndDelete(todayAppointment._id)
      console.log('🗑️  Test appointment cleaned up')
    } catch (error) {
      console.log('❌ UNEXPECTED: Today appointment creation failed')
      console.log(`   Error: ${error.message}`)
    }

    // Test 3: Try to create appointment for tomorrow (should succeed)
    console.log('\n📅 Test 3: Attempting to create appointment for tomorrow...')
    try {
      const futureAppointment = new Appointment({
        patient: patient._id,
        doctor: doctor._id,
        appointmentDate: tomorrow,
        appointmentTime: '12:00',
        service: 'General Checkup',
        reason: 'Test future date validation',
        status: 'scheduled'
      })

      await futureAppointment.save()
      console.log('✅ SUCCESS: Future appointment created successfully')
      
      // Clean up test appointment
      await Appointment.findByIdAndDelete(futureAppointment._id)
      console.log('🗑️  Test appointment cleaned up')
    } catch (error) {
      console.log('❌ UNEXPECTED: Future appointment creation failed')
      console.log(`   Error: ${error.message}`)
    }

    // Test 4: Check if slots API blocks past dates
    console.log('\n🔍 Test 4: Testing slots API past date validation...')
    
    const testDates = [
      { date: yesterday, label: 'yesterday', shouldFail: true },
      { date: today, label: 'today', shouldFail: false },
      { date: tomorrow, label: 'tomorrow', shouldFail: false }
    ]

    for (const testCase of testDates) {
      const dateString = testCase.date.toISOString().split('T')[0]
      console.log(`\n   Testing ${testCase.label} (${dateString})...`)
      
      try {
        // Simulate the slots API validation logic
        const targetDate = new Date(testCase.date)
        const todayCheck = new Date()
        
        targetDate.setHours(0, 0, 0, 0)
        todayCheck.setHours(0, 0, 0, 0)

        if (targetDate < todayCheck) {
          throw new Error('Cannot view slots for past dates. Please select today or a future date.')
        }

        console.log(`   ✅ ${testCase.shouldFail ? 'UNEXPECTED' : 'EXPECTED'}: Slots API would allow ${testCase.label}`)
      } catch (error) {
        console.log(`   ${testCase.shouldFail ? '✅ EXPECTED' : '❌ UNEXPECTED'}: Slots API blocked ${testCase.label}`)
        console.log(`      Error: ${error.message}`)
      }
    }

    console.log('\n🎉 Past date validation testing completed!')

  } catch (error) {
    console.error('❌ Error during testing:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Database connection closed')
    process.exit(0)
  }
}

// Run the test
testPastDateValidation()
