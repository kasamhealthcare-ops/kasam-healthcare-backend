import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Slot from '../models/Slot.js'
import User from '../models/User.js'

// Load environment variables
dotenv.config()

const verifySlotFiltering = async () => {
  try {
    console.log('🔍 Verifying slot filtering logic...')
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kasam-healthcare')
    console.log('✅ Connected to MongoDB')

    // Find the doctor
    const doctor = await User.findOne({ role: 'admin' })
    if (!doctor) {
      console.log('❌ Doctor not found!')
      return
    }

    // Get today's date
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    console.log(`📅 Testing for date: ${today.toDateString()}`)
    console.log(`⏰ Current time: ${new Date().toLocaleTimeString()}`)

    // Simulate the backend filtering logic
    const allSlots = await Slot.find({
      doctor: doctor._id,
      date: today,
      isAvailable: true
    }).sort({ startTime: 1 })

    console.log(`\n📋 All slots in database: ${allSlots.length}`)
    allSlots.forEach((slot, index) => {
      console.log(`   ${index + 1}. ${slot.startTime} - ${slot.endTime} (${slot.isBooked ? 'Booked' : 'Available'})`)
    })

    // Apply the same filtering logic as the backend
    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes() // Current time in minutes
    
    const filteredSlots = allSlots.filter(slot => {
      const [hours, minutes] = slot.startTime.split(':').map(Number)
      const slotTime = hours * 60 + minutes // Slot time in minutes
      
      // Only show slots that haven't started yet
      return slotTime > currentTime
    })

    console.log(`\n🔄 After filtering (current time: ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}):`)
    console.log(`   Current time in minutes: ${currentTime}`)
    console.log(`   Filtered slots: ${filteredSlots.length}`)
    console.log(`   Filtered out: ${allSlots.length - filteredSlots.length}`)

    if (filteredSlots.length > 0) {
      console.log(`\n✅ Slots that should be shown to patients:`)
      filteredSlots.forEach((slot, index) => {
        const [hours, minutes] = slot.startTime.split(':').map(Number)
        const slotTime = hours * 60 + minutes
        console.log(`   ${index + 1}. ${slot.startTime} - ${slot.endTime}`)
        console.log(`      Slot time: ${slotTime} minutes, Current: ${currentTime} minutes`)
        console.log(`      Future: ${slotTime > currentTime ? '✅' : '❌'}`)
      })
    } else {
      console.log(`\n❌ No future slots available for today`)
    }

    if (allSlots.length - filteredSlots.length > 0) {
      console.log(`\n⏮️ Past slots that should be hidden:`)
      const pastSlots = allSlots.filter(slot => {
        const [hours, minutes] = slot.startTime.split(':').map(Number)
        const slotTime = hours * 60 + minutes
        return slotTime <= currentTime
      })
      
      pastSlots.forEach((slot, index) => {
        const [hours, minutes] = slot.startTime.split(':').map(Number)
        const slotTime = hours * 60 + minutes
        console.log(`   ${index + 1}. ${slot.startTime} - ${slot.endTime}`)
        console.log(`      Slot time: ${slotTime} minutes, Current: ${currentTime} minutes`)
        console.log(`      Past: ${slotTime <= currentTime ? '✅' : '❌'}`)
      })
    }

    console.log(`\n📊 Summary:`)
    console.log(`   Total slots: ${allSlots.length}`)
    console.log(`   Future slots (shown): ${filteredSlots.length}`)
    console.log(`   Past slots (hidden): ${allSlots.length - filteredSlots.length}`)
    console.log(`   Filtering working: ${filteredSlots.length < allSlots.length ? '✅ Yes' : '❌ No filtering needed'}`)

  } catch (error) {
    console.error('❌ Error verifying slot filtering:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Database connection closed')
    process.exit(0)
  }
}

// Run the verification
verifySlotFiltering()
