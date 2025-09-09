import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Appointment from '../models/Appointment.js'
import User from '../models/User.js'

dotenv.config()

const checkUpdatedAppointment = async () => {
  try {
    console.log('🔍 Checking updated appointment...')
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kasam-healthcare')
    console.log('✅ Connected to MongoDB')

    // Get the specific appointment
    const appointmentId = '685b99a824d6116d74634770'
    const appointment = await Appointment.findById(appointmentId)
      .populate('patient', 'firstName lastName email phone')
      .populate('doctor', 'firstName lastName email specialization')

    if (!appointment) {
      console.log('❌ Appointment not found')
      return
    }

    console.log(`\n📋 Current Appointment Details:`)
    console.log(`   ID: ${appointment._id}`)
    console.log(`   Patient: ${appointment.patient?.firstName} ${appointment.patient?.lastName}`)
    console.log(`   Doctor: ${appointment.doctor?.firstName} ${appointment.doctor?.lastName}`)
    console.log(`   Service: ${appointment.service}`)
    console.log(`   Date: ${appointment.appointmentDate?.toDateString()}`)
    console.log(`   Time: ${appointment.appointmentTime}`)
    console.log(`   Duration: ${appointment.duration} minutes`)
    console.log(`   Location (raw): "${appointment.location}"`)
    console.log(`   Status: ${appointment.status}`)
    console.log(`   Reason: ${appointment.reason}`)
    console.log(`   Last Updated: ${appointment.updatedAt}`)

    // Test location mapping
    const locationMap = {
      'ghodasar': 'Ghodasar Clinic',
      'vastral': 'Vastral Clinic',
      'gandhinagar': 'Gandhinagar Clinic',
      'clinic': 'Main Clinic',
      'hospital': 'Hospital',
      'home': 'Home Visit',
      'online': 'Online Consultation'
    }
    
    const displayName = locationMap[appointment.location?.toLowerCase()] || appointment.location || 'Main Clinic'
    console.log(`   Location (display): "${displayName}"`)

    // Format the appointment as it would appear in the frontend
    console.log(`\n🎨 Frontend Display Format:`)
    console.log(`   Service: ${appointment.service}`)
    console.log(`   Doctor: ${appointment.doctor?.firstName} ${appointment.doctor?.lastName}`)
    console.log(`   Date: ${appointment.appointmentDate?.toLocaleDateString('en-GB')}`)
    
    // Calculate time range
    const [hours, minutes] = appointment.appointmentTime.split(':').map(Number)
    const startTime = new Date()
    startTime.setHours(hours, minutes, 0, 0)
    const endTime = new Date(startTime.getTime() + (appointment.duration * 60000))
    
    const formatTime = (date) => {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      })
    }
    
    console.log(`   Time: ${formatTime(startTime)} - ${formatTime(endTime)}`)
    console.log(`   Location: ${displayName}`)
    console.log(`   Status: ${appointment.status.toUpperCase()}`)

    // Check if this matches what should be displayed
    console.log(`\n✅ This appointment should now show:`)
    console.log(`   - Time: 1:00 PM - 1:30 PM`)
    console.log(`   - Location: Ghodasar Clinic`)
    console.log(`   - Status: CONFIRMED`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB')
  }
}

checkUpdatedAppointment()
