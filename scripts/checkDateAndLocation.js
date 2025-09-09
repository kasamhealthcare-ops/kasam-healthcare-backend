import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Slot from '../models/Slot.js'
import User from '../models/User.js'

// Load environment variables
dotenv.config()

const checkDateAndLocation = async () => {
  try {
    console.log('📅 Checking date and location assignment...')
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kasam-healthcare')
    console.log('✅ Connected to MongoDB')

    // Check what day June 6th, 2025 is
    const testDate = new Date('2025-06-06')
    const dayOfWeek = testDate.getDay() // 0 = Sunday, 1 = Monday, etc.
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    
    console.log(`\n📅 Date: June 6th, 2025`)
    console.log(`📅 Day of week: ${dayNames[dayOfWeek]} (${dayOfWeek})`)
    
    // Show the clinic assignment logic
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
    
    // Define the target date first
    const targetDate = new Date('2025-06-06')
    targetDate.setHours(0, 0, 0, 0)

    // All clinics are available every day
    console.log(`\n📍 Available clinics for ${targetDate.toDateString()}:`)
    clinicLocations.forEach((clinic, index) => {
      console.log(`   ${index + 1}. ${clinic.name} (${clinic.code})`)
      console.log(`      Address: ${clinic.address}`)
    })

    console.log(`\n🏥 According to the NEW system logic:`)
    console.log(`   June 6th, 2025 (${dayNames[dayOfWeek]}) should have slots at ALL clinics:`)

    // Check what slots actually exist for this date
    const doctor = await User.findOne({ role: 'admin' })
    if (!doctor) {
      console.log('❌ Doctor not found!')
      return
    }
    
    const slots = await Slot.find({
      doctor: doctor._id,
      date: targetDate
    }).sort({ startTime: 1 })
    
    console.log(`\n📋 Actual slots in database for June 6th, 2025:`)

    // Group by location (initialize outside if block)
    const slotsByLocation = {}
    slots.forEach(slot => {
      const location = slot.location || 'unknown'
      if (!slotsByLocation[location]) {
        slotsByLocation[location] = []
      }
      slotsByLocation[location].push(slot)
    })

    if (slots.length === 0) {
      console.log('   ❌ No slots found!')
    } else {
      console.log(`   Found ${slots.length} slots:`)

      Object.entries(slotsByLocation).forEach(([location, locationSlots]) => {
        const clinic = clinicLocations.find(c => c.code === location)
        const clinicName = clinic ? clinic.name : location
        console.log(`\n   📍 ${clinicName} (${location}): ${locationSlots.length} slots`)
        locationSlots.forEach(slot => {
          console.log(`      ${slot.startTime} - ${slot.endTime} (${slot.isBooked ? 'Booked' : 'Available'})`)
        })
      })
    }
    
    // Show the NEW weekly schedule
    console.log(`\n📅 NEW Daily clinic availability:`)
    console.log(`   Monday - Saturday: ALL clinics available`)
    console.log(`   - Ghodasar Clinic`)
    console.log(`   - Jasodanagar Clinic`)
    console.log(`   - Paldi Clinic (Ellis Bridge)`)
    console.log(`   Sunday: Closed`)

    // Check if slots need to be created
    if (slots.length === 0) {
      console.log(`\n💡 Suggestion: Run the slot generation service to create slots for June 6th, 2025`)
      console.log(`   The system should create slots at ALL clinic locations`)
    } else {
      const expectedClinics = clinicLocations.map(c => c.code)
      const foundClinics = Object.keys(slotsByLocation)
      const missingClinics = expectedClinics.filter(code => !foundClinics.includes(code))

      if (missingClinics.length === 0) {
        console.log(`\n✅ Slots exist at all expected clinic locations`)
      } else {
        console.log(`\n⚠️  Some clinics are missing slots:`)
        console.log(`   Expected: ${expectedClinics.join(', ')}`)
        console.log(`   Found: ${foundClinics.join(', ')}`)
        console.log(`   Missing: ${missingClinics.join(', ')}`)
      }
    }

  } catch (error) {
    console.error('❌ Error checking date and location:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Database connection closed')
    process.exit(0)
  }
}

// Run the check
checkDateAndLocation()
