import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'
import Slot from '../models/Slot.js'

// Load environment variables
dotenv.config()

const checkSlots = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    // Check existing slots
    const slots = await Slot.find({})
      .populate('doctor', 'firstName lastName email role')
      .populate('bookedBy', 'firstName lastName email')
      .sort({ date: 1, startTime: 1 })
    
    console.log(`\n🕐 Found ${slots.length} slots in database:`)
    
    if (slots.length === 0) {
      console.log('❌ No slots found in database')
      console.log('💡 You need to create slots first using the admin dashboard')
    } else {
      slots.forEach((slot, index) => {
        console.log(`${index + 1}. ${slot.date.toDateString()} ${slot.startTime}-${slot.endTime}`)
        console.log(`   Doctor: ${slot.doctor?.firstName} ${slot.doctor?.lastName} (${slot.doctor?.email})`)
        console.log(`   Available: ${slot.isAvailable}`)
        console.log(`   Booked: ${slot.isBooked}`)
        if (slot.bookedBy) {
          console.log(`   Booked by: ${slot.bookedBy.firstName} ${slot.bookedBy.lastName}`)
        }
        console.log(`   Location: ${slot.location}`)
        console.log('   ---')
      })
    }

    // Check for doctors
    const doctors = await User.find({ 
      role: { $in: ['admin', 'doctor'] }, 
      isActive: true 
    })
    console.log(`\n👨‍⚕️ Found ${doctors.length} doctors/admins:`)
    doctors.forEach((doctor, index) => {
      console.log(`${index + 1}. ${doctor.firstName} ${doctor.lastName} (${doctor.email}) - ${doctor.role}`)
    })

  } catch (error) {
    console.error('❌ Error checking slots:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Database connection closed')
    process.exit(0)
  }
}

// Run checker
checkSlots()
