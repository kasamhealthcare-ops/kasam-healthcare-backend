import axios from 'axios'

const testCancelAPI = async () => {
  try {
    console.log('🧪 Testing cancellation API directly...')
    
    const baseURL = 'http://localhost:5000/api'
    
    // Step 1: Login to get authentication token
    console.log('\n🔐 Logging in as patient...')
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'patient@example.com',
      password: 'password123'
    })
    
    if (!loginResponse.data.success) {
      console.log('❌ Login failed:', loginResponse.data.message)
      return
    }
    
    const token = loginResponse.data.token
    console.log('✅ Login successful')
    
    // Step 2: Test cancellation of the specific appointment
    const appointmentId = '684178e2d6d1e23f18287a12'
    console.log(`\n🎯 Attempting to cancel appointment: ${appointmentId}`)
    
    try {
      const cancelResponse = await axios.delete(`${baseURL}/appointments/${appointmentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('✅ Cancellation successful!')
      console.log('Response:', cancelResponse.data)
      
    } catch (cancelError) {
      console.log('❌ Cancellation failed!')
      console.log('Status:', cancelError.response?.status)
      console.log('Error message:', cancelError.response?.data?.message)
      console.log('Full error:', cancelError.response?.data)
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    if (error.code === 'ECONNREFUSED') {
      console.error('   Server is not running on localhost:5000')
    }
  }
}

// Run the test
testCancelAPI()
