import axios from 'axios'

const testSlotFilteringAPI = async () => {
  try {
    console.log('🧪 Testing slot filtering API with authentication...')
    
    const baseURL = 'http://localhost:5000/api'
    
    // Step 1: Login as patient to get token
    console.log('\n🔐 Logging in as patient...')
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'patient@example.com',
      password: 'password123'
    })
    
    if (!loginResponse.data.success) {
      console.log('❌ Login failed:', loginResponse.data.message)
      return
    }
    
    const token = loginResponse.data.data.token
    console.log('✅ Login successful')
    
    // Step 2: Test slot filtering for today (2025-06-05)
    const testDate = '2025-06-05'
    console.log(`\n📅 Testing slot filtering for: ${testDate}`)
    console.log(`⏰ Current time: ${new Date().toLocaleTimeString()}`)
    
    try {
      const response = await axios.get(`${baseURL}/slots/available`, {
        params: {
          date: testDate,
          doctor: '683ebdb8b2dc351790b19a1a' // Use the doctor ID from our tests
        },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('\n✅ API Response received:')
      console.log(`   Success: ${response.data.success}`)
      console.log(`   Total slots in DB: ${response.data.data.totalSlots}`)
      console.log(`   Available slots (after filtering): ${response.data.data.availableSlots}`)
      console.log(`   Filtered past slots: ${response.data.data.filteredPastSlots}`)
      
      const slots = response.data.data.slots
      console.log(`\n📋 Returned slots (${slots.length}):`)
      
      if (slots.length === 0) {
        console.log('   No slots returned')
        if (response.data.data.filteredPastSlots > 0) {
          console.log(`   ✅ This is correct - all ${response.data.data.filteredPastSlots} slots were past times`)
        } else {
          console.log('   ❌ This might be an issue - no slots found and none were filtered')
        }
      } else {
        const now = new Date()
        const currentTime = now.getHours() * 60 + now.getMinutes()
        
        slots.forEach((slot, index) => {
          const [hours, minutes] = slot.startTime.split(':').map(Number)
          const slotTime = hours * 60 + minutes
          const isFuture = slotTime > currentTime
          
          console.log(`   ${index + 1}. ${slot.startTime} - ${slot.endTime}`)
          console.log(`      Time: ${slotTime} minutes (current: ${currentTime})`)
          console.log(`      Is future: ${isFuture ? '✅' : '❌ PROBLEM!'}`)
          console.log(`      Is booked: ${slot.isBooked ? 'Yes' : 'No'}`)
          console.log('')
        })
      }
      
      // Verify filtering is working
      if (response.data.data.filteredPastSlots > 0) {
        console.log(`✅ Filtering is working! ${response.data.data.filteredPastSlots} past slots were filtered out`)
      } else {
        console.log(`❌ No slots were filtered - this might indicate a problem`)
      }
      
    } catch (apiError) {
      console.log('❌ API call failed!')
      console.log('Status:', apiError.response?.status)
      console.log('Error:', apiError.response?.data?.message || apiError.message)
      
      if (apiError.response?.status === 401) {
        console.log('   Authentication issue - token might be invalid')
      }
    }

  } catch (error) {
    console.error('❌ Error testing slot filtering API:', error.message)
    if (error.code === 'ECONNREFUSED') {
      console.error('   Server is not running on localhost:5000')
    }
  }
}

// Wait a moment for server to start, then run test
setTimeout(() => {
  testSlotFilteringAPI()
}, 3000)
