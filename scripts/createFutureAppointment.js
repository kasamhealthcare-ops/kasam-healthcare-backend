import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'
import Appointment from '../models/Appointment.js'
import Slot from '../models/Slot.js'

// Load environment variables
dotenv.config()

const createFutureAppointment = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    console.log('🆕 Creating future appointment for cancellation testing...\n')

    // Find users
    const doctor = await User.findOne({ role: { $in: ['admin', 'doctor'] } })
    const patient = await User.findOne({ role: 'patient' })

    console.log(`👨‍⚕️ Doctor: ${doctor?.firstName} ${doctor?.lastName}`)
    console.log(`👤 Patient: ${patient?.firstName} ${patient?.lastName}`)

    // Find a future slot (tomorrow)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowUTC = new Date(Date.UTC(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate()))
    
    console.log(`📅 Looking for slots on: ${tomorrow.toDateString()}`)

    const futureSlot = await Slot.findOne({
      doctor: doctor._id,
      date: tomorrowUTC,
      isAvailable: true,
      isBooked: false
    })

    if (!futureSlot) {
      console.log('❌ No available slots found for tomorrow')
      return
    }

    console.log(`🕐 Found available slot: ${futureSlot.startTime}-${futureSlot.endTime} at ${futureSlot.location}`)

    // Create future appointment
    const futureAppointment = new Appointment({
      patient: patient._id,
      doctor: doctor._id,
      appointmentDate: tomorrowUTC,
      appointmentTime: futureSlot.startTime,
      service: 'General Checkup',
      reason: 'Future appointment for cancellation testing',
      status: 'confirmed', // Should be auto-confirmed now
      priority: 'normal',
      duration: 30,
      createdBy: patient._id
    })

    await futureAppointment.save()
    
    // Book the slot
    futureSlot.isBooked = true
    futureSlot.bookedBy = patient._id
    futureSlot.appointment = futureAppointment._id
    await futureSlot.save()

    console.log(`✅ Created future appointment: ${futureAppointment._id}`)
    console.log(`   Status: ${futureAppointment.status}`)
    console.log(`   Date: ${futureAppointment.appointmentDate.toDateString()}`)
    console.log(`   Time: ${futureAppointment.appointmentTime}`)
    console.log(`   Full DateTime: ${futureAppointment.fullDateTime}`)
    console.log(`   Can be cancelled: ${futureAppointment.canBeCancelled()}`)

    // Test cancellation immediately
    console.log('\n🔄 Testing cancellation...')
    
    if (futureAppointment.canBeCancelled()) {
      console.log('✅ Appointment can be cancelled - this is correct!')
      
      // Don't actually cancel it, just verify the logic works
      console.log('ℹ️  Cancellation logic verified. Appointment left active for frontend testing.')
    } else {
      console.log('❌ Appointment cannot be cancelled - this is unexpected!')
      console.log(`   Current time: ${new Date()}`)
      console.log(`   Appointment time: ${futureAppointment.fullDateTime}`)
    }

    // Summary
    const totalAppointments = await Appointment.countDocuments()
    const confirmedAppointments = await Appointment.countDocuments({ status: 'confirmed' })
    
    console.log(`\n📊 Summary:`)
    console.log(`   Total appointments: ${totalAppointments}`)
    console.log(`   Confirmed appointments: ${confirmedAppointments}`)
    console.log(`   Future appointment ID: ${futureAppointment._id}`)

    console.log('\n✅ Future appointment created successfully!')
    console.log('🎯 You can now test cancellation in the frontend!')

  } catch (error) {
    console.error('❌ Error creating future appointment:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Database connection closed')
    process.exit(0)
  }
}

// Run script
createFutureAppointment()
