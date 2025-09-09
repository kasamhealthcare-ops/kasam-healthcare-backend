import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Slot from '../models/Slot.js'

// Load environment variables
dotenv.config()

// Configuration - CHANGE THESE DATES AS NEEDED
const TARGET_DATE_START = '2025-06-01'  // Start date (YYYY-MM-DD)
const TARGET_DATE_END = '2025-06-30'    // End date (YYYY-MM-DD)

const deleteSpecificDateSlots = async () => {
  try {
    console.log('🎯 DELETING SLOTS FROM SPECIFIC DATE RANGE...')
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kasam-healthcare')
    console.log('✅ Connected to MongoDB')

    const startDate = new Date(TARGET_DATE_START)
    const endDate = new Date(TARGET_DATE_END)
    
    // Set to start/end of day for accurate comparison
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)
    
    console.log(`📅 Target date range:`)
    console.log(`   From: ${startDate.toDateString()}`)
    console.log(`   To: ${endDate.toDateString()}`)

    // Find slots in the target date range
    const targetSlots = await Slot.find({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ date: 1 })

    console.log(`\n📊 Found ${targetSlots.length} slots in target date range:`)
    
    if (targetSlots.length > 0) {
      const bookedCount = targetSlots.filter(slot => slot.isBooked).length
      const unbookedCount = targetSlots.filter(slot => !slot.isBooked).length
      
      console.log(`   📋 Booked slots: ${bookedCount}`)
      console.log(`   📄 Unbooked slots: ${unbookedCount}`)

      // Group by date for detailed display
      const slotsByDate = {}
      targetSlots.forEach(slot => {
        const dateKey = slot.date.toDateString()
        if (!slotsByDate[dateKey]) {
          slotsByDate[dateKey] = { 
            total: 0, 
            booked: 0, 
            unbooked: 0,
            slots: []
          }
        }
        slotsByDate[dateKey].total++
        slotsByDate[dateKey].slots.push(slot)
        if (slot.isBooked) {
          slotsByDate[dateKey].booked++
        } else {
          slotsByDate[dateKey].unbooked++
        }
      })

      console.log('\n📅 Detailed breakdown by date:')
      for (const [date, data] of Object.entries(slotsByDate)) {
        console.log(`\n   📅 ${date}: ${data.total} slots (${data.booked} booked, ${data.unbooked} unbooked)`)
        
        // Show first few slots as examples
        const examples = data.slots.slice(0, 3)
        examples.forEach(slot => {
          const status = slot.isBooked ? '🔒 BOOKED' : '🔓 AVAILABLE'
          const patient = slot.bookedBy ? ` by ${slot.bookedBy}` : ''
          console.log(`      ${slot.startTime}-${slot.endTime} ${slot.location} ${status}${patient}`)
        })
        
        if (data.slots.length > 3) {
          console.log(`      ... and ${data.slots.length - 3} more slots`)
        }
      }

      console.log('\n⚠️  WARNING: This will delete ALL slots in the specified date range!')
      console.log('⚠️  Including both booked and unbooked slots!')
      
      // Ask for confirmation (in a real scenario, you might want to add a prompt)
      console.log('\n🗑️  Proceeding with deletion in 3 seconds...')
      console.log('🛑 Press Ctrl+C to cancel!')
      
      // Wait 3 seconds
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Delete slots in the target date range
      console.log('\n🗑️  Deleting slots...')
      const result = await Slot.deleteMany({
        date: {
          $gte: startDate,
          $lte: endDate
        }
      })

      console.log(`\n✅ DELETION COMPLETED!`)
      console.log(`   🗑️  Deleted: ${result.deletedCount} slots`)
      console.log(`   📅 Date range: ${startDate.toDateString()} to ${endDate.toDateString()}`)
      
      // Verify deletion
      const remainingSlots = await Slot.countDocuments({
        date: {
          $gte: startDate,
          $lte: endDate
        }
      })
      console.log(`   📊 Remaining slots in date range: ${remainingSlots}`)
      
      if (remainingSlots === 0) {
        console.log(`   ✅ SUCCESS: All slots in date range have been deleted!`)
      } else {
        console.log(`   ⚠️  WARNING: ${remainingSlots} slots still remain in date range`)
      }
      
    } else {
      console.log('   ✅ No slots found in the specified date range!')
    }

    // Show final state
    const totalSlots = await Slot.countDocuments()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const futureSlots = await Slot.countDocuments({
      date: { $gte: today }
    })
    
    console.log(`\n📊 FINAL DATABASE STATE:`)
    console.log(`   Total slots: ${totalSlots}`)
    console.log(`   Future slots (from today): ${futureSlots}`)

  } catch (error) {
    console.error('❌ Error during deletion:', error)
  } finally {
    await mongoose.disconnect()
    console.log('\n👋 Disconnected from MongoDB')
  }
}

// Run the deletion
deleteSpecificDateSlots()
