import fetch from 'node-fetch'

const testSlotsAPI = async () => {
  try {
    console.log('🧪 Testing Slots API...')
    
    // Test the API endpoint directly
    const response = await fetch('http://localhost:5000/api/slots/available?date=2024-12-12', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    console.log(`📡 Response Status: ${response.status}`)
    console.log(`📡 Response Status Text: ${response.statusText}`)
    
    const data = await response.text()
    console.log(`📡 Response Body:`)
    console.log(data)
    
    if (response.ok) {
      try {
        const jsonData = JSON.parse(data)
        console.log(`\n✅ Parsed JSON:`)
        console.log(`   Success: ${jsonData.success}`)
        console.log(`   Slots count: ${jsonData.data?.slots?.length || 0}`)
        
        if (jsonData.data?.slots?.length > 0) {
          console.log(`   First slot: ${jsonData.data.slots[0].startTime}-${jsonData.data.slots[0].endTime} at ${jsonData.data.slots[0].location}`)
        }
      } catch (parseError) {
        console.log(`❌ Failed to parse JSON: ${parseError.message}`)
      }
    }
    
  } catch (error) {
    console.error('❌ API Test Error:', error.message)
  }
}

// Run test
testSlotsAPI()
