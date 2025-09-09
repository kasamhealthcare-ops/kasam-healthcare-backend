import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Slot from '../models/Slot.js'
import User from '../models/User.js'

// Load environment variables
dotenv.config()

const createWeeklySlots = async () => {
  try {
    console.log('📅 Creating slots for the next 7 days with proper clinic assignments...')
    
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

    // Define clinic locations
    const clinicLocations = [
      {
        code: 'ghodasar',
        name: 'Ghodasar Clinic',
        address: 'R/1, Annapurna Society, Ghodasar, Ahmedabad - 380050'
      },
      {
        code: 'jashodanagar',
        name: 'Jashodanagar Clinic',
        address: '46, Heemapark Society, Jashodanagar, Ahmedabad - 380026'
      },
      {
        code: 'ellis_bridge',
        name: 'Ellis Bridge Clinic',
        address: 'B/5, Mahakant Complex, Ellis Bridge, Ahmedabad - 380006'
      }
    ]

    // All clinics are available every day
    const getAllClinics = () => {
      return clinicLocations
    }

    // Function to get time slots for a day
    const getTimeSlots = (dayOfWeek) => {
      if (dayOfWeek === 6) { // Saturday - shorter hours
        return [
          { start: '09:00', end: '09:30' },
          { start: '09:30', end: '10:00' },
          { start: '10:00', end: '10:30' },
          { start: '10:30', end: '11:00' },
          { start: '11:00', end: '11:30' },
          { start: '11:30', end: '12:00' }
        ]
      } else if (dayOfWeek === 0) { // Sunday - closed
        return []
      } else { // Monday to Friday - regular hours
        return [
          { start: '09:00', end: '09:30' },
          { start: '09:30', end: '10:00' },
          { start: '10:00', end: '10:30' },
          { start: '10:30', end: '11:00' },
          { start: '11:00', end: '11:30' },
          { start: '11:30', end: '12:00' },
          { start: '14:00', end: '14:30' },
          { start: '14:30', end: '15:00' },
          { start: '15:00', end: '15:30' },
          { start: '15:30', end: '16:00' },
          { start: '16:00', end: '16:30' },
          { start: '16:30', end: '17:00' },
          { start: '17:00', end: '17:30' },
          { start: '17:30', end: '18:00' },
          { start: '18:00', end: '18:30' },
          { start: '18:30', end: '19:00' },
          { start: '19:00', end: '19:30' },
          { start: '19:30', end: '20:00' }
        ]
      }
    }

    const today = new Date()
    const slotsToCreate = []
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    console.log('\n📅 Planning slots for the next 7 days:')

    // Create slots for the next 7 days at ALL clinic locations
    for (let i = 0; i < 7; i++) {
      const targetDate = new Date(today)
      targetDate.setDate(today.getDate() + i)
      targetDate.setHours(0, 0, 0, 0)

      const dayOfWeek = targetDate.getDay()
      const dayName = dayNames[dayOfWeek]
      const allClinics = getAllClinics()
      const timeSlots = getTimeSlots(dayOfWeek)

      console.log(`   ${targetDate.toDateString()} (${dayName}): All clinics - ${timeSlots.length} slots each`)

      // Delete existing slots for this date
      await Slot.deleteMany({
        doctor: doctor._id,
        date: targetDate
      })

      // Create new slots for each clinic
      for (const clinic of allClinics) {
        for (const timeSlot of timeSlots) {
          slotsToCreate.push({
            doctor: doctor._id,
            date: targetDate,
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
      console.log(`\n✅ Created ${slotsToCreate.length} slots for the next 7 days`)

      // Show distribution by clinic
      const clinicCounts = {}
      slotsToCreate.forEach(slot => {
        clinicCounts[slot.location] = (clinicCounts[slot.location] || 0) + 1
      })

      console.log(`\n📍 Slots by clinic:`)
      Object.entries(clinicCounts).forEach(([clinicCode, count]) => {
        const clinic = clinicLocations.find(c => c.code === clinicCode)
        console.log(`   - ${clinic.name}: ${count} slots`)
      })
    }

    console.log(`\n📅 Daily clinic availability:`)
    console.log(`   Monday - Saturday: All clinics available`)
    console.log(`   - Ghodasar Clinic`)
    console.log(`   - Jasodanagar Clinic`)
    console.log(`   - Ellis Bridge Clinic`)
    console.log(`   Sunday: Closed`)

    console.log(`\n🎉 All slots created at all clinic locations!`)

  } catch (error) {
    console.error('❌ Error creating weekly slots:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Database connection closed')
    process.exit(0)
  }
}

// Run the script
createWeeklySlots()
