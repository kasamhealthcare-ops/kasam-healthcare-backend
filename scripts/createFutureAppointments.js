import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Appointment from '../models/Appointment.js'
import User from '../models/User.js'
import Slot from '../models/Slot.js'

// Load environment variables
dotenv.config()

const createFutureAppointments = async () => {
  try {
    console.log('🚀 Creating future appointments for testing...')
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kasam-healthcare')
    console.log('✅ Connected to MongoDB')

    // Find the test patient and doctor
    const patient = await User.findOne({ email: 'patient@example.com' })
    const doctor = await User.findOne({ role: 'admin' }) // The doctor has admin role

    if (!patient) {
      console.log('❌ Test patient not found!')
      return
    }

    if (!doctor) {
      console.log('❌ Doctor not found!')
      return
    }

    console.log(`✅ Found patient: ${patient.firstName} ${patient.lastName}`)
    console.log(`✅ Found doctor: Dr. ${doctor.firstName} ${doctor.lastName}`)

    // Create future dates (tomorrow and day after tomorrow)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    const dayAfterTomorrow = new Date()
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)
    dayAfterTomorrow.setHours(0, 0, 0, 0)

    // Create future slots first
    const futureSlots = [
      {
        doctor: doctor._id,
        date: tomorrow,
        startTime: '10:00',
        endTime: '10:30',
        duration: 30,
        isAvailable: true,
        isBooked: false,
        createdBy: doctor._id
      },
      {
        doctor: doctor._id,
        date: tomorrow,
        startTime: '14:00',
        endTime: '14:30',
        duration: 30,
        isAvailable: true,
        isBooked: false,
        createdBy: doctor._id
      },
      {
        doctor: doctor._id,
        date: dayAfterTomorrow,
        startTime: '11:00',
        endTime: '11:30',
        duration: 30,
        isAvailable: true,
        isBooked: false,
        createdBy: doctor._id
      }
    ]

    console.log('\n📅 Creating future slots...')
    const createdSlots = await Slot.insertMany(futureSlots)
    console.log(`✅ Created ${createdSlots.length} future slots`)

    // Create future appointments
    const futureAppointments = [
      {
        patient: patient._id,
        doctor: doctor._id,
        appointmentDate: tomorrow,
        appointmentTime: '10:00',
        service: 'Consultation',
        reason: 'Follow-up consultation - can be cancelled',
        status: 'confirmed',
        priority: 'normal',
        duration: 30,
        createdBy: patient._id
      },
      {
        patient: patient._id,
        doctor: doctor._id,
        appointmentDate: tomorrow,
        appointmentTime: '14:00',
        service: 'General Checkup',
        reason: 'Regular health checkup - can be cancelled',
        status: 'confirmed',
        priority: 'normal',
        duration: 30,
        createdBy: patient._id
      },
      {
        patient: patient._id,
        doctor: doctor._id,
        appointmentDate: dayAfterTomorrow,
        appointmentTime: '11:00',
        service: 'Lab Test',
        reason: 'Blood test appointment - can be cancelled',
        status: 'confirmed',
        priority: 'normal',
        duration: 30,
        createdBy: patient._id
      }
    ]

    console.log('\n📋 Creating future appointments...')
    const createdAppointments = await Appointment.insertMany(futureAppointments)
    console.log(`✅ Created ${createdAppointments.length} future appointments`)

    // Book the slots
    console.log('\n🔗 Booking slots for appointments...')
    for (let i = 0; i < createdAppointments.length; i++) {
      const appointment = createdAppointments[i]
      const slot = createdSlots[i]
      
      slot.isBooked = true
      slot.bookedBy = patient._id
      slot.appointment = appointment._id
      await slot.save()
      
      console.log(`✅ Booked slot ${slot._id} for appointment ${appointment._id}`)
    }

    // Display created appointments
    console.log('\n📝 Created appointments:')
    createdAppointments.forEach((appointment, index) => {
      console.log(`${index + 1}. ${appointment.service}`)
      console.log(`   Date: ${appointment.appointmentDate.toDateString()}`)
      console.log(`   Time: ${appointment.appointmentTime}`)
      console.log(`   Status: ${appointment.status}`)
      console.log(`   Reason: ${appointment.reason}`)
      console.log(`   Can be cancelled: ✅ Yes (future appointment)`)
      console.log('')
    })

    console.log('🎉 Future appointments created successfully!')
    console.log('   These appointments can be cancelled from the patient dashboard')
    console.log('   The cancel button should now work properly')

  } catch (error) {
    console.error('❌ Error creating future appointments:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Database connection closed')
    process.exit(0)
  }
}

// Run the script
createFutureAppointments()
