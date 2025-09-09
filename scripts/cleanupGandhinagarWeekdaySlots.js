import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Slot from '../models/Slot.js'
import Appointment from '../models/Appointment.js'

dotenv.config()

const cleanupGandhinagarWeekdaySlots = async () => {
  try {
    console.log('🧹 Cleaning up Gandhinagar weekday slots (keeping only Sunday slots)...')
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    // Check current Gandhinagar slots
    console.log('\n📊 Current Gandhinagar slots by day:')
    const gandhinagarSlots = await Slot.find({ location: 'gandhinagar' }).sort({ date: 1 })
    
    const slotsByDay = {}
    gandhinagarSlots.forEach(slot => {
      const dayOfWeek = slot.date.getDay()
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]
      if (!slotsByDay[dayName]) {
        slotsByDay[dayName] = []
      }
      slotsByDay[dayName].push(slot)
    })

    Object.keys(slotsByDay).forEach(day => {
      console.log(`   ${day}: ${slotsByDay[day].length} slots`)
    })

    // Find weekday slots (Monday-Saturday) for Gandhinagar
    const weekdaySlots = await Slot.find({
      location: 'gandhinagar',
      $expr: {
        $and: [
          { $ne: [{ $dayOfWeek: '$date' }, 1] }, // Not Sunday (MongoDB Sunday is 1)
          { $ne: [{ $dayOfWeek: '$date' }, 7] }  // Not Saturday (just to be safe)
        ]
      }
    })

    console.log(`\n🔍 Found ${weekdaySlots.length} Gandhinagar weekday slots to remove`)

    if (weekdaySlots.length > 0) {
      // Check if any of these slots have appointments
      const weekdaySlotIds = weekdaySlots.map(slot => slot._id)
      const appointmentsOnWeekdaySlots = await Appointment.find({
        slot: { $in: weekdaySlotIds }
      }).populate('patient', 'firstName lastName email')

      if (appointmentsOnWeekdaySlots.length > 0) {
        console.log(`\n⚠️  WARNING: Found ${appointmentsOnWeekdaySlots.length} appointments on weekday slots:`)
        appointmentsOnWeekdaySlots.forEach((appointment, index) => {
          const slot = weekdaySlots.find(s => s._id.toString() === appointment.slot.toString())
          console.log(`   ${index + 1}. ${appointment.patient?.firstName} ${appointment.patient?.lastName}`)
          console.log(`      Date: ${slot?.date?.toDateString()}, Time: ${appointment.appointmentTime}`)
          console.log(`      Service: ${appointment.service}`)
        })
        
        console.log('\n❌ Cannot remove weekday slots with existing appointments.')
        console.log('💡 Please reschedule these appointments to Sunday slots or other clinics first.')
        return
      }

      // Remove weekday slots
      console.log('\n🗑️  Removing Gandhinagar weekday slots...')
      const deleteResult = await Slot.deleteMany({
        location: 'gandhinagar',
        $expr: {
          $ne: [{ $dayOfWeek: '$date' }, 1] // Keep only Sunday slots (MongoDB Sunday is 1)
        }
      })

      console.log(`✅ Removed ${deleteResult.deletedCount} weekday slots`)
    } else {
      console.log('\n✅ No weekday slots found to remove')
    }

    // Verify final state
    console.log('\n🔍 Final verification:')
    const remainingSlots = await Slot.find({ location: 'gandhinagar' }).sort({ date: 1 })
    
    const finalSlotsByDay = {}
    remainingSlots.forEach(slot => {
      const dayOfWeek = slot.date.getDay()
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]
      if (!finalSlotsByDay[dayName]) {
        finalSlotsByDay[dayName] = []
      }
      finalSlotsByDay[dayName].push(slot)
    })

    console.log('\n📊 Remaining Gandhinagar slots by day:')
    Object.keys(finalSlotsByDay).forEach(day => {
      console.log(`   ${day}: ${finalSlotsByDay[day].length} slots`)
    })

    // Show sample Sunday slots
    const sundaySlots = remainingSlots.filter(slot => slot.date.getDay() === 0)
    if (sundaySlots.length > 0) {
      console.log('\n📅 Sample Sunday slots:')
      sundaySlots.slice(0, 5).forEach((slot, index) => {
        console.log(`   ${index + 1}. ${slot.date.toDateString()} ${slot.startTime}-${slot.endTime}`)
      })
    }

    console.log('\n✅ Gandhinagar weekday cleanup completed!')
    console.log('📋 Summary:')
    console.log('   ✅ Gandhinagar now operates ONLY on Sundays (12:00-5:00 PM)')
    console.log('   ✅ All weekday slots removed')
    console.log('   ✅ Sunday slots preserved')

  } catch (error) {
    console.error('❌ Cleanup failed:', error)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Disconnected from MongoDB')
  }
}

// Run the cleanup
cleanupGandhinagarWeekdaySlots()
