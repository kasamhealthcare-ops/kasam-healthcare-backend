import axios from 'axios'

const testSlotFiltering = async () => {
  try {
    console.log('🧪 Testing slot filtering for past times...')
    
    const baseURL = 'http://localhost:5000/api'
    
    // Test with today's date
    const today = new Date()
    const todayString = today.toISOString().split('T')[0] // YYYY-MM-DD format
    
    console.log(`\n📅 Testing slots for today: ${todayString}`)
    console.log(`⏰ Current time: ${today.toLocaleTimeString()}`)
    
    try {
      const response = await axios.get(`${baseURL}/slots/available`, {
        params: {
          date: todayString,
          doctor: '6840e8b8c8c0a5e16f902f8b' // Use the admin/doctor ID
        }
      })
      
      console.log('\n✅ Slot filtering API response:')
      console.log(`   Total slots in database: ${response.data.data.totalSlots}`)
      console.log(`   Available slots (after filtering): ${response.data.data.availableSlots}`)
      console.log(`   Filtered past slots: ${response.data.data.filteredPastSlots}`)
      
      const slots = response.data.data.slots
      console.log(`\n📋 Returned slots (${slots.length}):`)
      
      if (slots.length === 0) {
        console.log('   No slots returned (all past slots filtered out)')
      } else {
        slots.forEach((slot, index) => {
          const now = new Date()
          const currentTime = now.getHours() * 60 + now.getMinutes()
          const [hours, minutes] = slot.startTime.split(':').map(Number)
          const slotTime = hours * 60 + minutes
          
          console.log(`   ${index + 1}. ${slot.startTime} - ${slot.endTime}`)
          console.log(`      Slot time in minutes: ${slotTime}`)
          console.log(`      Current time in minutes: ${currentTime}`)
          console.log(`      Is future: ${slotTime > currentTime ? '✅' : '❌'}`)
          console.log(`      Is booked: ${slot.isBooked ? 'Yes' : 'No'}`)
          console.log('')
        })
      }
      
      // Test with tomorrow's date (should show all slots)
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowString = tomorrow.toISOString().split('T')[0]
      
      console.log(`\n📅 Testing slots for tomorrow: ${tomorrowString}`)
      
      const tomorrowResponse = await axios.get(`${baseURL}/slots/available`, {
        params: {
          date: tomorrowString,
          doctor: '6840e8b8c8c0a5e16f902f8b'
        }
      })
      
      console.log('✅ Tomorrow\'s slots (should not be filtered):')
      console.log(`   Total slots: ${tomorrowResponse.data.data.totalSlots}`)
      console.log(`   Available slots: ${tomorrowResponse.data.data.availableSlots}`)
      console.log(`   Filtered past slots: ${tomorrowResponse.data.data.filteredPastSlots}`)
      
    } catch (apiError) {
      console.log('❌ API call failed!')
      console.log('Status:', apiError.response?.status)
      console.log('Error:', apiError.response?.data?.message || apiError.message)
    }

  } catch (error) {
    console.error('❌ Error testing slot filtering:', error.message)
  }
}

// Run the test
testSlotFiltering()
