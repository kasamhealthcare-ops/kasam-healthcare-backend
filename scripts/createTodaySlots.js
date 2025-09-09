import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Slot from '../models/Slot.js'
import User from '../models/User.js'

// Load environment variables
dotenv.config()

const createTodaySlots = async () => {
  try {
    console.log('🆕 Creating slots for today to test filtering...')
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kasam-healthcare')
    console.log('✅ Connected to MongoDB')

    // Find the doctor
    const doctor = await User.findOne({ role: 'admin' })
    if (!doctor) {
      console.log('❌ Doctor not found!')
      return
    }

    console.log(`✅ Found doctor: Dr. ${doctor.firstName} ${doctor.lastName}`)

    // Get today's date
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    console.log(`📅 Creating slots for: ${today.toDateString()}`)

    // Delete existing slots for today to avoid duplicates
    await Slot.deleteMany({
      doctor: doctor._id,
      date: today
    })
    console.log('🗑️ Cleared existing slots for today')

    // Create slots for today - some in the past, some in the future
    const currentHour = new Date().getHours()
    const currentMinute = new Date().getMinutes()
    
    console.log(`⏰ Current time: ${currentHour}:${currentMinute.toString().padStart(2, '0')}`)

    const slotsToCreate = [
      // Past slots (should be filtered out)
      { startTime: '09:00', endTime: '09:30' },
      { startTime: '10:00', endTime: '10:30' },
      { startTime: '11:00', endTime: '11:30' },
      { startTime: '14:00', endTime: '14:30' },
      { startTime: '15:00', endTime: '15:30' },
      
      // Future slots (should be shown)
      { startTime: '17:00', endTime: '17:30' },
      { startTime: '18:00', endTime: '18:30' },
      { startTime: '19:00', endTime: '19:30' },
      { startTime: '20:00', endTime: '20:30' },
    ]

    const createdSlots = []
    
    for (const slotData of slotsToCreate) {
      const [hours, minutes] = slotData.startTime.split(':').map(Number)
      const slotTimeInMinutes = hours * 60 + minutes
      const currentTimeInMinutes = currentHour * 60 + currentMinute
      
      const isPast = slotTimeInMinutes <= currentTimeInMinutes
      
      const slot = new Slot({
        doctor: doctor._id,
        date: today,
        startTime: slotData.startTime,
        endTime: slotData.endTime,
        duration: 30,
        isAvailable: true,
        isBooked: false,
        createdBy: doctor._id
      })

      await slot.save()
      createdSlots.push(slot)
      
      console.log(`${isPast ? '⏮️' : '⏭️'} Created ${isPast ? 'PAST' : 'FUTURE'} slot: ${slotData.startTime} - ${slotData.endTime}`)
    }

    console.log(`\n✅ Created ${createdSlots.length} slots for today`)
    
    // Summary
    const pastSlots = createdSlots.filter(slot => {
      const [hours, minutes] = slot.startTime.split(':').map(Number)
      const slotTimeInMinutes = hours * 60 + minutes
      const currentTimeInMinutes = currentHour * 60 + currentMinute
      return slotTimeInMinutes <= currentTimeInMinutes
    })
    
    const futureSlots = createdSlots.filter(slot => {
      const [hours, minutes] = slot.startTime.split(':').map(Number)
      const slotTimeInMinutes = hours * 60 + minutes
      const currentTimeInMinutes = currentHour * 60 + currentMinute
      return slotTimeInMinutes > currentTimeInMinutes
    })

    console.log(`\n📊 Summary:`)
    console.log(`   Total slots created: ${createdSlots.length}`)
    console.log(`   Past slots (should be filtered): ${pastSlots.length}`)
    console.log(`   Future slots (should be shown): ${futureSlots.length}`)
    
    console.log(`\n🧪 Now test the filtering by visiting the appointment booking page`)
    console.log(`   or by calling the API: GET /api/slots/available?date=${today.toISOString().split('T')[0]}&doctor=${doctor._id}`)

  } catch (error) {
    console.error('❌ Error creating today slots:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Database connection closed')
    process.exit(0)
  }
}

// Run the script
createTodaySlots()
