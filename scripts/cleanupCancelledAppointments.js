import mongoose from 'mongoose'
import Appointment from '../models/Appointment.js'
import Slot from '../models/Slot.js'

async function cleanupCancelledAppointments() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/kasam-healthcare')
    console.log('✅ Connected to MongoDB')
    
    // Find all cancelled appointments
    const cancelledAppointments = await Appointment.find({ status: 'cancelled' })
    console.log(`\n📋 Found ${cancelledAppointments.length} cancelled appointments`)
    
    if (cancelledAppointments.length === 0) {
      console.log('✅ No cancelled appointments to clean up')
      return
    }
    
    // Process each cancelled appointment
    for (const appointment of cancelledAppointments) {
      console.log(`\n🔄 Processing appointment: ${appointment._id}`)
      console.log(`   Service: ${appointment.service}`)
      console.log(`   Date: ${appointment.appointmentDate}`)
      console.log(`   Time: ${appointment.appointmentTime}`)
      
      // Find and free up associated slot
      try {
        const slot = await Slot.findOne({
          appointment: appointment._id,
          isBooked: true
        })
        
        if (slot) {
          console.log(`   📍 Found associated slot: ${slot._id}`)
          slot.isBooked = false
          slot.bookedBy = null
          slot.appointment = null
          await slot.save()
          console.log('   ✅ Slot freed up successfully')
        } else {
          console.log('   ℹ️  No associated slot found')
        }
      } catch (slotError) {
        console.error(`   ❌ Error freeing up slot: ${slotError.message}`)
      }
      
      // Delete the appointment
      await Appointment.findByIdAndDelete(appointment._id)
      console.log('   ✅ Appointment deleted successfully')
    }
    
    console.log(`\n🎉 Successfully cleaned up ${cancelledAppointments.length} cancelled appointments`)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB')
  }
}

cleanupCancelledAppointments()
