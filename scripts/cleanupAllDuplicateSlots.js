import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Slot from '../models/Slot.js'

// Load environment variables
dotenv.config()

const cleanupAllDuplicateSlots = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    console.log('🗑️  Cleaning up all duplicate slots...\n')

    // Get all slots grouped by date
    const allSlots = await Slot.find({}).select('_id date startTime endTime location createdAt').sort({ date: 1, startTime: 1 })
    
    console.log(`📊 Total slots before cleanup: ${allSlots.length}`)

    // Group slots by date
    const slotsByDate = {}
    allSlots.forEach(slot => {
      const dateKey = slot.date.toDateString()
      if (!slotsByDate[dateKey]) {
        slotsByDate[dateKey] = []
      }
      slotsByDate[dateKey].push(slot)
    })

    let totalRemoved = 0
    const datesWithDuplicates = []

    // Process each date
    for (const [dateKey, slots] of Object.entries(slotsByDate)) {
      // Group by time and location
      const groupedSlots = {}
      slots.forEach(slot => {
        const key = `${slot.startTime}-${slot.endTime}-${slot.location}`
        if (!groupedSlots[key]) {
          groupedSlots[key] = []
        }
        groupedSlots[key].push(slot)
      })

      let removedForDate = 0
      for (const [key, duplicateSlots] of Object.entries(groupedSlots)) {
        if (duplicateSlots.length > 1) {
          // Keep the oldest one, remove the rest
          const sortedSlots = duplicateSlots.sort((a, b) => a.createdAt - b.createdAt)
          const slotsToRemove = sortedSlots.slice(1)
          
          for (const slot of slotsToRemove) {
            await Slot.deleteOne({ _id: slot._id })
            removedForDate++
            totalRemoved++
          }
        }
      }

      if (removedForDate > 0) {
        datesWithDuplicates.push({ date: dateKey, removed: removedForDate })
        console.log(`   ${dateKey}: removed ${removedForDate} duplicate slots`)
      }
    }

    console.log(`\n✅ Cleanup completed!`)
    console.log(`📊 Total duplicate slots removed: ${totalRemoved}`)
    console.log(`📅 Dates with duplicates cleaned: ${datesWithDuplicates.length}`)

    // Final verification
    const finalSlotCount = await Slot.countDocuments()
    console.log(`📊 Final slot count: ${finalSlotCount}`)

    // Test a few dates to verify cleanup
    console.log('\n🧪 Verification - checking sample dates:')
    const testDates = ['2025-06-05', '2025-06-10', '2025-06-15']
    
    for (const dateStr of testDates) {
      const testDate = new Date(dateStr)
      const daySlots = await Slot.countDocuments({
        date: {
          $gte: new Date(testDate.getFullYear(), testDate.getMonth(), testDate.getDate()),
          $lt: new Date(testDate.getFullYear(), testDate.getMonth(), testDate.getDate() + 1)
        }
      })
      
      const dayOfWeek = testDate.getDay()
      const expectedSlots = dayOfWeek === 0 ? 0 : (dayOfWeek === 6 ? 6 : 12)
      const status = daySlots === expectedSlots ? '✅' : '❌'
      
      console.log(`   ${status} ${testDate.toDateString()}: ${daySlots} slots (expected: ${expectedSlots})`)
    }

  } catch (error) {
    console.error('❌ Error cleaning up slots:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Database connection closed')
    process.exit(0)
  }
}

// Run cleanup
cleanupAllDuplicateSlots()
