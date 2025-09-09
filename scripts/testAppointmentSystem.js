import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'
import Appointment from '../models/Appointment.js'
import Slot from '../models/Slot.js'

// Load environment variables
dotenv.config()

const testAppointmentSystem = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    console.log('🧪 Testing Appointment System...\n')

    // Find users
    const doctor = await User.findOne({ role: { $in: ['admin', 'doctor'] } })
    const patient = await User.findOne({ role: 'patient' })

    console.log(`👨‍⚕️ Doctor: ${doctor?.firstName} ${doctor?.lastName} (${doctor?.email})`)
    console.log(`👤 Patient: ${patient?.firstName} ${patient?.lastName} (${patient?.email})`)

    if (!doctor || !patient) {
      console.log('❌ Missing doctor or patient. Creating test users...')
      
      if (!patient) {
        const testPatient = new User({
          firstName: 'Test',
          lastName: 'Patient',
          email: 'patient@test.com',
          password: 'password123',
          role: 'patient',
          isActive: true
        })
        await testPatient.save()
        console.log('✅ Created test patient')
      }
    }

    // Check existing appointments
    const existingAppointments = await Appointment.find({})
      .populate('patient', 'firstName lastName email')
      .populate('doctor', 'firstName lastName')
      .sort({ createdAt: -1 })

    console.log(`\n📋 Existing appointments: ${existingAppointments.length}`)
    existingAppointments.forEach((apt, index) => {
      console.log(`   ${index + 1}. ${apt.patient?.firstName} ${apt.patient?.lastName} - ${apt.service} (${apt.status})`)
    })

    // Check pending appointments specifically
    const pendingAppointments = await Appointment.find({ status: 'pending' })
      .populate('patient', 'firstName lastName email')
      .populate('doctor', 'firstName lastName')

    console.log(`\n⏳ Pending appointments: ${pendingAppointments.length}`)
    pendingAppointments.forEach((apt, index) => {
      console.log(`   ${index + 1}. ${apt.patient?.firstName} ${apt.patient?.lastName} - ${apt.service}`)
    })

    // Check available slots for today
    const today = new Date()
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
    
    const todaySlots = await Slot.find({
      doctor: doctor._id,
      date: todayUTC,
      isAvailable: true,
      isBooked: false
    }).select('startTime endTime location')

    console.log(`\n🕐 Available slots for today (${today.toDateString()}): ${todaySlots.length}`)
    todaySlots.slice(0, 5).forEach(slot => {
      console.log(`   ${slot.startTime}-${slot.endTime} at ${slot.location}`)
    })

    // Create a test appointment if we have a patient and available slot
    if (patient && todaySlots.length > 0) {
      console.log('\n🆕 Creating test appointment...')
      
      const testSlot = todaySlots[0]
      
      const testAppointment = new Appointment({
        patient: patient._id,
        doctor: doctor._id,
        appointmentDate: todayUTC,
        appointmentTime: testSlot.startTime,
        service: 'Consultation',
        reason: 'Test appointment for system verification',
        status: 'confirmed', // Changed from 'pending' to 'confirmed' for direct booking
        priority: 'normal',
        duration: 30,
        createdBy: patient._id
      })

      await testAppointment.save()
      
      // Book the slot
      await Slot.findByIdAndUpdate(testSlot._id, {
        isBooked: true,
        bookedBy: patient._id,
        appointment: testAppointment._id
      })

      console.log(`✅ Created test appointment: ${testAppointment._id}`)
      console.log(`   Patient: ${patient.firstName} ${patient.lastName}`)
      console.log(`   Service: ${testAppointment.service}`)
      console.log(`   Date: ${testAppointment.appointmentDate.toDateString()}`)
      console.log(`   Time: ${testAppointment.appointmentTime}`)
      console.log(`   Status: ${testAppointment.status}`)
    }

    // Final summary
    const finalAppointments = await Appointment.countDocuments()
    const finalPending = await Appointment.countDocuments({ status: 'pending' })
    
    console.log(`\n📊 Final Summary:`)
    console.log(`   Total appointments: ${finalAppointments}`)
    console.log(`   Pending appointments: ${finalPending}`)
    console.log(`   Available slots today: ${todaySlots.length}`)

    console.log('\n✅ Appointment system test completed!')

  } catch (error) {
    console.error('❌ Error testing appointment system:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Database connection closed')
    process.exit(0)
  }
}

// Run test
testAppointmentSystem()
