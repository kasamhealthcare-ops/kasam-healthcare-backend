import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'
import Appointment from '../models/Appointment.js'
import Slot from '../models/Slot.js'
import jwt from 'jsonwebtoken'
import axios from 'axios'

// Load environment variables
dotenv.config()

const testCancellationAPI = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    console.log('🧪 Testing Cancellation API End-to-End...\n')

    // Find patient user
    const patient = await User.findOne({ role: 'patient' })
    if (!patient) {
      console.log('❌ No patient user found')
      return
    }

    console.log(`👤 Patient: ${patient.firstName} ${patient.lastName} (${patient.email})`)

    // Generate JWT token for the patient
    const token = jwt.sign(
      { 
        userId: patient._id,
        email: patient.email,
        role: patient.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )

    console.log(`🔑 Generated JWT token for patient`)

    // Find a future appointment that can be cancelled
    const futureAppointment = await Appointment.findOne({
      patient: patient._id,
      status: 'confirmed',
      appointmentDate: { $gte: new Date() }
    })

    if (!futureAppointment) {
      console.log('❌ No future confirmed appointment found for testing')
      return
    }

    console.log(`📅 Found appointment to test: ${futureAppointment._id}`)
    console.log(`   Service: ${futureAppointment.service}`)
    console.log(`   Date: ${futureAppointment.appointmentDate.toDateString()}`)
    console.log(`   Time: ${futureAppointment.appointmentTime}`)
    console.log(`   Status: ${futureAppointment.status}`)
    console.log(`   Can be cancelled: ${futureAppointment.canBeCancelled()}`)

    // Test the API call
    const baseURL = process.env.BACKEND_URL || 'http://localhost:5000'
    const apiURL = `${baseURL}/api/appointments/${futureAppointment._id}`

    console.log(`\n🔄 Testing API call to: ${apiURL}`)

    try {
      const response = await axios.delete(apiURL, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('✅ API call successful!')
      console.log(`   Status: ${response.status}`)
      console.log(`   Response:`, response.data)

      // Verify the appointment was cancelled in database
      const updatedAppointment = await Appointment.findById(futureAppointment._id)
      console.log(`\n📊 Database verification:`)
      console.log(`   Appointment status: ${updatedAppointment.status}`)

      // Check if slot was freed up
      const associatedSlot = await Slot.findOne({
        appointment: futureAppointment._id
      })

      if (associatedSlot) {
        console.log(`   Associated slot found: ${associatedSlot._id}`)
        console.log(`   Slot is booked: ${associatedSlot.isBooked}`)
        console.log(`   Slot bookedBy: ${associatedSlot.bookedBy}`)
      } else {
        console.log(`   No associated slot found (slot was freed up)`)
      }

      console.log('\n✅ Cancellation test PASSED!')

    } catch (apiError) {
      console.log('❌ API call failed!')
      console.log(`   Status: ${apiError.response?.status}`)
      console.log(`   Error:`, apiError.response?.data || apiError.message)

      // Additional debugging
      if (apiError.response?.status === 401) {
        console.log('\n🔍 Authentication debugging:')
        console.log(`   Token: ${token.substring(0, 50)}...`)
        console.log(`   JWT_SECRET exists: ${!!process.env.JWT_SECRET}`)
        
        // Test token verification
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET)
          console.log(`   Token is valid, decoded:`, decoded)
        } catch (tokenError) {
          console.log(`   Token verification failed:`, tokenError.message)
        }
      }

      if (apiError.response?.status === 400) {
        console.log('\n🔍 Business logic debugging:')
        console.log(`   Appointment can be cancelled: ${futureAppointment.canBeCancelled()}`)
        console.log(`   Appointment status: ${futureAppointment.status}`)
        console.log(`   Current time: ${new Date()}`)
        console.log(`   Appointment time: ${futureAppointment.fullDateTime}`)
      }

      console.log('\n❌ Cancellation test FAILED!')
    }

  } catch (error) {
    console.error('❌ Error testing cancellation API:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Database connection closed')
    process.exit(0)
  }
}

// Run test
testCancellationAPI()
