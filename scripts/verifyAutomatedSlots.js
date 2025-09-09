import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Slot from '../models/Slot.js'

// Load environment variables
dotenv.config()

const verifyAutomatedSlots = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    console.log('🔍 Verifying Automated Slot System...\n')

    // Check total slots
    const totalSlots = await Slot.countDocuments()
    console.log(`📊 Total slots in database: ${totalSlots}`)

    // Check slots for the next 30 days
    const today = new Date()
    const thirtyDaysFromNow = new Date(today)
    thirtyDaysFromNow.setDate(today.getDate() + 30)

    const futureSlots = await Slot.countDocuments({
      date: {
        $gte: today,
        $lte: thirtyDaysFromNow
      }
    })
    console.log(`📅 Slots for next 30 days: ${futureSlots}`)

    // Check specific test dates
    const testDates = [
      '2025-06-05', // The original problematic date
      '2025-06-15', // Mid-June
      '2025-07-01', // July start
    ]

    console.log('\n🧪 Testing specific dates:')
    for (const dateStr of testDates) {
      const testDate = new Date(dateStr)
      const daySlots = await Slot.find({
        date: {
          $gte: new Date(testDate.getFullYear(), testDate.getMonth(), testDate.getDate()),
          $lt: new Date(testDate.getFullYear(), testDate.getMonth(), testDate.getDate() + 1)
        },
        isAvailable: true
      }).select('startTime endTime location')

      console.log(`\n📅 ${testDate.toDateString()} (${daySlots.length} slots):`)
      if (daySlots.length > 0) {
        daySlots.forEach(slot => {
          console.log(`   ${slot.startTime}-${slot.endTime} at ${slot.location}`)
        })
      } else {
        console.log('   ❌ No slots available')
      }
    }

    // Check slot distribution by day of week
    console.log('\n📊 Slot distribution by day of week (next 14 days):')
    for (let i = 0; i < 14; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(today.getDate() + i)
      
      const daySlots = await Slot.countDocuments({
        date: {
          $gte: new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate()),
          $lt: new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate() + 1)
        }
      })
      
      const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'long' })
      const expectedSlots = checkDate.getDay() === 0 ? 0 : (checkDate.getDay() === 6 ? 6 : 12)
      const status = daySlots === expectedSlots ? '✅' : '❌'
      
      console.log(`   ${status} ${dayName} ${checkDate.toDateString()}: ${daySlots} slots (expected: ${expectedSlots})`)
    }

    // Check for any gaps in coverage
    console.log('\n🔍 Checking for gaps in slot coverage...')
    let gapsFound = 0
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(today.getDate() + i)
      
      // Skip Sundays
      if (checkDate.getDay() === 0) continue
      
      const daySlots = await Slot.countDocuments({
        date: {
          $gte: new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate()),
          $lt: new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate() + 1)
        }
      })
      
      if (daySlots === 0) {
        console.log(`   ❌ Gap found: ${checkDate.toDateString()} has no slots`)
        gapsFound++
      }
    }
    
    if (gapsFound === 0) {
      console.log('   ✅ No gaps found - continuous slot coverage for next 30 days')
    } else {
      console.log(`   ⚠️  Found ${gapsFound} gaps in slot coverage`)
    }

    console.log('\n✅ Automated slot verification completed!')

  } catch (error) {
    console.error('❌ Error verifying slots:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Database connection closed')
    process.exit(0)
  }
}

// Run verification
verifyAutomatedSlots()
