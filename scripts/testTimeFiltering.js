import mongoose from 'mongoose'
import Slot from '../models/Slot.js'

async function testTimeFiltering() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kasam-healthcare')
    console.log('✅ Connected to MongoDB')

    const now = new Date()
    console.log(`🕐 Current time: ${now.toLocaleString()}`)
    console.log(`🕐 Current time in minutes: ${now.getHours() * 60 + now.getMinutes()}`)

    const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    console.log(`📅 Today UTC: ${todayUTC.toISOString()}`)

    // Get all slots for today
    const todaySlots = await Slot.find({
      date: todayUTC
    }).sort({ startTime: 1 })

    console.log(`\n📊 Found ${todaySlots.length} slots for today:`)

    const currentTime = now.getHours() * 60 + now.getMinutes()
    
    todaySlots.forEach(slot => {
      const [hours, minutes] = slot.startTime.split(':').map(Number)
      const slotTime = hours * 60 + minutes
      const isPast = slotTime <= currentTime
      
      console.log(`   ${slot.startTime}-${slot.endTime} (${slotTime} min) - ${isPast ? '❌ PAST' : '✅ FUTURE'} - ${slot.isBooked ? 'BOOKED' : 'AVAILABLE'}`)
    })

    // Test the filtering logic
    const futureSlots = todaySlots.filter(slot => {
      const [hours, minutes] = slot.startTime.split(':').map(Number)
      const slotTime = hours * 60 + minutes
      return slotTime > currentTime
    })

    console.log(`\n🔍 After filtering: ${futureSlots.length} future slots should be shown`)
    console.log(`🗑️  ${todaySlots.length - futureSlots.length} past slots should be hidden`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await mongoose.disconnect()
    console.log('👋 Disconnected from MongoDB')
  }
}

testTimeFiltering()
