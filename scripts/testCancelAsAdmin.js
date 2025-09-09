import axios from 'axios'

const testCancelAsAdmin = async () => {
  try {
    console.log('🧪 Testing cancellation API as admin...')
    
    const baseURL = 'http://localhost:5000/api'
    
    // Step 1: Login as admin
    console.log('\n🔐 Logging in as admin...')
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'admin@kasamhealthcare.com',
      password: 'admin123'
    })
    
    if (!loginResponse.data.success) {
      console.log('❌ Admin login failed:', loginResponse.data.message)
      return
    }
    
    const token = loginResponse.data.data.token
    console.log('✅ Admin login successful')
    console.log('Token exists:', !!token)
    if (token) {
      console.log('Token preview:', token.substring(0, 20) + '...')
    } else {
      console.log('❌ No token received!')
      console.log('Login response:', loginResponse.data)
      return
    }
    
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
      
      if (cancelError.response?.status === 400 && 
          cancelError.response?.data?.message === 'This appointment cannot be cancelled') {
        console.log('\n🔍 The canBeCancelled() method is still returning false')
        console.log('   This suggests the server is still running old code')
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    if (error.code === 'ECONNREFUSED') {
      console.error('   Server is not running on localhost:5000')
    }
  }
}

// Run the test
testCancelAsAdmin()
