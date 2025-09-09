import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'
import Slot from '../models/Slot.js'

// Load environment variables
dotenv.config()

const generateJune2025Slots = async () => {
  try {
    console.log('🚀 Generating slots for June 2025...')
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://kasam_admin:kasamhealthcare@kasam-admin.znwc1gv.mongodb.net/kasam_healthcare?retryWrites=true&w=majority&appName=kasam-admin'
    await mongoose.connect(mongoUri)
    console.log('✅ Connected to MongoDB')

    // Find the doctor
    const doctor = await User.findOne({ 
      role: { $in: ['admin', 'doctor'] }, 
      isActive: true 
    })
    
    if (!doctor) {
      console.log('❌ No doctor/admin user found!')
      return
    }

    console.log(`👨‍⚕️ Found doctor: ${doctor.firstName} ${doctor.lastName} (${doctor.email})`)

    // Define clinic locations (matching the SlotService)
    const clinicLocations = [
      {
        code: 'ghodasar',
        name: 'Ghodasar Clinic',
        address: 'R/1, Annapurna Society, Ghodasar, Ahmedabad - 380050'
      },
      {
        code: 'vastral',
        name: 'Vastral Clinic',
        address: 'Vastral Cross Road, Vastral, Ahmedabad - 382418'
      },
      {
        code: 'gandhinagar',
        name: 'Gandhinagar Clinic',
        address: '122/2, Sector 4/A, Gandhinagar, Gujarat'
      }
    ]

    // Function to get time slots for a specific clinic and day
    const getTimeSlotsForClinic = (clinicCode, dayOfWeek) => {
      // Special handling for Sundays - only Gandhinagar is open
      if (dayOfWeek === 0) {
        if (clinicCode === 'gandhinagar') {
          return [
            // Sunday slots: 12:00 PM to 5:00 PM
            { start: '12:00', end: '12:30' },
            { start: '12:30', end: '13:00' },
            { start: '13:00', end: '13:30' },
            { start: '13:30', end: '14:00' },
            { start: '14:00', end: '14:30' },
            { start: '14:30', end: '15:00' },
            { start: '15:00', end: '15:30' },
            { start: '15:30', end: '16:00' },
            { start: '16:00', end: '16:30' },
            { start: '16:30', end: '17:00' }
          ]
        }
        // Other clinics (Ghodasar, Vastral) are closed on Sunday
        return []
      }

      switch (clinicCode) {
        case 'ghodasar':
          return [
            // Morning slots: 7:00 AM to 8:30 AM
            { start: '07:00', end: '07:30' },
            { start: '07:30', end: '08:00' },
            { start: '08:00', end: '08:30' },
            // Extended morning slots: 9:00 AM to 12:00 PM
            { start: '09:00', end: '09:30' },
            { start: '09:30', end: '10:00' },
            { start: '10:00', end: '10:30' },
            { start: '10:30', end: '11:00' },
            { start: '11:00', end: '11:30' },
            { start: '11:30', end: '12:00' },
            // Afternoon slots: 1:00 PM to 2:00 PM
            { start: '13:00', end: '13:30' },
            { start: '13:30', end: '14:00' },
            // Evening slots: 8:30 PM to 10:30 PM
            { start: '20:30', end: '21:00' },
            { start: '21:00', end: '21:30' },
            { start: '21:30', end: '22:00' },
            { start: '22:00', end: '22:30' }
          ]

        case 'vastral':
          return [
            // Afternoon slots: 4:00 PM to 7:00 PM
            { start: '16:00', end: '16:30' },
            { start: '16:30', end: '17:00' },
            { start: '17:00', end: '17:30' },
            { start: '17:30', end: '18:00' },
            { start: '18:00', end: '18:30' },
            { start: '18:30', end: '19:00' }
          ]

        case 'gandhinagar':
          // Gandhinagar is ONLY open on Sundays, closed on weekdays
          return []

        default:
          return []
      }
    }

    // Generate slots for June 2025 (1-30)
    const slotsToCreate = []
    const year = 2025
    const month = 5 // June (0-indexed)
    
    console.log(`\n📅 Creating slots for June 2025...`)

    for (let day = 1; day <= 30; day++) {
      const currentDate = new Date(Date.UTC(year, month, day))
      const dayOfWeek = currentDate.getDay()
      
      // Note: Sundays are now supported for Gandhinagar clinic only

      console.log(`   Processing ${currentDate.toDateString()} (Day ${dayOfWeek})`)
      
      // Create slots for each clinic location with their specific time slots
      for (const clinic of clinicLocations) {
        const timeSlots = getTimeSlotsForClinic(clinic.code, dayOfWeek)

        for (const timeSlot of timeSlots) {
          // Check if slot already exists for this clinic and time
          const existingSlot = await Slot.findOne({
            doctor: doctor._id,
            date: currentDate,
            startTime: timeSlot.start,
            location: clinic.code
          })

          if (!existingSlot) {
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
    }

    // Insert all slots
    if (slotsToCreate.length > 0) {
      await Slot.insertMany(slotsToCreate)
      console.log(`✅ Created ${slotsToCreate.length} slots for June 2025`)

      // Show distribution by clinic
      const clinicCounts = {}
      slotsToCreate.forEach(slot => {
        clinicCounts[slot.location] = (clinicCounts[slot.location] || 0) + 1
      })

      console.log(`\n📍 Slots created by clinic:`)
      Object.entries(clinicCounts).forEach(([clinicCode, count]) => {
        const clinic = clinicLocations.find(c => c.code === clinicCode)
        console.log(`   - ${clinic.name}: ${count} slots`)
      })

      // Verify June 5, 2025 specifically
      const june5Date = new Date(Date.UTC(2025, 5, 5))
      const june5Slots = await Slot.find({
        doctor: doctor._id,
        date: june5Date,
        isAvailable: true
      }).sort({ startTime: 1 })

      console.log(`\n🎯 Verification - June 5, 2025 slots:`)
      console.log(`   Found ${june5Slots.length} slots for June 5, 2025`)
      june5Slots.forEach(slot => {
        console.log(`   - ${slot.startTime}-${slot.endTime} at ${slot.location}`)
      })

    } else {
      console.log(`ℹ️  All slots already exist for June 2025`)
    }

    console.log(`\n🎉 Successfully generated slots for June 2025!`)
    console.log(`📅 June 5, 2025 should now have available slots`)

  } catch (error) {
    console.error('❌ Error generating June 2025 slots:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Database connection closed')
    process.exit(0)
  }
}

// Run the script
generateJune2025Slots()
