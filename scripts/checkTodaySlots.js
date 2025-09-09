import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'
import Slot from '../models/Slot.js'

// Load environment variables
dotenv.config()

const checkTodaySlots = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    // Get today's date
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    console.log(`📅 Checking slots for today: ${todayStr}`)

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

    // Check slots for today
    const todaySlots = await Slot.find({
      doctor: doctor._id,
      date: {
        $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      }
    })
    .populate('doctor', 'firstName lastName email')
    .populate('bookedBy', 'firstName lastName email')
    .sort({ startTime: 1 })
    
    console.log(`\n🕐 Found ${todaySlots.length} slots for today:`)
    
    if (todaySlots.length === 0) {
      console.log('❌ No slots found for today')
      console.log('💡 Try running: node scripts/addCurrentSlots.js')
    } else {
      todaySlots.forEach((slot, index) => {
        console.log(`${index + 1}. ${slot.startTime}-${slot.endTime}`)
        console.log(`   Available: ${slot.isAvailable}`)
        console.log(`   Booked: ${slot.isBooked}`)
        if (slot.bookedBy) {
          console.log(`   Booked by: ${slot.bookedBy.firstName} ${slot.bookedBy.lastName}`)
        }
        console.log(`   Location: ${slot.location}`)
        console.log('   ---')
      })
    }

    // Check next few days
    console.log(`\n📊 Slots for next 7 days:`)
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(today.getDate() + i)
      
      const daySlots = await Slot.countDocuments({
        doctor: doctor._id,
        date: {
          $gte: new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate()),
          $lt: new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate() + 1)
        }
      })
      
      const availableSlots = await Slot.countDocuments({
        doctor: doctor._id,
        date: {
          $gte: new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate()),
          $lt: new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate() + 1)
        },
        isAvailable: true,
        isBooked: false
      })
      
      console.log(`   ${checkDate.toDateString()}: ${availableSlots}/${daySlots} available`)
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
checkTodaySlots()
