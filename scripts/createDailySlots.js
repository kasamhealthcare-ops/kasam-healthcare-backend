import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'
import Slot from '../models/Slot.js'

// Load environment variables
dotenv.config()

const createDailySlots = async () => {
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
      console.log('❌ No doctor/admin user found.')
      process.exit(1)
    }

    console.log(`👨‍⚕️ Found doctor: ${doctor.firstName} ${doctor.lastName} (${doctor.email})`)

    // Clear existing slots
    const deletedSlots = await Slot.deleteMany({ doctor: doctor._id })
    console.log(`🗑️  Deleted ${deletedSlots.deletedCount} existing slots`)

    // Define clinic locations based on your real clinics
    const clinicLocations = [
      {
        name: 'Ghodasar Clinic',
        address: 'R/1, Annapurna Society, Ghodasar, Ahmedabad - 380050',
        code: 'ghodasar'
      },
      {
        name: 'Vastral Clinic',
        address: 'Vastral Cross Road, Vastral, Ahmedabad - 382418',
        code: 'vastral'
      },
      {
        name: 'Gandhinagar Clinic',
        address: '122/2, Sector 4/A, Gandhinagar, Gujarat',
        code: 'gandhinagar'
      }
    ]

    // Create slots for the next 365 days (1 year)
    const slotsToCreate = []
    const startDate = new Date('2024-12-01') // Start from December 1, 2024

    for (let i = 0; i < 365; i++) {
      const currentDate = new Date(startDate)
      currentDate.setDate(startDate.getDate() + i)
      
      // Skip Sundays (day 0) - clinic closed
      if (currentDate.getDay() === 0) {
        continue
      }

      // Different schedules for different days
      let timeSlots = []
      
      if (currentDate.getDay() === 6) {
        // Saturday - shorter hours (15-minute intervals)
        timeSlots = [
          { start: '09:00', end: '09:15' },
          { start: '09:15', end: '09:30' },
          { start: '09:30', end: '09:45' },
          { start: '09:45', end: '10:00' },
          { start: '10:00', end: '10:15' },
          { start: '10:15', end: '10:30' },
          { start: '10:30', end: '10:45' },
          { start: '10:45', end: '11:00' },
          { start: '11:00', end: '11:15' },
          { start: '11:15', end: '11:30' },
          { start: '11:30', end: '11:45' },
          { start: '11:45', end: '12:00' }
        ]
      } else {
        // Monday to Friday - full schedule (15-minute intervals)
        timeSlots = [
          // Morning slots: 9:00 AM to 12:00 PM
          { start: '09:00', end: '09:15' },
          { start: '09:15', end: '09:30' },
          { start: '09:30', end: '09:45' },
          { start: '09:45', end: '10:00' },
          { start: '10:00', end: '10:15' },
          { start: '10:15', end: '10:30' },
          { start: '10:30', end: '10:45' },
          { start: '10:45', end: '11:00' },
          { start: '11:00', end: '11:15' },
          { start: '11:15', end: '11:30' },
          { start: '11:30', end: '11:45' },
          { start: '11:45', end: '12:00' },
          // Evening slots: 4:00 PM to 7:00 PM
          { start: '16:00', end: '16:15' },
          { start: '16:15', end: '16:30' },
          { start: '16:30', end: '16:45' },
          { start: '16:45', end: '17:00' },
          { start: '17:00', end: '17:15' },
          { start: '17:15', end: '17:30' },
          { start: '17:30', end: '17:45' },
          { start: '17:45', end: '18:00' },
          { start: '18:00', end: '18:15' },
          { start: '18:15', end: '18:30' },
          { start: '18:30', end: '18:45' },
          { start: '18:45', end: '19:00' }
        ]
      }

      // Create slots for ALL clinic locations every day
      for (const clinic of clinicLocations) {
        for (const timeSlot of timeSlots) {
          slotsToCreate.push({
            doctor: doctor._id,
            date: currentDate,
            startTime: timeSlot.start,
            endTime: timeSlot.end,
            location: clinic.code,
            notes: `${clinic.name} - ${clinic.address}`,
            isAvailable: true,
            isBooked: false,
            createdBy: doctor._id
          })
        }
      }
    }

    // Insert all slots
    if (slotsToCreate.length > 0) {
      await Slot.insertMany(slotsToCreate)
      console.log(`✅ Created ${slotsToCreate.length} new slots for the next 365 days`)
      
      // Show clinic distribution
      const clinicCounts = {}
      slotsToCreate.forEach(slot => {
        clinicCounts[slot.location] = (clinicCounts[slot.location] || 0) + 1
      })
      
      console.log(`\n📍 Slots by clinic:`)
      Object.entries(clinicCounts).forEach(([clinic, count]) => {
        const clinicInfo = clinicLocations.find(c => c.code === clinic)
        console.log(`   - ${clinicInfo.name}: ${count} slots`)
      })
    }

    // Show summary
    const totalSlots = await Slot.countDocuments({ doctor: doctor._id })
    console.log(`\n📊 Summary:`)
    console.log(`   Total slots created: ${totalSlots}`)
    console.log(`   All slots are available for booking`)
    console.log(`   Clinic closed on Sundays`)

  } catch (error) {
    console.error('❌ Error creating slots:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Database connection closed')
    process.exit(0)
  }
}

// Run script
createDailySlots()
