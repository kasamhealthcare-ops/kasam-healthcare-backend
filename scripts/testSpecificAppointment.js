import axios from 'axios'

const baseURL = 'http://localhost:5000/api'
const appointmentId = '6849682c5cf9a89015819d96'

async function testSpecificAppointment() {
  try {
    console.log('🎯 Testing Specific Appointment Cancellation')
    console.log('==========================================')
    console.log(`Appointment ID: ${appointmentId}`)
    
    // Step 1: Login as patient
    console.log('\n1️⃣ Logging in as patient...')
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'amit@example.com',
      password: 'password123'
    })
    
    const token = loginResponse.data.token
    console.log('✅ Login successful')
    
    // Step 2: Try to get the specific appointment
    console.log('\n2️⃣ Checking if appointment exists...')
    try {
      const appointmentResponse = await axios.get(`${baseURL}/appointments/${appointmentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const appointment = appointmentResponse.data.data
      console.log('✅ Appointment found!')
      console.log(`   Service: ${appointment.service}`)
      console.log(`   Status: ${appointment.status}`)
      console.log(`   Date: ${appointment.appointmentDate}`)
      console.log(`   Time: ${appointment.appointmentTime}`)
      
      // Step 3: Try to cancel using the new endpoint
      console.log('\n3️⃣ Testing cancellation with /cancel endpoint...')
      try {
        const cancelResponse = await axios.delete(`${baseURL}/appointments/${appointmentId}/cancel`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        console.log('✅ Cancellation successful!')
        console.log('Response:', cancelResponse.data.message)
        
      } catch (cancelError) {
        console.log('❌ Cancellation with /cancel failed!')
        console.log('Status:', cancelError.response?.status)
        console.log('Error message:', cancelError.response?.data?.message)
        
        // Step 4: Try with regular DELETE endpoint
        console.log('\n4️⃣ Testing with regular DELETE endpoint...')
        try {
          const deleteResponse = await axios.delete(`${baseURL}/appointments/${appointmentId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          
          console.log('✅ Deletion successful!')
          console.log('Response:', deleteResponse.data.message)
          
        } catch (deleteError) {
          console.log('❌ Regular deletion also failed!')
          console.log('Status:', deleteError.response?.status)
          console.log('Error message:', deleteError.response?.data?.message)
        }
      }
      
    } catch (getError) {
      console.log('❌ Appointment not found or access denied')
      console.log('Status:', getError.response?.status)
      console.log('Error message:', getError.response?.data?.message)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    if (error.response) {
      console.error('Response status:', error.response.status)
      console.error('Response data:', error.response.data)
    }
  }
}

testSpecificAppointment()
