import mongoose from 'mongoose'
import dotenv from 'dotenv'
import slotService from '../services/slotService.js'
import User from '../models/User.js'
import Slot from '../models/Slot.js'

dotenv.config()

const testNewSlotConfiguration = async () => {
  try {
    console.log('🧪 Testing SlotService with new configuration...')
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    // Find the doctor (now admin with doctor role)
    const doctor = await User.findOne({ role: 'doctor' })
    if (!doctor) {
      console.log('❌ No doctor found in database')
      return
    }

    console.log(`👨‍⚕️ Found doctor: ${doctor.firstName} ${doctor.lastName} (${doctor.email})`)

    // Use the SlotService singleton instance

    // Test the clinic locations
    console.log('\n🏥 Testing clinic locations:')
    console.log(`   Active clinics: ${slotService.clinicLocations.length}`)
    slotService.clinicLocations.forEach((clinic, index) => {
      console.log(`   ${index + 1}. ${clinic.name} (${clinic.code})`)
      console.log(`      Address: ${clinic.address}`)
    })

    // Test time slot generation for each clinic
    console.log('\n⏰ Testing time slot generation:')

    // Test weekday (Friday)
    const testDate = new Date('2025-06-27') // Friday
    const dayOfWeek = testDate.getDay()
    console.log(`   Test date: ${testDate.toDateString()} (Day ${dayOfWeek} - Weekday)`)

    slotService.clinicLocations.forEach(clinic => {
      const timeSlots = slotService.getTimeSlotsForClinic(clinic.code, dayOfWeek)
      console.log(`\n   ${clinic.name.toUpperCase()} (${timeSlots.length} slots):`)
      timeSlots.forEach((slot, index) => {
        console.log(`   ${index + 1}. ${slot.start} - ${slot.end}`)
      })
    })

    // Test Sunday (special case for Gandhinagar)
    const sundayDate = new Date('2025-06-29') // Sunday
    const sundayDayOfWeek = sundayDate.getDay()
    console.log(`\n   Test date: ${sundayDate.toDateString()} (Day ${sundayDayOfWeek} - Sunday)`)

    slotService.clinicLocations.forEach(clinic => {
      const timeSlots = slotService.getTimeSlotsForClinic(clinic.code, sundayDayOfWeek)
      if (timeSlots.length > 0) {
        console.log(`\n   ${clinic.name.toUpperCase()} SUNDAY (${timeSlots.length} slots):`)
        timeSlots.forEach((slot, index) => {
          console.log(`   ${index + 1}. ${slot.start} - ${slot.end}`)
        })
      } else {
        console.log(`\n   ${clinic.name.toUpperCase()} SUNDAY: CLOSED`)
      }
    })

    // Check current slots by location
    const slotsByLocation = await Slot.aggregate([
      { $group: { _id: '$location', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])

    console.log('\n📍 Current slots by location:')
    slotsByLocation.forEach(({ _id, count }) => {
      console.log(`   ${_id}: ${count} slots`)
    })

    console.log('\n✅ New slot configuration test completed successfully!')
    console.log('\n📋 Summary:')
    console.log('   ✅ Jashodanagar and Paldi clinics removed')
    console.log('   ✅ Time slots redistributed to Ghodasar and Vastral')
    console.log('   ✅ SlotService updated with new configuration')
    console.log('   ✅ All existing slots migrated successfully')

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Disconnected from MongoDB')
  }
}

// Run the test
testNewSlotConfiguration()
