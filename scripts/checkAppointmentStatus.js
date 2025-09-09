import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Appointment from '../models/Appointment.js'
import User from '../models/User.js'

// Load environment variables
dotenv.config()

const checkAppointmentStatus = async () => {
  try {
    console.log('🔍 Checking current appointment status...')
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kasam-healthcare')
    console.log('✅ Connected to MongoDB')

    // Find all appointments
    const appointments = await Appointment.find({})
      .populate('patient', 'firstName lastName email')
      .populate('doctor', 'firstName lastName')
      .sort({ createdAt: -1 })

    console.log(`\n📋 Found ${appointments.length} total appointments`)

    if (appointments.length === 0) {
      console.log('❌ No appointments found!')
      return
    }

    // Display all appointments
    console.log('\n📝 Current appointments:')
    appointments.forEach((appointment, index) => {
      console.log(`\n${index + 1}. ${appointment.service}`)
      console.log(`   ID: ${appointment._id}`)
      console.log(`   Patient: ${appointment.patient.firstName} ${appointment.patient.lastName}`)
      console.log(`   Doctor: Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`)
      console.log(`   Date: ${appointment.appointmentDate.toDateString()}`)
      console.log(`   Time: ${appointment.appointmentTime}`)
      console.log(`   Status: ${appointment.status}`)
      console.log(`   Reason: ${appointment.reason}`)
      
      // Test canBeCancelled method
      const canCancel = appointment.canBeCancelled()
      console.log(`   Can be cancelled: ${canCancel ? '✅ Yes' : '❌ No'}`)
      
      if (!canCancel) {
        const now = new Date()
        const appointmentDateTime = appointment.fullDateTime
        console.log(`   Current time: ${now.toISOString()}`)
        console.log(`   Appointment time: ${appointmentDateTime ? appointmentDateTime.toISOString() : 'N/A'}`)
        console.log(`   Is in past: ${appointmentDateTime && appointmentDateTime < now}`)
        console.log(`   Status prevents cancellation: ${['completed', 'cancelled', 'no-show'].includes(appointment.status)}`)
      }
    })

    // Summary by status
    const statusCounts = await Appointment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ])

    console.log(`\n📊 Appointments by status:`)
    statusCounts.forEach(status => {
      console.log(`   ${status._id}: ${status.count}`)
    })

  } catch (error) {
    console.error('❌ Error checking appointment status:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Database connection closed')
    process.exit(0)
  }
}

// Run the check
checkAppointmentStatus()
