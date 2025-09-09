import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'
import Slot from '../models/Slot.js'

// Load environment variables
dotenv.config()

const regenerateAllClinicsSlots = async () => {
  try {
    console.log('🚀 Regenerating slots for ALL clinic locations...')
    
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

    // Clear ALL existing slots
    const deletedSlots = await Slot.deleteMany({ doctor: doctor._id })
    console.log(`🗑️  Deleted ${deletedSlots.deletedCount} existing slots`)

    // Define clinic locations
    const clinicLocations = [
      {
        name: 'Ghodasar Clinic',
        address: 'R/1, Annapurna Society, Ghodasar, Ahmedabad - 380050',
        code: 'ghodasar'
      },
      {
        name: 'Jashodanagar Clinic',
        address: '46, Heemapark Society, Jashodanagar, Ahmedabad - 380026',
        code: 'jashodanagar'
      },
      {
        name: 'Ellis Bridge Clinic',
        address: 'B/5, Mahakant Complex, Ellis Bridge, Ahmedabad - 380006',
        code: 'ellis_bridge'
      }
    ]

    // Function to get time slots for a day
    const getTimeSlots = (dayOfWeek) => {
      if (dayOfWeek === 6) {
        // Saturday - shorter hours
        return [
          { start: '09:00', end: '09:30' },
          { start: '09:30', end: '10:00' },
          { start: '10:00', end: '10:30' },
          { start: '10:30', end: '11:00' },
          { start: '11:00', end: '11:30' },
          { start: '11:30', end: '12:00' }
        ]
      } else {
        // Monday to Friday - full schedule
        return [
          // Morning slots: 9:00 AM to 12:00 PM
          { start: '09:00', end: '09:30' },
          { start: '09:30', end: '10:00' },
          { start: '10:00', end: '10:30' },
          { start: '10:30', end: '11:00' },
          { start: '11:00', end: '11:30' },
          { start: '11:30', end: '12:00' },
          // Evening slots: 4:00 PM to 7:00 PM
          { start: '16:00', end: '16:30' },
          { start: '16:30', end: '17:00' },
          { start: '17:00', end: '17:30' },
          { start: '17:30', end: '18:00' },
          { start: '18:00', end: '18:30' },
          { start: '18:30', end: '19:00' }
        ]
      }
    }

    // Create slots for the next 30 days at ALL clinic locations
    const slotsToCreate = []
    const startDate = new Date()
    
    console.log(`\n📅 Creating slots for the next 30 days at ALL clinics...`)

    for (let i = 0; i < 30; i++) {
      const currentDate = new Date(startDate)
      currentDate.setDate(startDate.getDate() + i)
      currentDate.setHours(0, 0, 0, 0)
      
      // Skip Sundays (day 0) - clinic closed
      if (currentDate.getDay() === 0) {
        continue
      }

      const timeSlots = getTimeSlots(currentDate.getDay())
      
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
      console.log(`✅ Created ${slotsToCreate.length} slots for the next 30 days`)

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

      // Show daily breakdown
      const dailyCounts = {}
      slotsToCreate.forEach(slot => {
        const dateKey = slot.date.toDateString()
        dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1
      })

      console.log(`\n📅 Sample daily slot distribution:`)
      Object.entries(dailyCounts).slice(0, 5).forEach(([date, count]) => {
        console.log(`   ${date}: ${count} slots (across all clinics)`)
      })
    }

    console.log(`\n🎉 Successfully regenerated slots with NEW multi-clinic system!`)
    console.log(`📍 All clinics now available every day (Monday-Saturday)`)
    console.log(`🏥 Patients can now book at any clinic location on any day`)

  } catch (error) {
    console.error('❌ Error regenerating slots:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Database connection closed')
    process.exit(0)
  }
}

// Run the script
regenerateAllClinicsSlots()
