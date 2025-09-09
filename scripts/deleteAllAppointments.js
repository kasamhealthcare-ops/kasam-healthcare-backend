import mongoose from 'mongoose'
import Appointment from '../models/Appointment.js'
import Slot from '../models/Slot.js'

async function deleteAllAppointments() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/kasam-healthcare')
    console.log('✅ Connected to MongoDB')
    
    // Get count of appointments before deletion
    const appointmentCount = await Appointment.countDocuments()
    console.log(`\n📋 Found ${appointmentCount} appointments to delete`)
    
    if (appointmentCount === 0) {
      console.log('✅ No appointments to delete')
      return
    }
    
    // Get all appointments to free up associated slots
    const appointments = await Appointment.find()
    console.log(`\n🔄 Processing ${appointments.length} appointments...`)
    
    let slotsFreed = 0
    
    // Free up all associated slots first
    for (const appointment of appointments) {
      try {
        const slot = await Slot.findOne({
          appointment: appointment._id,
          isBooked: true
        })
        
        if (slot) {
          slot.isBooked = false
          slot.bookedBy = null
          slot.appointment = null
          await slot.save()
          slotsFreed++
        }
      } catch (slotError) {
        console.error(`❌ Error freeing slot for appointment ${appointment._id}:`, slotError.message)
        // Continue with deletion even if slot cleanup fails
      }
    }
    
    console.log(`📍 Freed up ${slotsFreed} slots`)
    
    // Delete all appointments
    console.log('\n🗑️  Deleting all appointments...')
    const deleteResult = await Appointment.deleteMany({})
    
    console.log(`\n🎉 Deletion completed!`)
    console.log(`   Appointments deleted: ${deleteResult.deletedCount}`)
    console.log(`   Slots freed up: ${slotsFreed}`)
    
    // Verify deletion
    const remainingCount = await Appointment.countDocuments()
    console.log(`   Remaining appointments: ${remainingCount}`)
    
    if (remainingCount === 0) {
      console.log('✅ All appointments have been successfully deleted!')
    } else {
      console.log(`⚠️  ${remainingCount} appointments still remain`)
    }
    
    // Show slot status
    const totalSlots = await Slot.countDocuments()
    const bookedSlots = await Slot.countDocuments({ isBooked: true })
    const availableSlots = totalSlots - bookedSlots
    
    console.log(`\n📊 Slot Status:`)
    console.log(`   Total slots: ${totalSlots}`)
    console.log(`   Available slots: ${availableSlots}`)
    console.log(`   Booked slots: ${bookedSlots}`)
    
  } catch (error) {
    console.error('❌ Error during deletion:', error.message)
  } finally {
    await mongoose.disconnect()
    console.log('\n🔌 Disconnected from MongoDB')
  }
}

// Add confirmation prompt
console.log('⚠️  WARNING: This will delete ALL appointments from the database!')
console.log('This action cannot be undone.')
console.log('\nStarting deletion in 3 seconds...')

setTimeout(() => {
  deleteAllAppointments()
}, 3000)
