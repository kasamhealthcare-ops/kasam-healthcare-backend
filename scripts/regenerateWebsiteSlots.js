import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'
import Slot from '../models/Slot.js'

// Load environment variables
dotenv.config()

const regenerateWebsiteSlots = async () => {
  try {
    console.log('🚀 Regenerating slots based on your website schedule...')
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI)
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

    // Define clinic locations based on your website
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
        name: 'Paldi Clinic (Ellis Bridge)',
        address: 'B/5, Mahakant Complex, Ellis Bridge, Ahmedabad - 380006',
        code: 'paldi'
      }
    ]

    // Function to get time slots for each clinic (based on your website)
    const getTimeSlotsForClinic = (clinicCode) => {
      switch (clinicCode) {
        case 'ghodasar':
          return [
            // Morning slots: 7:00 AM to 8:30 AM
            { start: '07:00', end: '07:30' },
            { start: '07:30', end: '08:00' },
            { start: '08:00', end: '08:30' },
            // Afternoon slots: 1:00 PM to 2:00 PM
            { start: '13:00', end: '13:30' },
            { start: '13:30', end: '14:00' }
          ]

        case 'jashodanagar':
          return [
            // Morning slots: 9:00 AM to 12:00 PM
            { start: '09:00', end: '09:30' },
            { start: '09:30', end: '10:00' },
            { start: '10:00', end: '10:30' },
            { start: '10:30', end: '11:00' },
            { start: '11:00', end: '11:30' },
            { start: '11:30', end: '12:00' },
            // Evening slots: 8:30 PM to 10:30 PM
            { start: '20:30', end: '21:00' },
            { start: '21:00', end: '21:30' },
            { start: '21:30', end: '22:00' },
            { start: '22:00', end: '22:30' }
          ]

        case 'paldi':
          return [
            // Evening slots: 4:00 PM to 7:00 PM
            { start: '16:00', end: '16:30' },
            { start: '16:30', end: '17:00' },
            { start: '17:00', end: '17:30' },
            { start: '17:30', end: '18:00' },
            { start: '18:00', end: '18:30' },
            { start: '18:30', end: '19:00' }
          ]

        default:
          return []
      }
    }

    // Create slots for the next 30 days at ALL clinic locations
    const slotsToCreate = []
    const startDate = new Date()
    
    console.log(`\n📅 Creating slots for the next 30 days with website schedule...`)

    for (let i = 0; i < 30; i++) {
      const currentDate = new Date(startDate)
      currentDate.setDate(startDate.getDate() + i)
      currentDate.setHours(0, 0, 0, 0)
      
      // Skip Sundays (day 0) - clinic closed
      if (currentDate.getDay() === 0) {
        continue
      }

      // Create slots for ALL clinic locations every day
      for (const clinic of clinicLocations) {
        const timeSlots = getTimeSlotsForClinic(clinic.code)
        
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

      console.log(`\n📍 Slots created by clinic (based on your website):`)
      Object.entries(clinicCounts).forEach(([clinicCode, count]) => {
        const clinic = clinicLocations.find(c => c.code === clinicCode)
        const timeSlots = getTimeSlotsForClinic(clinicCode)
        console.log(`   - ${clinic.name}: ${count} slots (${timeSlots.length} slots per day)`)
      })

      console.log(`\n⏰ Time schedule per clinic:`)
      clinicLocations.forEach(clinic => {
        const timeSlots = getTimeSlotsForClinic(clinic.code)
        console.log(`\n   📍 ${clinic.name}:`)
        timeSlots.forEach(slot => {
          const startHour = parseInt(slot.start.split(':')[0])
          const endHour = parseInt(slot.end.split(':')[0])
          const period = startHour >= 12 ? 'PM' : 'AM'
          const displayStart = startHour > 12 ? `${startHour - 12}:${slot.start.split(':')[1]}` : slot.start
          const displayEnd = endHour > 12 ? `${endHour - 12}:${slot.end.split(':')[1]}` : slot.end
          console.log(`      ${displayStart} - ${displayEnd} ${period}`)
        })
      })
    }

    console.log(`\n🎉 Successfully regenerated slots matching your website schedule!`)
    console.log(`📍 All clinics now available every day with their specific time slots`)
    console.log(`🏥 Patients can book at any clinic location on any day`)

  } catch (error) {
    console.error('❌ Error regenerating slots:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Database connection closed')
    process.exit(0)
  }
}

// Run the script
regenerateWebsiteSlots()
