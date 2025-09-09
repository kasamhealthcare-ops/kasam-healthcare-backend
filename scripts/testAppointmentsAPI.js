import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'
import Appointment from '../models/Appointment.js'

// Load environment variables
dotenv.config()

const testAppointmentsAPI = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    console.log('🧪 Testing Appointments API Data Structure...\n')

    // Find patient user
    const patient = await User.findOne({ role: 'patient' })
    if (!patient) {
      console.log('❌ No patient user found')
      return
    }

    console.log(`👤 Patient: ${patient.firstName} ${patient.lastName} (${patient.email})`)
    console.log(`   Patient ID: ${patient._id}`)

    // Get appointments directly from database (simulating API query)
    const appointments = await Appointment.find({ patient: patient._id })
      .populate('patient', 'firstName lastName email phone')
      .populate('doctor', 'firstName lastName email specialization')
      .sort('-appointmentDate')

    console.log(`\n📋 Found ${appointments.length} appointments for patient`)

    appointments.forEach((appointment, index) => {
      console.log(`\n${index + 1}. Appointment Details:`)
      console.log(`   _id: ${appointment._id}`)
      console.log(`   Service: ${appointment.service}`)
      console.log(`   Status: ${appointment.status}`)
      console.log(`   Date: ${appointment.appointmentDate}`)
      console.log(`   Time: ${appointment.appointmentTime}`)
      console.log(`   Patient: ${appointment.patient?.firstName} ${appointment.patient?.lastName}`)
      console.log(`   Doctor: ${appointment.doctor?.firstName} ${appointment.doctor?.lastName}`)
      console.log(`   Can be cancelled: ${appointment.canBeCancelled()}`)
      
      // Check the structure that would be sent to frontend
      const frontendData = {
        _id: appointment._id,
        service: appointment.service,
        status: appointment.status,
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime,
        reason: appointment.reason,
        patient: appointment.patient,
        doctor: appointment.doctor
      }
      console.log(`   Frontend data structure:`, JSON.stringify(frontendData, null, 2))
    })

    // Test the API response structure
    console.log(`\n📡 API Response Structure:`)
    const apiResponse = {
      success: true,
      data: {
        appointments,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalAppointments: appointments.length,
          hasNextPage: false,
          hasPrevPage: false
        }
      }
    }

    console.log(`   Response structure:`)
    console.log(`   - success: ${apiResponse.success}`)
    console.log(`   - data.appointments: Array of ${apiResponse.data.appointments.length} items`)
    console.log(`   - First appointment _id: ${apiResponse.data.appointments[0]?._id}`)

    // Test what frontend would receive
    const frontendAppointments = apiResponse.data.appointments || []
    console.log(`\n🎯 Frontend would receive:`)
    console.log(`   - Array length: ${frontendAppointments.length}`)
    console.log(`   - First item _id: ${frontendAppointments[0]?._id}`)
    console.log(`   - First item service: ${frontendAppointments[0]?.service}`)

    if (frontendAppointments.length > 0 && !frontendAppointments[0]._id) {
      console.log('❌ ISSUE FOUND: Appointments missing _id field!')
    } else if (frontendAppointments.length > 0) {
      console.log('✅ Appointments have _id field correctly')
    }

    console.log('\n✅ Appointments API test completed!')

  } catch (error) {
    console.error('❌ Error testing appointments API:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Database connection closed')
    process.exit(0)
  }
}

// Run test
testAppointmentsAPI()
