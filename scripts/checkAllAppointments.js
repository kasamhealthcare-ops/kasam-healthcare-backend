import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Appointment from '../models/Appointment.js'
import User from '../models/User.js'

dotenv.config()

const checkAllAppointments = async () => {
  try {
    console.log('🔍 Checking all appointments...')
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kasam-healthcare')
    console.log('✅ Connected to MongoDB')

    // Get all appointments
    const appointments = await Appointment.find({})
      .populate('patient', 'firstName lastName email')
      .populate('doctor', 'firstName lastName')
      .sort({ createdAt: -1 })

    console.log(`\n📋 Found ${appointments.length} total appointments:`)
    
    appointments.forEach((appointment, index) => {
      console.log(`\n${index + 1}. Appointment ID: ${appointment._id}`)
      console.log(`   Patient: ${appointment.patient?.firstName} ${appointment.patient?.lastName}`)
      console.log(`   Service: ${appointment.service}`)
      console.log(`   Date: ${appointment.appointmentDate?.toDateString()}`)
      console.log(`   Time: ${appointment.appointmentTime}`)
      console.log(`   Location: "${appointment.location}"`)
      console.log(`   Status: ${appointment.status}`)
      console.log(`   Created: ${appointment.createdAt?.toLocaleString()}`)
      console.log(`   Updated: ${appointment.updatedAt?.toLocaleString()}`)
    })

    // Check for the specific patient's appointments
    const patientEmail = 'amitsoni0004@gmail.com'
    const patient = await User.findOne({ email: patientEmail })
    
    if (patient) {
      const patientAppointments = await Appointment.find({ patient: patient._id })
        .populate('doctor', 'firstName lastName')
        .sort({ appointmentDate: -1 })

      console.log(`\n👤 Appointments for ${patient.firstName} ${patient.lastName}:`)
      patientAppointments.forEach((appointment, index) => {
        const locationMap = {
          'ghodasar': 'Ghodasar Clinic',
          'vastral': 'Vastral Clinic',
          'gandhinagar': 'Gandhinagar Clinic',
          'clinic': 'Main Clinic',
          'hospital': 'Hospital',
          'home': 'Home Visit',
          'online': 'Online Consultation'
        }
        
        const displayLocation = locationMap[appointment.location?.toLowerCase()] || appointment.location || 'Main Clinic'
        
        console.log(`\n   ${index + 1}. ${appointment.service} - ${appointment.status.toUpperCase()}`)
        console.log(`      Date: ${appointment.appointmentDate?.toDateString()}`)
        console.log(`      Time: ${appointment.appointmentTime}`)
        console.log(`      Location: ${displayLocation}`)
        console.log(`      ID: ${appointment._id}`)
      })
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB')
  }
}

checkAllAppointments()
