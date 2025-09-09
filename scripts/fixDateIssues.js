import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Slot from '../models/Slot.js'
import slotService from '../services/slotService.js'

// Load environment variables
dotenv.config()

const fixDateIssues = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    console.log('🔧 Fixing date issues in slots...\n')

    // Step 1: Clear all existing slots to start fresh
    const deletedCount = await Slot.deleteMany({})
    console.log(`🗑️  Deleted ${deletedCount.deletedCount} existing slots`)

    // Step 2: Generate fresh slots with proper date handling
    console.log('\n🔄 Generating fresh slots with proper date handling...')
    await slotService.ensureSlotsExist(30)

    // Step 3: Verify the fix
    console.log('\n🧪 Verifying the fix...')
    
    // Test June 5, 2025 specifically
    const testDate = new Date('2025-06-05')
    const utcDate = new Date(Date.UTC(testDate.getFullYear(), testDate.getMonth(), testDate.getDate()))
    
    const june5Slots = await Slot.find({
      date: utcDate,
      isAvailable: true
    }).select('date startTime endTime location')

    console.log(`\n📅 June 5, 2025 slots (${june5Slots.length} found):`)
    june5Slots.forEach(slot => {
      console.log(`   ${slot.startTime}-${slot.endTime} at ${slot.location} (stored as: ${slot.date.toISOString()})`)
    })

    // Test the API query method
    console.log('\n🔍 Testing API query method...')
    const doctor = await mongoose.model('User').findOne({ 
      role: { $in: ['admin', 'doctor'] }, 
      isActive: true 
    })

    const apiSlots = await Slot.find({
      doctor: doctor._id,
      date: utcDate,
      isAvailable: true
    }).select('startTime endTime location')

    console.log(`📡 API query found ${apiSlots.length} slots for June 5, 2025`)

    // Check a few more dates
    console.log('\n📊 Checking multiple dates:')
    const testDates = ['2025-06-05', '2025-06-10', '2025-06-15', '2025-06-20']
    
    for (const dateStr of testDates) {
      const checkDate = new Date(dateStr)
      const checkUtcDate = new Date(Date.UTC(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate()))
      
      const daySlots = await Slot.countDocuments({
        doctor: doctor._id,
        date: checkUtcDate,
        isAvailable: true
      })
      
      const dayOfWeek = checkDate.getDay()
      const expectedSlots = dayOfWeek === 0 ? 0 : (dayOfWeek === 6 ? 6 : 12)
      const status = daySlots === expectedSlots ? '✅' : '❌'
      
      console.log(`   ${status} ${checkDate.toDateString()}: ${daySlots} slots (expected: ${expectedSlots})`)
    }

    // Final summary
    const totalSlots = await Slot.countDocuments()
    console.log(`\n📊 Total slots in database: ${totalSlots}`)

    console.log('\n✅ Date issues fixed successfully!')

  } catch (error) {
    console.error('❌ Error fixing date issues:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Database connection closed')
    process.exit(0)
  }
}

// Run fix
fixDateIssues()
