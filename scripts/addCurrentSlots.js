import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'
import Slot from '../models/Slot.js'

// Load environment variables
dotenv.config()

const addCurrentSlots = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI)
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

    console.log(`👨‍⚕️ Found doctor: ${doctor.firstName} ${doctor.lastName} (${doctor.email})`)

    // Get current date and add slots for the next 30 days
    const today = new Date()
    const slotsToCreate = []

    for (let i = 0; i < 30; i++) {
      const currentDate = new Date(today)
      currentDate.setDate(today.getDate() + i)
      
      // Skip Sundays (day 0)
      if (currentDate.getDay() === 0) {
        continue
      }

      // Morning slots: 9:00 AM to 12:00 PM
      const morningSlots = [
        { start: '09:00', end: '09:30' },
        { start: '09:30', end: '10:00' },
        { start: '10:00', end: '10:30' },
        { start: '10:30', end: '11:00' },
        { start: '11:00', end: '11:30' },
        { start: '11:30', end: '12:00' }
      ]

      // Evening slots: 4:00 PM to 7:00 PM
      const eveningSlots = [
        { start: '16:00', end: '16:30' },
        { start: '16:30', end: '17:00' },
        { start: '17:00', end: '17:30' },
        { start: '17:30', end: '18:00' },
        { start: '18:00', end: '18:30' },
        { start: '18:30', end: '19:00' }
      ]

      const allSlots = [...morningSlots, ...eveningSlots]

      for (const timeSlot of allSlots) {
        // Check if slot already exists
        const existingSlot = await Slot.findOne({
          doctor: doctor._id,
          date: currentDate,
          startTime: timeSlot.start
        })

        if (!existingSlot) {
          slotsToCreate.push({
            doctor: doctor._id,
            date: currentDate,
            startTime: timeSlot.start,
            endTime: timeSlot.end,
            location: 'clinic',
            isAvailable: true,
            isBooked: false,
            createdBy: doctor._id
          })
        }
      }
    }

    if (slotsToCreate.length > 0) {
      await Slot.insertMany(slotsToCreate)
      console.log(`✅ Created ${slotsToCreate.length} new slots for the next 30 days`)
    } else {
      console.log('ℹ️  All slots already exist for the next 30 days')
    }

    // Show summary
    const totalSlots = await Slot.countDocuments({ doctor: doctor._id })
    const availableSlots = await Slot.countDocuments({ 
      doctor: doctor._id, 
      isAvailable: true, 
      isBooked: false 
    })
    
    console.log(`\n📊 Summary:`)
    console.log(`   Total slots: ${totalSlots}`)
    console.log(`   Available slots: ${availableSlots}`)
    console.log(`   Booked slots: ${totalSlots - availableSlots}`)

  } catch (error) {
    console.error('❌ Error adding slots:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Database connection closed')
    process.exit(0)
  }
}

// Run script
addCurrentSlots()
