import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Slot from '../models/Slot.js'

// Load environment variables
dotenv.config()

const analyzeSlots = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    console.log('🔍 Analyzing slot data...\n')

    // Check June 5, 2025 slots in detail
    const testDate = new Date('2025-06-05')
    const testSlots = await Slot.find({
      date: {
        $gte: new Date(testDate.getFullYear(), testDate.getMonth(), testDate.getDate()),
        $lt: new Date(testDate.getFullYear(), testDate.getMonth(), testDate.getDate() + 1)
      }
    }).select('_id date startTime endTime location createdAt')

    console.log(`📅 ${testDate.toDateString()} detailed analysis (${testSlots.length} slots):`)
    
    // Group by time and location
    const groupedSlots = {}
    testSlots.forEach(slot => {
      const key = `${slot.startTime}-${slot.endTime}-${slot.location}`
      if (!groupedSlots[key]) {
        groupedSlots[key] = []
      }
      groupedSlots[key].push(slot)
    })

    Object.entries(groupedSlots).forEach(([key, slots]) => {
      console.log(`\n   ${key}: ${slots.length} slot(s)`)
      slots.forEach((slot, index) => {
        console.log(`     ${index + 1}. ID: ${slot._id}, Created: ${slot.createdAt.toISOString()}`)
      })
    })

    // Clean up the extra slots (keep only one per time-location combination)
    console.log('\n🗑️  Cleaning up extra slots...')
    let removedCount = 0

    for (const [key, slots] of Object.entries(groupedSlots)) {
      if (slots.length > 1) {
        // Keep the first one (oldest), remove the rest
        const slotsToRemove = slots.slice(1)
        for (const slot of slotsToRemove) {
          await Slot.deleteOne({ _id: slot._id })
          removedCount++
        }
        console.log(`   Removed ${slotsToRemove.length} extra slots for ${key}`)
      }
    }

    console.log(`✅ Removed ${removedCount} extra slots`)

    // Verify the cleanup
    const finalSlots = await Slot.find({
      date: {
        $gte: new Date(testDate.getFullYear(), testDate.getMonth(), testDate.getDate()),
        $lt: new Date(testDate.getFullYear(), testDate.getMonth(), testDate.getDate() + 1)
      }
    }).select('startTime endTime location')

    console.log(`\n📅 ${testDate.toDateString()} after cleanup (${finalSlots.length} slots):`)
    finalSlots.forEach(slot => {
      console.log(`   ${slot.startTime}-${slot.endTime} at ${slot.location}`)
    })

    // Check total slots after cleanup
    const totalSlots = await Slot.countDocuments()
    console.log(`\n📊 Total slots after cleanup: ${totalSlots}`)

  } catch (error) {
    console.error('❌ Error analyzing slots:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Database connection closed')
    process.exit(0)
  }
}

// Run analysis
analyzeSlots()
