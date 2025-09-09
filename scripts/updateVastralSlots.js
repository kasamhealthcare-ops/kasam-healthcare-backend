import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Slot from '../models/Slot.js'
import Appointment from '../models/Appointment.js'

dotenv.config()

const updateVastralSlots = async () => {
  try {
    console.log('🔄 Updating Vastral clinic slots (keeping only 4:00-7:00 PM slots)...')
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    // Check current Vastral slots
    console.log('\n📊 Current Vastral slots by time:')
    const vastralSlots = await Slot.find({ location: 'vastral' }).sort({ date: 1, startTime: 1 })
    
    const slotsByTime = {}
    vastralSlots.forEach(slot => {
      const timeKey = `${slot.startTime}-${slot.endTime}`
      if (!slotsByTime[timeKey]) {
        slotsByTime[timeKey] = []
      }
      slotsByTime[timeKey].push(slot)
    })

    Object.keys(slotsByTime).forEach(time => {
      console.log(`   ${time}: ${slotsByTime[time].length} slots`)
    })

    // Define valid Vastral time slots (4:00-7:00 PM only)
    const validTimes = [
      '16:00-16:30', // 4:00-4:30 PM
      '16:30-17:00', // 4:30-5:00 PM
      '17:00-17:30', // 5:00-5:30 PM
      '17:30-18:00', // 5:30-6:00 PM
      '18:00-18:30', // 6:00-6:30 PM
      '18:30-19:00'  // 6:30-7:00 PM
    ]

    // Find invalid slots (not in 4:00-7:00 PM range)
    const invalidSlots = vastralSlots.filter(slot => {
      const timeKey = `${slot.startTime}-${slot.endTime}`
      return !validTimes.includes(timeKey)
    })

    console.log(`\n🔍 Found ${invalidSlots.length} invalid Vastral slots to remove`)

    if (invalidSlots.length > 0) {
      console.log('\n📋 Invalid slots to be removed:')
      const invalidTimeGroups = {}
      invalidSlots.forEach(slot => {
        const timeKey = `${slot.startTime}-${slot.endTime}`
        if (!invalidTimeGroups[timeKey]) {
          invalidTimeGroups[timeKey] = []
        }
        invalidTimeGroups[timeKey].push(slot)
      })

      Object.keys(invalidTimeGroups).forEach(time => {
        console.log(`   ${time}: ${invalidTimeGroups[time].length} slots`)
      })

      // Check if any of these slots have appointments
      const invalidSlotIds = invalidSlots.map(slot => slot._id)
      const appointmentsOnInvalidSlots = await Appointment.find({
        slot: { $in: invalidSlotIds }
      }).populate('patient', 'firstName lastName email')

      if (appointmentsOnInvalidSlots.length > 0) {
        console.log(`\n⚠️  WARNING: Found ${appointmentsOnInvalidSlots.length} appointments on invalid slots:`)
        appointmentsOnInvalidSlots.forEach((appointment, index) => {
          const slot = invalidSlots.find(s => s._id.toString() === appointment.slot.toString())
          console.log(`   ${index + 1}. ${appointment.patient?.firstName} ${appointment.patient?.lastName}`)
          console.log(`      Date: ${slot?.date?.toDateString()}, Time: ${appointment.appointmentTime}`)
          console.log(`      Service: ${appointment.service}`)
        })
        
        console.log('\n❌ Cannot remove slots with existing appointments.')
        console.log('💡 Please reschedule these appointments to valid time slots first.')
        return
      }

      // Remove invalid slots
      console.log('\n🗑️  Removing invalid Vastral slots...')
      const deleteResult = await Slot.deleteMany({
        _id: { $in: invalidSlotIds }
      })

      console.log(`✅ Removed ${deleteResult.deletedCount} invalid slots`)
    } else {
      console.log('\n✅ No invalid slots found to remove')
    }

    // Verify final state
    console.log('\n🔍 Final verification:')
    const remainingSlots = await Slot.find({ location: 'vastral' }).sort({ date: 1, startTime: 1 })
    
    const finalSlotsByTime = {}
    remainingSlots.forEach(slot => {
      const timeKey = `${slot.startTime}-${slot.endTime}`
      if (!finalSlotsByTime[timeKey]) {
        finalSlotsByTime[timeKey] = []
      }
      finalSlotsByTime[timeKey].push(slot)
    })

    console.log('\n📊 Remaining Vastral slots by time:')
    Object.keys(finalSlotsByTime).forEach(time => {
      console.log(`   ${time}: ${finalSlotsByTime[time].length} slots`)
    })

    // Show sample slots
    if (remainingSlots.length > 0) {
      console.log('\n📅 Sample remaining slots:')
      remainingSlots.slice(0, 5).forEach((slot, index) => {
        console.log(`   ${index + 1}. ${slot.date.toDateString()} ${slot.startTime}-${slot.endTime}`)
      })
    }

    console.log('\n✅ Vastral slot update completed!')
    console.log('📋 Summary:')
    console.log('   ✅ Vastral now operates 4:00-7:00 PM only (Mon-Sat)')
    console.log('   ✅ All invalid time slots removed')
    console.log('   ✅ Valid afternoon slots preserved')

  } catch (error) {
    console.error('❌ Update failed:', error)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Disconnected from MongoDB')
  }
}

// Run the update
updateVastralSlots()
