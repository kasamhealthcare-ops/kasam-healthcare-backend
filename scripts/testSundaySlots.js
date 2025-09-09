import mongoose from 'mongoose'
import dotenv from 'dotenv'
import slotService from '../services/slotService.js'
import User from '../models/User.js'
import Slot from '../models/Slot.js'

dotenv.config()

const testSundaySlots = async () => {
  try {
    console.log('🧪 Testing Sunday slot generation...')
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    // Find the doctor
    const doctor = await User.findOne({ role: 'doctor' })
    if (!doctor) {
      console.log('❌ No doctor found in database')
      return
    }

    console.log(`👨‍⚕️ Found doctor: ${doctor.firstName} ${doctor.lastName} (${doctor.email})`)

    // Test Sunday (day 0)
    const sundayDate = new Date('2025-06-29') // Sunday
    const dayOfWeek = sundayDate.getDay()
    console.log(`\n📅 Testing date: ${sundayDate.toDateString()} (Day of week: ${dayOfWeek})`)

    // Test each clinic on Sunday
    console.log('\n🏥 Testing each clinic on Sunday:')
    slotService.clinicLocations.forEach(clinic => {
      const timeSlots = slotService.getTimeSlotsForClinic(clinic.code, dayOfWeek)
      console.log(`\n   ${clinic.name} (${clinic.code}):`)
      console.log(`   Day of week: ${dayOfWeek}, Slots: ${timeSlots.length}`)
      
      if (timeSlots.length > 0) {
        timeSlots.forEach((slot, index) => {
          console.log(`   ${index + 1}. ${slot.start} - ${slot.end}`)
        })
      } else {
        console.log(`   CLOSED on Sunday`)
      }
    })

    // Try to manually create slots for Sunday
    console.log(`\n🔧 Manually creating slots for ${sundayDate.toDateString()}...`)
    
    // Get Gandhinagar time slots for Sunday
    const gandhinagarSlots = slotService.getTimeSlotsForClinic('gandhinagar', 0)
    console.log(`   Gandhinagar Sunday slots available: ${gandhinagarSlots.length}`)

    if (gandhinagarSlots.length > 0) {
      // Create slots manually
      const slotsToCreate = []
      
      for (const timeSlot of gandhinagarSlots) {
        // Check if slot already exists
        const existingSlot = await Slot.findOne({
          doctor: doctor._id,
          date: sundayDate,
          startTime: timeSlot.start,
          location: 'gandhinagar'
        })

        if (!existingSlot) {
          slotsToCreate.push({
            doctor: doctor._id,
            date: sundayDate,
            startTime: timeSlot.start,
            endTime: timeSlot.end,
            location: 'gandhinagar',
            notes: 'Gandhinagar Clinic - Sunday slots',
            isAvailable: true,
            isBooked: false,
            createdBy: doctor._id
          })
        }
      }

      if (slotsToCreate.length > 0) {
        const createdSlots = await Slot.insertMany(slotsToCreate)
        console.log(`   ✅ Created ${createdSlots.length} Sunday slots for Gandhinagar`)
        
        // Show created slots
        createdSlots.forEach((slot, index) => {
          console.log(`   ${index + 1}. ${slot.startTime} - ${slot.endTime}`)
        })
      } else {
        console.log(`   ℹ️  All Sunday slots already exist`)
      }
    }

    // Verify Sunday slots exist
    const sundaySlots = await Slot.find({
      date: sundayDate,
      location: 'gandhinagar'
    }).sort({ startTime: 1 })

    console.log(`\n📊 Total Sunday slots for Gandhinagar: ${sundaySlots.length}`)
    if (sundaySlots.length > 0) {
      console.log('📋 Sunday slots:')
      sundaySlots.forEach((slot, index) => {
        console.log(`   ${index + 1}. ${slot.startTime} - ${slot.endTime} (Available: ${slot.isAvailable})`)
      })
    }

    console.log('\n✅ Sunday slot test completed!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Disconnected from MongoDB')
  }
}

// Run the test
testSundaySlots()
