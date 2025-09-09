import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Appointment from '../models/Appointment.js'
import Slot from '../models/Slot.js'
import User from '../models/User.js'

dotenv.config()

const checkAppointmentLocations = async () => {
  try {
    console.log('🔍 Checking appointment locations...')
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kasam-healthcare')
    console.log('✅ Connected to MongoDB')

    // Get all appointments
    const appointments = await Appointment.find({})
      .populate('patient', 'firstName lastName email')
      .populate('doctor', 'firstName lastName')
      .sort({ createdAt: -1 })

    console.log(`\n📋 Found ${appointments.length} appointments`)
    
    appointments.forEach((appointment, index) => {
      console.log(`\n${index + 1}. Appointment ID: ${appointment._id}`)
      console.log(`   Patient: ${appointment.patient?.firstName} ${appointment.patient?.lastName}`)
      console.log(`   Service: ${appointment.service}`)
      console.log(`   Date: ${appointment.appointmentDate?.toDateString()}`)
      console.log(`   Time: ${appointment.appointmentTime}`)
      console.log(`   Location: "${appointment.location}" (${typeof appointment.location})`)
      console.log(`   Status: ${appointment.status}`)
    })

    // Check what slots exist and their locations
    console.log(`\n\n🕐 Checking available slots...`)
    const slots = await Slot.find({})
      .populate('doctor', 'firstName lastName')
      .sort({ date: 1, startTime: 1 })
      .limit(10)

    console.log(`\n📋 Found ${slots.length} slots (showing first 10)`)
    
    slots.forEach((slot, index) => {
      console.log(`\n${index + 1}. Slot ID: ${slot._id}`)
      console.log(`   Date: ${slot.date?.toDateString()}`)
      console.log(`   Time: ${slot.startTime}-${slot.endTime}`)
      console.log(`   Location: "${slot.location}" (${typeof slot.location})`)
      console.log(`   Available: ${slot.isAvailable}`)
      console.log(`   Booked: ${slot.isBooked}`)
    })

    // Check location mapping
    console.log(`\n\n🗺️ Location mapping test:`)
    const locationMap = {
      'ghodasar': 'Ghodasar Clinic',
      'vastral': 'Vastral Clinic',
      'gandhinagar': 'Gandhinagar Clinic',
      'clinic': 'Main Clinic',
      'hospital': 'Hospital',
      'home': 'Home Visit',
      'online': 'Online Consultation'
    }

    const testLocations = ['clinic', 'ghodasar', 'vastral', 'gandhinagar', undefined, null, '']
    testLocations.forEach(location => {
      const displayName = locationMap[location?.toLowerCase()] || location || 'Main Clinic'
      console.log(`   "${location}" -> "${displayName}"`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB')
  }
}

checkAppointmentLocations()
