import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Appointment from '../models/Appointment.js'
import Slot from '../models/Slot.js'
import User from '../models/User.js'

dotenv.config()

const fixCurrentAppointmentLocation = async () => {
  try {
    console.log('🔧 Fixing current appointment location...')
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kasam-healthcare')
    console.log('✅ Connected to MongoDB')

    // Get the specific appointment
    const appointmentId = '685b99a824d6116d74634770'
    const appointment = await Appointment.findById(appointmentId)
      .populate('patient', 'firstName lastName')
      .populate('doctor', 'firstName lastName')

    if (!appointment) {
      console.log('❌ Appointment not found')
      return
    }

    console.log(`\n📋 Current Appointment:`)
    console.log(`   ID: ${appointment._id}`)
    console.log(`   Patient: ${appointment.patient?.firstName} ${appointment.patient?.lastName}`)
    console.log(`   Date: ${appointment.appointmentDate?.toDateString()}`)
    console.log(`   Time: ${appointment.appointmentTime}`)
    console.log(`   Current Location: ${appointment.location}`)

    // Find the slot that matches this appointment's time and date
    const matchingSlot = await Slot.findOne({
      doctor: appointment.doctor._id,
      date: appointment.appointmentDate,
      startTime: appointment.appointmentTime,
      isBooked: true
    })

    if (matchingSlot) {
      console.log(`\n🕐 Found matching slot:`)
      console.log(`   Slot ID: ${matchingSlot._id}`)
      console.log(`   Time: ${matchingSlot.startTime}-${matchingSlot.endTime}`)
      console.log(`   Slot Location: ${matchingSlot.location}`)
      console.log(`   Is Booked: ${matchingSlot.isBooked}`)

      if (appointment.location !== matchingSlot.location) {
        console.log(`\n🔄 Updating appointment location:`)
        console.log(`   From: ${appointment.location}`)
        console.log(`   To: ${matchingSlot.location}`)

        appointment.location = matchingSlot.location
        await appointment.save()

        console.log(`   ✅ Appointment location updated successfully!`)
      } else {
        console.log(`\n✅ Appointment location is already correct`)
      }
    } else {
      console.log(`\n❌ No matching slot found for this appointment`)
      
      // Let's check what slots exist for this time
      const slotsAtTime = await Slot.find({
        doctor: appointment.doctor._id,
        date: appointment.appointmentDate,
        startTime: appointment.appointmentTime
      })

      console.log(`\n🔍 All slots at this time (${appointment.appointmentTime}):`)
      slotsAtTime.forEach(slot => {
        console.log(`   Slot ${slot._id}: ${slot.location}, booked: ${slot.isBooked}, available: ${slot.isAvailable}`)
      })
    }

    // Verify the final result
    const updatedAppointment = await Appointment.findById(appointmentId)
    console.log(`\n📊 Final Result:`)
    console.log(`   Appointment Location: ${updatedAppointment.location}`)
    
    const locationMap = {
      'ghodasar': 'Ghodasar Clinic',
      'vastral': 'Vastral Clinic',
      'gandhinagar': 'Gandhinagar Clinic',
      'clinic': 'Main Clinic',
      'hospital': 'Hospital',
      'home': 'Home Visit',
      'online': 'Online Consultation'
    }
    
    const displayName = locationMap[updatedAppointment.location?.toLowerCase()] || updatedAppointment.location || 'Main Clinic'
    console.log(`   Display Name: ${displayName}`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB')
  }
}

fixCurrentAppointmentLocation()
