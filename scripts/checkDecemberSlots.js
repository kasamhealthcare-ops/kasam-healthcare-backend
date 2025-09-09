import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'
import Slot from '../models/Slot.js'

// Load environment variables
dotenv.config()

const checkDecemberSlots = async () => {
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

    console.log(`👨‍⚕️ Doctor: ${doctor.firstName} ${doctor.lastName} (${doctor.email})`)

    // Check slots for December 11, 2024 specifically
    const checkDate = new Date('2024-12-11')
    console.log(`📅 Checking slots for: ${checkDate.toDateString()}`)

    const daySlots = await Slot.find({
      doctor: doctor._id,
      date: {
        $gte: new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate()),
        $lt: new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate() + 1)
      }
    })
    .populate('doctor', 'firstName lastName email')
    .populate('bookedBy', 'firstName lastName email')
    .sort({ startTime: 1 })
    
    console.log(`\n🕐 Found ${daySlots.length} slots for December 11, 2024:`)
    
    if (daySlots.length === 0) {
      console.log('❌ No slots found for December 11, 2024')
    } else {
      daySlots.forEach((slot, index) => {
        console.log(`${index + 1}. ${slot.startTime}-${slot.endTime}`)
        console.log(`   Location: ${slot.location}`)
        console.log(`   Available: ${slot.isAvailable}`)
        console.log(`   Booked: ${slot.isBooked}`)
        if (slot.bookedBy) {
          console.log(`   Booked by: ${slot.bookedBy.firstName} ${slot.bookedBy.lastName}`)
        }
        console.log(`   Notes: ${slot.notes}`)
        console.log('   ---')
      })
    }

    // Check total slots in database
    const totalSlots = await Slot.countDocuments({ doctor: doctor._id })
    const availableSlots = await Slot.countDocuments({ 
      doctor: doctor._id, 
      isAvailable: true, 
      isBooked: false 
    })
    
    console.log(`\n📊 Total Summary:`)
    console.log(`   Total slots in database: ${totalSlots}`)
    console.log(`   Available slots: ${availableSlots}`)
    console.log(`   Booked slots: ${totalSlots - availableSlots}`)

    // Check slots for December 2024 range
    const decemberSlots = await Slot.countDocuments({
      doctor: doctor._id,
      date: {
        $gte: new Date('2024-12-01'),
        $lt: new Date('2025-01-01')
      }
    })
    
    console.log(`   December 2024 slots: ${decemberSlots}`)

  } catch (error) {
    console.error('❌ Error checking slots:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Database connection closed')
    process.exit(0)
  }
}

// Run checker
checkDecemberSlots()
