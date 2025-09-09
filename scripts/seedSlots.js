import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'
import Slot from '../models/Slot.js'

// Load environment variables
dotenv.config()

const seedSlots = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    console.log('✅ Connected to MongoDB')

    // Find the doctor/admin user
    const doctor = await User.findOne({ 
      role: { $in: ['admin', 'doctor'] }, 
      isActive: true 
    })

    if (!doctor) {
      console.log('❌ No doctor/admin user found. Please create a doctor user first.')
      process.exit(1)
    }

    console.log(`👨‍⚕️ Found doctor: ${doctor.firstName} ${doctor.lastName}`)

    // Clear existing slots
    await Slot.deleteMany({})
    console.log('🗑️  Cleared existing slots')

    // Create slots for the next 7 days
    const today = new Date()
    const slots = []

    for (let i = 1; i <= 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      
      // Skip Sundays (day 0)
      if (date.getDay() === 0) continue

      // Morning slots (Ghodasar clinic)
      const morningSlots = [
        { start: '07:00', end: '07:30', location: 'clinic' },
        { start: '07:30', end: '08:00', location: 'clinic' },
        { start: '08:00', end: '08:30', location: 'clinic' },
        { start: '08:30', end: '09:00', location: 'clinic' }
      ]

      // Evening slots (Jashodanagar clinic)
      const eveningSlots = [
        { start: '09:00', end: '09:30', location: 'clinic' },
        { start: '09:30', end: '10:00', location: 'clinic' },
        { start: '10:00', end: '10:30', location: 'clinic' },
        { start: '10:30', end: '11:00', location: 'clinic' },
        { start: '11:00', end: '11:30', location: 'clinic' }
      ]

      // Afternoon slots (Ellis Bridge clinic)
      const afternoonSlots = [
        { start: '16:00', end: '16:30', location: 'clinic' },
        { start: '16:30', end: '17:00', location: 'clinic' },
        { start: '17:00', end: '17:30', location: 'clinic' },
        { start: '17:30', end: '18:00', location: 'clinic' },
        { start: '18:00', end: '18:30', location: 'clinic' },
        { start: '18:30', end: '19:00', location: 'clinic' }
      ]

      // Combine all slots for the day
      const daySlots = [...morningSlots, ...eveningSlots, ...afternoonSlots]

      // Create slot documents
      for (const slotTime of daySlots) {
        slots.push({
          doctor: doctor._id,
          date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          startTime: slotTime.start,
          endTime: slotTime.end,
          location: slotTime.location,
          isAvailable: true,
          isBooked: false,
          createdBy: doctor._id
        })
      }
    }

    // Insert slots
    await Slot.insertMany(slots)
    console.log(`✅ Created ${slots.length} time slots for the next 7 days`)

    // Display summary
    const slotsByDate = {}
    slots.forEach(slot => {
      const dateKey = slot.date.toDateString()
      if (!slotsByDate[dateKey]) {
        slotsByDate[dateKey] = 0
      }
      slotsByDate[dateKey]++
    })

    console.log('\n📅 Slots created by date:')
    Object.entries(slotsByDate).forEach(([date, count]) => {
      console.log(`   ${date}: ${count} slots`)
    })

    console.log('\n🎉 Slot seeding completed successfully!')
    
  } catch (error) {
    console.error('❌ Error seeding slots:', error)
  } finally {
    await mongoose.connection.close()
    console.log('🔌 Database connection closed')
    process.exit(0)
  }
}

// Run the seeding script
seedSlots()
