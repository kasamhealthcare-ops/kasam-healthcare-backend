import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'
import Appointment from '../models/Appointment.js'
import Slot from '../models/Slot.js'

// Load environment variables
dotenv.config()

const testCancellation = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    console.log('🧪 Testing Appointment Cancellation...\n')

    // Find users
    const doctor = await User.findOne({ role: { $in: ['admin', 'doctor'] } })
    const patient = await User.findOne({ role: 'patient' })

    console.log(`👨‍⚕️ Doctor: ${doctor?.firstName} ${doctor?.lastName}`)
    console.log(`👤 Patient: ${patient?.firstName} ${patient?.lastName}`)

    // Check existing appointments
    const existingAppointments = await Appointment.find({ status: { $ne: 'cancelled' } })
      .populate('patient', 'firstName lastName')
      .sort({ createdAt: -1 })

    console.log(`\n📋 Active appointments: ${existingAppointments.length}`)
    existingAppointments.forEach((apt, index) => {
      console.log(`   ${index + 1}. ${apt.patient?.firstName} ${apt.patient?.lastName} - ${apt.service} (${apt.status})`)
      console.log(`      ID: ${apt._id}`)
      console.log(`      Date: ${apt.appointmentDate.toDateString()} ${apt.appointmentTime}`)
      console.log(`      Can be cancelled: ${apt.canBeCancelled()}`)
    })

    if (existingAppointments.length === 0) {
      console.log('\n🆕 No active appointments found. Creating a test appointment...')
      
      // Find an available slot
      const today = new Date()
      const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
      
      const availableSlot = await Slot.findOne({
        doctor: doctor._id,
        date: todayUTC,
        isAvailable: true,
        isBooked: false
      })

      if (!availableSlot) {
        console.log('❌ No available slots found for today')
        return
      }

      // Create test appointment
      const testAppointment = new Appointment({
        patient: patient._id,
        doctor: doctor._id,
        appointmentDate: todayUTC,
        appointmentTime: availableSlot.startTime,
        service: 'Consultation',
        reason: 'Test appointment for cancellation testing',
        status: 'confirmed', // Should be auto-confirmed now
        priority: 'normal',
        duration: 30,
        createdBy: patient._id
      })

      await testAppointment.save()
      
      // Book the slot
      availableSlot.isBooked = true
      availableSlot.bookedBy = patient._id
      availableSlot.appointment = testAppointment._id
      await availableSlot.save()

      console.log(`✅ Created test appointment: ${testAppointment._id}`)
      console.log(`   Status: ${testAppointment.status}`)
      console.log(`   Can be cancelled: ${testAppointment.canBeCancelled()}`)
      
      // Test cancellation
      console.log('\n🔄 Testing cancellation...')
      
      // Simulate the cancellation API call
      if (testAppointment.canBeCancelled()) {
        testAppointment.status = 'cancelled'
        await testAppointment.save()
        
        // Free up the slot
        availableSlot.isBooked = false
        availableSlot.bookedBy = null
        availableSlot.appointment = null
        await availableSlot.save()
        
        console.log('✅ Appointment cancelled successfully')
        console.log('✅ Slot freed up successfully')
      } else {
        console.log('❌ Appointment cannot be cancelled')
      }
    } else {
      // Test cancellation on existing appointment
      const testAppointment = existingAppointments[0]
      console.log(`\n🔄 Testing cancellation on appointment: ${testAppointment._id}`)
      
      if (testAppointment.canBeCancelled()) {
        console.log('✅ Appointment can be cancelled')
        
        // Find associated slot
        const associatedSlot = await Slot.findOne({
          appointment: testAppointment._id,
          isBooked: true
        })
        
        if (associatedSlot) {
          console.log(`📍 Found associated slot: ${associatedSlot._id}`)
        }
        
        // Perform cancellation
        testAppointment.status = 'cancelled'
        await testAppointment.save()
        
        if (associatedSlot) {
          associatedSlot.isBooked = false
          associatedSlot.bookedBy = null
          associatedSlot.appointment = null
          await associatedSlot.save()
          console.log('✅ Slot freed up successfully')
        }
        
        console.log('✅ Appointment cancelled successfully')
      } else {
        console.log('❌ Appointment cannot be cancelled')
        console.log(`   Status: ${testAppointment.status}`)
        console.log(`   Date: ${testAppointment.appointmentDate}`)
        console.log(`   Full DateTime: ${testAppointment.fullDateTime}`)
        console.log(`   Current Time: ${new Date()}`)
      }
    }

    // Final verification
    const finalAppointments = await Appointment.countDocuments({ status: { $ne: 'cancelled' } })
    const cancelledAppointments = await Appointment.countDocuments({ status: 'cancelled' })
    const availableSlots = await Slot.countDocuments({ isBooked: false, isAvailable: true })
    
    console.log(`\n📊 Final Summary:`)
    console.log(`   Active appointments: ${finalAppointments}`)
    console.log(`   Cancelled appointments: ${cancelledAppointments}`)
    console.log(`   Available slots: ${availableSlots}`)

    console.log('\n✅ Cancellation test completed!')

  } catch (error) {
    console.error('❌ Error testing cancellation:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Database connection closed')
    process.exit(0)
  }
}

// Run test
testCancellation()
