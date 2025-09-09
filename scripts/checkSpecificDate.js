import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'
import Slot from '../models/Slot.js'

// Load environment variables
dotenv.config()

const checkSpecificDate = async () => {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://kasam_admin:kasamhealthcare@kasam-admin.znwc1gv.mongodb.net/kasam_healthcare?retryWrites=true&w=majority&appName=kasam-admin'
    await mongoose.connect(mongoUri)
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

    console.log(`👨‍⚕️ Doctor: ${doctor.firstName} ${doctor.lastName} (${doctor.email})`)

    // Check slots for June 5, 2025 specifically
    const checkDate = new Date('2025-06-05')
    console.log(`📅 Checking slots for: ${checkDate.toDateString()}`)
    console.log(`📅 ISO Date: ${checkDate.toISOString()}`)

    // Query exactly as the API does
    const daySlots = await Slot.find({
      doctor: doctor._id,
      date: new Date('2025-06-05'),
      isAvailable: true
    })
    .populate('doctor', 'firstName lastName')
    .populate('bookedBy', 'firstName lastName')
    .sort({ startTime: 1 })

    console.log(`\n🕐 Found ${daySlots.length} slots for June 5, 2025:`)
    
    if (daySlots.length === 0) {
      console.log('❌ No slots found for June 5, 2025')

      // Check what dates DO have slots
      console.log('\n🔍 Checking what dates have slots...')
      const allSlots = await Slot.find({ doctor: doctor._id })
        .select('date startTime location')
        .sort({ date: 1, startTime: 1 })
        .limit(20)

      console.log('First 20 slots in database:')
      allSlots.forEach((slot, index) => {
        console.log(`${index + 1}. ${slot.date.toDateString()} ${slot.startTime} (${slot.location})`)
      })

      // Check 2025 range
      const slots2025 = await Slot.find({
        doctor: doctor._id,
        date: {
          $gte: new Date('2025-01-01'),
          $lt: new Date('2025-12-31')
        }
      }).select('date').sort({ date: 1 })

      const uniqueDates2025 = [...new Set(slots2025.map(slot => slot.date.toDateString()))]
      console.log(`\n📅 2025 dates with slots (${uniqueDates2025.length} dates):`)
      uniqueDates2025.forEach(date => console.log(`   - ${date}`))
      
    } else {
      daySlots.forEach((slot, index) => {
        console.log(`${index + 1}. ${slot.startTime}-${slot.endTime}`)
        console.log(`   Location: ${slot.location}`)
        console.log(`   Available: ${slot.isAvailable}`)
        console.log(`   Booked: ${slot.isBooked}`)
        console.log(`   Date stored: ${slot.date.toISOString()}`)
        console.log('   ---')
      })
    }

  } catch (error) {
    console.error('❌ Error checking slots:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Database connection closed')
    process.exit(0)
  }
}

// Run checker
checkSpecificDate()
