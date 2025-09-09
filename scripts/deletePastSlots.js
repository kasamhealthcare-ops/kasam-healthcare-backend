import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Slot from '../models/Slot.js'

// Load environment variables
dotenv.config()

const deletePastSlots = async () => {
  try {
    console.log('🗑️  DELETING ALL PAST SLOTS...')
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kasam-healthcare')
    console.log('✅ Connected to MongoDB')

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    console.log(`📅 Today: ${today.toDateString()}`)
    console.log(`🎯 Target: Delete ALL slots before ${today.toISOString()}`)

    // Show what we're about to delete
    const allPastSlots = await Slot.find({
      date: { $lt: today }
    }).sort({ date: 1 })

    console.log(`\n📊 Found ${allPastSlots.length} total past slots:`)
    
    if (allPastSlots.length > 0) {
      const bookedCount = allPastSlots.filter(slot => slot.isBooked).length
      const unbookedCount = allPastSlots.filter(slot => !slot.isBooked).length
      
      console.log(`   📋 Booked slots: ${bookedCount}`)
      console.log(`   📄 Unbooked slots: ${unbookedCount}`)

      // Group by date for display
      const slotsByDate = {}
      allPastSlots.forEach(slot => {
        const dateKey = slot.date.toDateString()
        if (!slotsByDate[dateKey]) {
          slotsByDate[dateKey] = { total: 0, booked: 0, unbooked: 0 }
        }
        slotsByDate[dateKey].total++
        if (slot.isBooked) {
          slotsByDate[dateKey].booked++
        } else {
          slotsByDate[dateKey].unbooked++
        }
      })

      console.log('\n📅 Breakdown by date:')
      for (const [date, counts] of Object.entries(slotsByDate)) {
        console.log(`   ${date}: ${counts.total} total (${counts.booked} booked, ${counts.unbooked} unbooked)`)
      }

      console.log('\n⚠️  WARNING: This will delete ALL past slots (including booked ones)!')
      console.log('⚠️  Make sure past appointments are handled separately if needed.')
      
      // Delete ALL past slots (both booked and unbooked)
      console.log('\n🗑️  Proceeding with deletion...')
      const result = await Slot.deleteMany({
        date: { $lt: today }
      })

      console.log(`\n✅ DELETION COMPLETED!`)
      console.log(`   🗑️  Deleted: ${result.deletedCount} past slots`)
      
      // Verify deletion
      const remainingPastSlots = await Slot.countDocuments({
        date: { $lt: today }
      })
      console.log(`   📊 Remaining past slots: ${remainingPastSlots}`)
      
      if (remainingPastSlots === 0) {
        console.log(`   ✅ SUCCESS: All past slots have been deleted!`)
      } else {
        console.log(`   ⚠️  WARNING: ${remainingPastSlots} past slots still remain`)
      }
      
    } else {
      console.log('   ✅ No past slots found - database is already clean!')
    }

    // Show final state
    const totalSlots = await Slot.countDocuments()
    const futureSlots = await Slot.countDocuments({
      date: { $gte: today }
    })
    
    console.log(`\n📊 FINAL STATE:`)
    console.log(`   Total slots: ${totalSlots}`)
    console.log(`   Future slots: ${futureSlots}`)
    console.log(`   Past slots: ${totalSlots - futureSlots}`)

  } catch (error) {
    console.error('❌ Error during deletion:', error)
  } finally {
    await mongoose.disconnect()
    console.log('\n👋 Disconnected from MongoDB')
  }
}

// Run the deletion
deletePastSlots()
