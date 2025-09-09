import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Slot from '../models/Slot.js'

// Load environment variables
dotenv.config()

const testApiFilter = async () => {
  try {
    console.log('🧪 TESTING API FILTER LOGIC...')
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kasam-healthcare')
    console.log('✅ Connected to MongoDB')

    const now = new Date()
    console.log(`📅 Current date/time: ${now.toISOString()}`)
    
    // Test different date creation methods
    console.log('\n🔍 TESTING DATE CREATION METHODS:')
    
    // Method 1: setHours (old method)
    const today1 = new Date()
    today1.setHours(0, 0, 0, 0)
    console.log(`Method 1 (setHours): ${today1.toISOString()}`)
    
    // Method 2: UTC date (new method)
    const today2 = new Date()
    const todayUTC = new Date(Date.UTC(today2.getFullYear(), today2.getMonth(), today2.getDate()))
    console.log(`Method 2 (UTC): ${todayUTC.toISOString()}`)
    
    // Test queries with both methods
    console.log('\n📊 TESTING QUERIES:')
    
    // Query 1: Using setHours method
    const query1 = { date: { $gte: today1 } }
    const result1 = await Slot.find(query1).sort({ date: 1 }).limit(5)
    console.log(`\nQuery 1 (setHours >= ${today1.toISOString()}):`)
    console.log(`   Found: ${result1.length} slots`)
    result1.forEach(slot => {
      console.log(`   ${slot.date.toISOString()} (${slot.date.toDateString()}) ${slot.startTime}-${slot.endTime}`)
    })
    
    // Query 2: Using UTC method
    const query2 = { date: { $gte: todayUTC } }
    const result2 = await Slot.find(query2).sort({ date: 1 }).limit(5)
    console.log(`\nQuery 2 (UTC >= ${todayUTC.toISOString()}):`)
    console.log(`   Found: ${result2.length} slots`)
    result2.forEach(slot => {
      console.log(`   ${slot.date.toISOString()} (${slot.date.toDateString()}) ${slot.startTime}-${slot.endTime}`)
    })
    
    // Count total results for each method
    const count1 = await Slot.countDocuments(query1)
    const count2 = await Slot.countDocuments(query2)
    
    console.log(`\n📈 TOTAL COUNTS:`)
    console.log(`   Method 1 (setHours): ${count1} slots`)
    console.log(`   Method 2 (UTC): ${count2} slots`)
    
    // Show what dates are being filtered out
    console.log(`\n🔍 WHAT'S BEING FILTERED OUT:`)
    
    const excludedByMethod1 = await Slot.find({ date: { $lt: today1 } }).sort({ date: 1 })
    const excludedByMethod2 = await Slot.find({ date: { $lt: todayUTC } }).sort({ date: 1 })
    
    console.log(`   Method 1 excludes: ${excludedByMethod1.length} slots`)
    if (excludedByMethod1.length > 0) {
      const uniqueDates1 = [...new Set(excludedByMethod1.map(s => s.date.toDateString()))]
      console.log(`   Excluded dates: ${uniqueDates1.join(', ')}`)
    }
    
    console.log(`   Method 2 excludes: ${excludedByMethod2.length} slots`)
    if (excludedByMethod2.length > 0) {
      const uniqueDates2 = [...new Set(excludedByMethod2.map(s => s.date.toDateString()))]
      console.log(`   Excluded dates: ${uniqueDates2.join(', ')}`)
    }
    
    // Simulate the exact API query for admin role
    console.log(`\n🎯 SIMULATING ADMIN API QUERY:`)
    let query = {}
    
    // Admin role filter (new method)
    const today = new Date()
    const adminTodayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
    query.date = { $gte: adminTodayUTC }
    
    console.log(`   Filter: date >= ${adminTodayUTC.toISOString()}`)
    
    const adminResults = await Slot.find(query)
      .sort('date startTime')
      .limit(10)
    
    console.log(`   Results: ${adminResults.length} slots (showing first 10)`)
    adminResults.forEach(slot => {
      const bookingStatus = slot.isBooked ? '🔒 BOOKED' : '🔓 AVAILABLE'
      console.log(`   ${slot.date.toDateString()} ${slot.startTime}-${slot.endTime} ${slot.location} ${bookingStatus}`)
    })
    
    const totalAdminResults = await Slot.countDocuments(query)
    console.log(`   Total admin results: ${totalAdminResults} slots`)

  } catch (error) {
    console.error('❌ Error testing API filter:', error)
  } finally {
    await mongoose.disconnect()
    console.log('\n👋 Disconnected from MongoDB')
  }
}

// Run the test
testApiFilter()
