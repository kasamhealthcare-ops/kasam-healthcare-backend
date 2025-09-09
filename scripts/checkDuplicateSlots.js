import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Slot from '../models/Slot.js'

// Load environment variables
dotenv.config()

const checkDuplicateSlots = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    console.log('🔍 Checking for duplicate slots...\n')

    // Find duplicates using aggregation
    const duplicates = await Slot.aggregate([
      {
        $group: {
          _id: {
            doctor: '$doctor',
            date: '$date',
            startTime: '$startTime'
          },
          count: { $sum: 1 },
          ids: { $push: '$_id' }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ])

    console.log(`📊 Found ${duplicates.length} sets of duplicate slots`)

    if (duplicates.length > 0) {
      console.log('\n🔍 Duplicate slot details:')
      let totalDuplicates = 0
      
      for (const duplicate of duplicates.slice(0, 10)) { // Show first 10
        const date = new Date(duplicate._id.date)
        console.log(`   ${date.toDateString()} ${duplicate._id.startTime}: ${duplicate.count} copies`)
        totalDuplicates += duplicate.count - 1 // -1 because we keep one
      }
      
      if (duplicates.length > 10) {
        console.log(`   ... and ${duplicates.length - 10} more sets`)
      }
      
      console.log(`\n📊 Total duplicate slots to remove: ${totalDuplicates}`)
      
      // Ask if we should clean them up
      console.log('\n🗑️  Cleaning up duplicate slots...')
      let removedCount = 0
      
      for (const duplicate of duplicates) {
        // Keep the first one, remove the rest
        const idsToRemove = duplicate.ids.slice(1)
        await Slot.deleteMany({ _id: { $in: idsToRemove } })
        removedCount += idsToRemove.length
      }
      
      console.log(`✅ Removed ${removedCount} duplicate slots`)
    } else {
      console.log('✅ No duplicate slots found')
    }

    // Check final slot count
    const finalCount = await Slot.countDocuments()
    console.log(`\n📊 Final slot count: ${finalCount}`)

    // Check a specific date after cleanup
    const testDate = new Date('2025-06-05')
    const testSlots = await Slot.find({
      date: {
        $gte: new Date(testDate.getFullYear(), testDate.getMonth(), testDate.getDate()),
        $lt: new Date(testDate.getFullYear(), testDate.getMonth(), testDate.getDate() + 1)
      }
    }).select('startTime endTime location')

    console.log(`\n📅 ${testDate.toDateString()} after cleanup (${testSlots.length} slots):`)
    testSlots.forEach(slot => {
      console.log(`   ${slot.startTime}-${slot.endTime} at ${slot.location}`)
    })

  } catch (error) {
    console.error('❌ Error checking duplicates:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Database connection closed')
    process.exit(0)
  }
}

// Run check
checkDuplicateSlots()
