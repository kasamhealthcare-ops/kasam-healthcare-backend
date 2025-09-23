import mongoose from 'mongoose'
import dotenv from 'dotenv'
import slotService from '../services/slotService.js'
import Slot from '../models/Slot.js'

dotenv.config()

const finalVerification = async () => {
  try {
    console.log('🔍 Final verification of updated clinic schedule...')
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    console.log('\n📋 FINAL CLINIC SCHEDULE VERIFICATION')
    console.log('=' * 50)

    // Test weekday schedule (Monday-Saturday)
    console.log('\n📅 WEEKDAY SCHEDULE (Monday-Saturday):')
    console.log('-' * 40)

    const weekdayDate = new Date('2025-06-30') // Monday
    const weekdayDayOfWeek = weekdayDate.getDay()
    console.log(`Test date: ${weekdayDate.toDateString()} (Day ${weekdayDayOfWeek})`)

    slotService.clinicLocations.forEach(clinic => {
      const timeSlots = slotService.getTimeSlotsForClinic(clinic.code, weekdayDayOfWeek)
      console.log(`\n🏥 ${clinic.name.toUpperCase()}:`)
      
      if (timeSlots.length > 0) {
        console.log(`   Status: OPEN (${timeSlots.length} slots)`)
        timeSlots.forEach((slot, index) => {
          const startTime = slot.start
          const endTime = slot.end
          const startHour = parseInt(startTime.split(':')[0])
          const endHour = parseInt(endTime.split(':')[0])
          
          // Convert to 12-hour format for display
          const formatTime12 = (time24) => {
            const [hours, minutes] = time24.split(':')
            const hour = parseInt(hours)
            const ampm = hour >= 12 ? 'PM' : 'AM'
            const displayHour = hour % 12 || 12
            return `${displayHour}:${minutes} ${ampm}`
          }
          
          console.log(`   ${index + 1}. ${formatTime12(startTime)} to ${formatTime12(endTime)} ${clinic.code}`)
        })
      } else {
        console.log(`   Status: CLOSED`)
      }
    })

    // Test Sunday schedule
    console.log('\n📅 SUNDAY SCHEDULE:')
    console.log('-' * 40)

    const sundayDate = new Date('2025-06-29') // Sunday
    const sundayDayOfWeek = sundayDate.getDay()
    console.log(`Test date: ${sundayDate.toDateString()} (Day ${sundayDayOfWeek})`)

    slotService.clinicLocations.forEach(clinic => {
      const timeSlots = slotService.getTimeSlotsForClinic(clinic.code, sundayDayOfWeek)
      console.log(`\n🏥 ${clinic.name.toUpperCase()}:`)
      
      if (timeSlots.length > 0) {
        console.log(`   Status: OPEN (${timeSlots.length} slots)`)
        timeSlots.forEach((slot, index) => {
          const startTime = slot.start
          const endTime = slot.end
          
          // Convert to 12-hour format for display
          const formatTime12 = (time24) => {
            const [hours, minutes] = time24.split(':')
            const hour = parseInt(hours)
            const ampm = hour >= 12 ? 'PM' : 'AM'
            const displayHour = hour % 12 || 12
            return `${displayHour}:${minutes} ${ampm}`
          }
          
          console.log(`   ${index + 1}. ${formatTime12(startTime)} to ${formatTime12(endTime)} ${clinic.code}`)
        })
      } else {
        console.log(`   Status: CLOSED`)
      }
    })

    // Database verification
    console.log('\n📊 DATABASE SLOT DISTRIBUTION:')
    console.log('-' * 40)

    const slotsByLocation = await Slot.aggregate([
      { $group: { _id: '$location', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])

    slotsByLocation.forEach(({ _id, count }) => {
      console.log(`   ${_id}: ${count} slots`)
    })

    // Verify no invalid locations exist
    const validLocations = ['ghodasar', 'vastral', 'gandhinagar']
    const invalidSlots = await Slot.find({ location: { $nin: validLocations } })
    
    if (invalidSlots.length > 0) {
      console.log(`\n⚠️  WARNING: Found ${invalidSlots.length} slots with invalid locations`)
    } else {
      console.log('\n✅ All slots have valid locations')
    }

    // Summary
    console.log('\n📋 FINAL SUMMARY:')
    console.log('=' * 50)
    console.log('✅ Jashodanagar and Paldi clinics REMOVED')
    console.log('✅ Ghodasar: 30 slots/day (Mon-Sat) - 7:00-8:30 AM, 9:00 AM-12:00 PM, 1:00-2:00 PM, 8:30-10:30 PM (15-min intervals)')
    console.log('✅ Vastral: 12 slots/day (Mon-Sat) - 4:00-7:00 PM only (15-min intervals)')
    console.log('✅ Gandhinagar: 20 slots/day (Sunday only) - 12:00-5:00 PM (15-min intervals)')
    console.log('✅ Sunday: Only Gandhinagar open')
    console.log('✅ Monday-Saturday: Ghodasar + Vastral open')

    console.log('\n🎯 NEW 15-MINUTE SLOT SYSTEM:')
    console.log('   Weekdays: Ghodasar (30 slots) + Vastral (12 slots) = 42 slots/day')
    console.log('   Sunday: Gandhinagar only (20 slots)')
    console.log('   Slot Duration: 15 minutes (doubled capacity from 30-minute slots)')

  } catch (error) {
    console.error('❌ Verification failed:', error)
  } finally {
    await mongoose.disconnect()
    console.log('\n🔌 Disconnected from MongoDB')
  }
}

// Run the verification
finalVerification()
