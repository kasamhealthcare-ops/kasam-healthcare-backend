import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Appointment from '../models/Appointment.js'
import Slot from '../models/Slot.js'
import User from '../models/User.js'

dotenv.config()

const fixAppointmentLocations = async () => {
  try {
    console.log('🔧 Fixing appointment locations...')
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kasam-healthcare')
    console.log('✅ Connected to MongoDB')

    // Get all appointments that have default 'clinic' location
    const appointmentsToFix = await Appointment.find({ 
      location: 'clinic' 
    })
      .populate('patient', 'firstName lastName email')
      .populate('doctor', 'firstName lastName')

    console.log(`\n📋 Found ${appointmentsToFix.length} appointments with default 'clinic' location`)
    
    let fixedCount = 0
    
    for (const appointment of appointmentsToFix) {
      console.log(`\n🔍 Processing appointment ${appointment._id}`)
      console.log(`   Patient: ${appointment.patient?.firstName} ${appointment.patient?.lastName}`)
      console.log(`   Date: ${appointment.appointmentDate?.toDateString()}`)
      console.log(`   Time: ${appointment.appointmentTime}`)
      console.log(`   Current location: ${appointment.location}`)

      // Find the slot that matches this appointment
      const matchingSlot = await Slot.findOne({
        doctor: appointment.doctor._id,
        date: appointment.appointmentDate,
        startTime: appointment.appointmentTime,
        appointment: appointment._id
      })

      if (matchingSlot) {
        console.log(`   ✅ Found matching slot with location: ${matchingSlot.location}`)
        
        // Update the appointment location
        appointment.location = matchingSlot.location
        await appointment.save()
        
        console.log(`   ✅ Updated appointment location to: ${appointment.location}`)
        fixedCount++
      } else {
        // Try to find any slot at the same date/time (even if not linked)
        const possibleSlot = await Slot.findOne({
          doctor: appointment.doctor._id,
          date: appointment.appointmentDate,
          startTime: appointment.appointmentTime
        })

        if (possibleSlot) {
          console.log(`   ⚠️  Found possible slot with location: ${possibleSlot.location}`)
          console.log(`   ⚠️  Slot is ${possibleSlot.isBooked ? 'booked' : 'not booked'}`)
          
          // Update the appointment location
          appointment.location = possibleSlot.location
          await appointment.save()
          
          console.log(`   ✅ Updated appointment location to: ${appointment.location}`)
          fixedCount++
        } else {
          console.log(`   ❌ No matching slot found - keeping default location`)
        }
      }
    }

    console.log(`\n📊 Summary:`)
    console.log(`   Total appointments checked: ${appointmentsToFix.length}`)
    console.log(`   Appointments fixed: ${fixedCount}`)
    console.log(`   Appointments unchanged: ${appointmentsToFix.length - fixedCount}`)

    // Verify the changes
    console.log(`\n🔍 Verifying changes...`)
    const updatedAppointments = await Appointment.find({})
      .populate('patient', 'firstName lastName')
      .sort({ createdAt: -1 })

    updatedAppointments.forEach((appointment, index) => {
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
      
      console.log(`\n${index + 1}. ${appointment.patient?.firstName} ${appointment.patient?.lastName}`)
      console.log(`   Service: ${appointment.service}`)
      console.log(`   Location: "${appointment.location}" -> "${displayName}"`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB')
  }
}

fixAppointmentLocations()
