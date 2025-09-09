import mongoose from 'mongoose'
import dotenv from 'dotenv'
import slotService from '../services/slotService.js'
import User from '../models/User.js'
import Slot from '../models/Slot.js'

dotenv.config()

const generateSundaySlots = async () => {
  try {
    console.log('📅 Generating Sunday slots for Gandhinagar clinic...')
    
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

    // Generate slots for the next few Sundays
    const today = new Date()
    const sundays = []
    
    // Find the next 4 Sundays
    for (let i = 0; i < 28; i++) { // Check next 4 weeks
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      if (date.getDay() === 0) { // Sunday
        sundays.push(new Date(date))
      }
    }

    console.log(`\n📅 Found ${sundays.length} upcoming Sundays:`)
    sundays.forEach((sunday, index) => {
      console.log(`   ${index + 1}. ${sunday.toDateString()}`)
    })

    let totalCreated = 0

    // Generate slots for each Sunday
    for (const sunday of sundays) {
      console.log(`\n🔄 Creating slots for ${sunday.toDateString()}...`)
      
      // Check if slots already exist for this Sunday
      const existingSlots = await Slot.find({
        doctor: doctor._id,
        date: sunday,
        location: 'gandhinagar'
      })

      if (existingSlots.length > 0) {
        console.log(`   ⚠️  ${existingSlots.length} slots already exist for this Sunday`)
        continue
      }

      // Create slots using the slot service
      const createdSlots = await slotService.createSlotsForDate(sunday, doctor)
      console.log(`   ✅ Created ${createdSlots.length} slots`)
      
      // Show the created slots
      const sundaySlots = createdSlots.filter(slot => slot.location === 'gandhinagar')
      if (sundaySlots.length > 0) {
        console.log(`   📋 Gandhinagar Sunday slots:`)
        sundaySlots.forEach((slot, index) => {
          console.log(`      ${index + 1}. ${slot.startTime} - ${slot.endTime}`)
        })
      }

      totalCreated += createdSlots.length
    }

    // Verify Sunday slots
    console.log('\n🔍 Verifying Sunday slots...')
    const allSundaySlots = await Slot.find({
      location: 'gandhinagar',
      $expr: {
        $eq: [{ $dayOfWeek: '$date' }, 1] // MongoDB Sunday is 1
      }
    }).sort({ date: 1, startTime: 1 })

    console.log(`\n📊 Total Gandhinagar Sunday slots in database: ${allSundaySlots.length}`)
    
    if (allSundaySlots.length > 0) {
      console.log('\n📅 Sample Sunday slots:')
      allSundaySlots.slice(0, 10).forEach((slot, index) => {
        console.log(`   ${index + 1}. ${slot.date.toDateString()} ${slot.startTime}-${slot.endTime}`)
      })
    }

    console.log(`\n✅ Sunday slot generation completed! Created ${totalCreated} new slots.`)

  } catch (error) {
    console.error('❌ Sunday slot generation failed:', error)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Disconnected from MongoDB')
  }
}

// Run the generation
generateSundaySlots()
