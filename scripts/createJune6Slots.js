import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Slot from '../models/Slot.js'
import User from '../models/User.js'

// Load environment variables
dotenv.config()

const createJune6Slots = async () => {
  try {
    console.log('🆕 Creating proper slots for June 6th, 2025...')
    
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

    // June 6th, 2025 is a Friday
    const targetDate = new Date('2025-06-06')
    targetDate.setHours(0, 0, 0, 0)
    const dayOfWeek = targetDate.getDay() // 5 = Friday
    
    console.log(`📅 Target date: ${targetDate.toDateString()} (Friday)`)

    // Clear existing slots for this date
    const deletedSlots = await Slot.deleteMany({
      doctor: doctor._id,
      date: targetDate
    })
    console.log(`🗑️ Deleted ${deletedSlots.deletedCount} existing slots`)

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

    // Get clinic for Friday (should be Jasodanagar)
    let assignedClinic
    if (dayOfWeek === 1 || dayOfWeek === 4) { // Monday, Thursday
      assignedClinic = clinicLocations[0] // Ghodasar
    } else if (dayOfWeek === 2 || dayOfWeek === 5) { // Tuesday, Friday
      assignedClinic = clinicLocations[1] // Jasodanagar
    } else { // Wednesday, Saturday, Sunday
      assignedClinic = clinicLocations[2] // Ellis Bridge
    }

    console.log(`🏥 Assigned clinic: ${assignedClinic.name} (${assignedClinic.code})`)

    // Define time slots for Friday (regular weekday)
    const timeSlots = [
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

    // Create slots
    const slotsToCreate = []
    for (const timeSlot of timeSlots) {
      slotsToCreate.push({
        doctor: doctor._id,
        date: targetDate,
        startTime: timeSlot.start,
        endTime: timeSlot.end,
        location: assignedClinic.code,
        notes: `${assignedClinic.name} - ${assignedClinic.address}`,
        isAvailable: true,
        isBooked: false,
        createdBy: doctor._id
      })
    }

    // Insert slots
    const createdSlots = await Slot.insertMany(slotsToCreate)
    console.log(`✅ Created ${createdSlots.length} slots for June 6th, 2025`)

    // Display created slots
    console.log(`\n📋 Created slots at ${assignedClinic.name}:`)
    createdSlots.forEach((slot, index) => {
      console.log(`   ${index + 1}. ${slot.startTime} - ${slot.endTime}`)
    })

    console.log(`\n🎉 June 6th, 2025 now has proper slots at ${assignedClinic.name}!`)
    console.log(`   Patients can now book appointments at the correct clinic location.`)

  } catch (error) {
    console.error('❌ Error creating June 6th slots:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Database connection closed')
    process.exit(0)
  }
}

// Run the script
createJune6Slots()
