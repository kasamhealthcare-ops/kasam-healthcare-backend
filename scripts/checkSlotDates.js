import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Slot from '../models/Slot.js'

// Load environment variables
dotenv.config()

const checkSlotDates = async () => {
  try {
    console.log('🔍 CHECKING SLOT DATES IN DATABASE...')
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kasam-healthcare')
    console.log('✅ Connected to MongoDB')

    const now = new Date()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    console.log(`📅 Current date/time: ${now.toISOString()}`)
    console.log(`📅 Today (start of day): ${today.toISOString()}`)
    console.log(`📅 Today formatted: ${today.toDateString()}`)

    // Get all slots and group by date
    const allSlots = await Slot.find({}).sort({ date: 1 })
    
    console.log(`\n📊 Found ${allSlots.length} total slots in database`)
    
    if (allSlots.length > 0) {
      // Group slots by date
      const slotsByDate = {}
      let pastCount = 0
      let todayCount = 0
      let futureCount = 0
      
      allSlots.forEach(slot => {
        const slotDate = new Date(slot.date)
        slotDate.setHours(0, 0, 0, 0)
        const dateKey = slotDate.toDateString()
        
        if (!slotsByDate[dateKey]) {
          slotsByDate[dateKey] = {
            slots: [],
            isPast: slotDate < today,
            isToday: slotDate.getTime() === today.getTime(),
            isFuture: slotDate > today
          }
        }
        slotsByDate[dateKey].slots.push(slot)
        
        // Count by category
        if (slotDate < today) pastCount++
        else if (slotDate.getTime() === today.getTime()) todayCount++
        else futureCount++
      })

      console.log(`\n📈 BREAKDOWN:`)
      console.log(`   Past slots: ${pastCount}`)
      console.log(`   Today's slots: ${todayCount}`)
      console.log(`   Future slots: ${futureCount}`)

      console.log(`\n📅 SLOTS BY DATE:`)
      
      // Sort dates and display
      const sortedDates = Object.keys(slotsByDate).sort((a, b) => new Date(a) - new Date(b))
      
      for (const dateKey of sortedDates) {
        const data = slotsByDate[dateKey]
        const bookedCount = data.slots.filter(s => s.isBooked).length
        const availableCount = data.slots.filter(s => !s.isBooked).length
        
        let status = ''
        if (data.isPast) status = '🔴 PAST'
        else if (data.isToday) status = '🟡 TODAY'
        else status = '🟢 FUTURE'
        
        console.log(`   ${status} ${dateKey}: ${data.slots.length} slots (${bookedCount} booked, ${availableCount} available)`)
        
        // Show first few slots as examples
        const examples = data.slots.slice(0, 2)
        examples.forEach(slot => {
          const bookingStatus = slot.isBooked ? '🔒 BOOKED' : '🔓 AVAILABLE'
          console.log(`      ${slot.startTime}-${slot.endTime} ${slot.location} ${bookingStatus}`)
        })
        
        if (data.slots.length > 2) {
          console.log(`      ... and ${data.slots.length - 2} more`)
        }
      }

      // Check what the API would return for admin
      console.log(`\n🔍 TESTING API FILTER (admin role):`)
      const apiFilter = { date: { $gte: today } }
      const apiSlots = await Slot.find(apiFilter).sort({ date: 1 })
      
      console.log(`   API would return: ${apiSlots.length} slots`)
      
      if (apiSlots.length > 0) {
        console.log(`   Date range: ${apiSlots[0].date.toDateString()} to ${apiSlots[apiSlots.length - 1].date.toDateString()}`)
        
        // Show first few API results
        console.log(`   First few results:`)
        apiSlots.slice(0, 3).forEach(slot => {
          const bookingStatus = slot.isBooked ? '🔒 BOOKED' : '🔓 AVAILABLE'
          console.log(`      ${slot.date.toDateString()} ${slot.startTime}-${slot.endTime} ${slot.location} ${bookingStatus}`)
        })
      }

    } else {
      console.log('   ✅ No slots found in database')
    }

  } catch (error) {
    console.error('❌ Error checking slot dates:', error)
  } finally {
    await mongoose.disconnect()
    console.log('\n👋 Disconnected from MongoDB')
  }
}

// Run the check
checkSlotDates()
