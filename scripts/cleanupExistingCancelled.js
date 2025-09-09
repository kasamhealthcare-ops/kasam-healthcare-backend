import mongoose from 'mongoose'
import Appointment from '../models/Appointment.js'
import Slot from '../models/Slot.js'

async function cleanupExistingCancelled() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/kasam-healthcare')
    console.log('✅ Connected to MongoDB')
    
    // Find all cancelled appointments
    const cancelledAppointments = await Appointment.find({ status: 'cancelled' })
      .populate('patient', 'firstName lastName email')
      .populate('doctor', 'firstName lastName email')
    
    console.log(`\n📋 Found ${cancelledAppointments.length} cancelled appointments to clean up`)
    
    if (cancelledAppointments.length === 0) {
      console.log('✅ No cancelled appointments to clean up')
      return
    }
    
    // Process each cancelled appointment
    let cleanedCount = 0
    for (const appointment of cancelledAppointments) {
      console.log(`\n🔄 Processing appointment ${cleanedCount + 1}/${cancelledAppointments.length}`)
      console.log(`   ID: ${appointment._id}`)
      console.log(`   Patient: ${appointment.patient?.firstName} ${appointment.patient?.lastName}`)
      console.log(`   Service: ${appointment.service}`)
      console.log(`   Date: ${new Date(appointment.appointmentDate).toDateString()}`)
      console.log(`   Time: ${appointment.appointmentTime}`)
      console.log(`   Status: ${appointment.status}`)
      
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
          console.log('   ℹ️  No associated booked slot found')
        }
      } catch (slotError) {
        console.error(`   ❌ Error freeing up slot: ${slotError.message}`)
        // Continue with deletion even if slot cleanup fails
      }
      
      // Delete the appointment
      try {
        await Appointment.findByIdAndDelete(appointment._id)
        console.log('   ✅ Appointment deleted successfully')
        cleanedCount++
      } catch (deleteError) {
        console.error(`   ❌ Error deleting appointment: ${deleteError.message}`)
      }
    }
    
    console.log(`\n🎉 Cleanup completed!`)
    console.log(`   Successfully cleaned up: ${cleanedCount}/${cancelledAppointments.length} appointments`)
    
    // Verify cleanup
    const remainingCancelled = await Appointment.find({ status: 'cancelled' })
    console.log(`   Remaining cancelled appointments: ${remainingCancelled.length}`)
    
    if (remainingCancelled.length === 0) {
      console.log('✅ All cancelled appointments have been successfully removed!')
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message)
  } finally {
    await mongoose.disconnect()
    console.log('\n🔌 Disconnected from MongoDB')
  }
}

cleanupExistingCancelled()
