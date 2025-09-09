import axios from 'axios'

const baseURL = 'http://localhost:5000/api'

async function testNewCancellation() {
  try {
    console.log('🧪 Testing New Cancellation Flow')
    console.log('================================')
    
    // Step 1: Login as patient
    console.log('\n1️⃣ Logging in as patient...')
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'amit@example.com',
      password: 'password123'
    })
    
    const token = loginResponse.data.token
    console.log('✅ Login successful')
    
    // Step 2: Get current appointments
    console.log('\n2️⃣ Fetching current appointments...')
    const appointmentsResponse = await axios.get(`${baseURL}/appointments`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    const appointments = appointmentsResponse.data.data
    console.log(`📋 Found ${appointments.length} appointments`)
    
    if (appointments.length === 0) {
      console.log('ℹ️  No appointments to test cancellation with')
      return
    }
    
    // Step 3: Try to cancel the first appointment
    const testAppointment = appointments[0]
    console.log(`\n3️⃣ Testing cancellation of appointment: ${testAppointment._id}`)
    console.log(`   Service: ${testAppointment.service}`)
    console.log(`   Status: ${testAppointment.status}`)
    console.log(`   Date: ${testAppointment.appointmentDate}`)
    console.log(`   Time: ${testAppointment.appointmentTime}`)
    
    try {
      const cancelResponse = await axios.delete(`${baseURL}/appointments/${testAppointment._id}/cancel`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      console.log('✅ Cancellation successful!')
      console.log('Response:', cancelResponse.data.message)
      
      // Step 4: Verify appointment is deleted
      console.log('\n4️⃣ Verifying appointment is deleted...')
      const updatedAppointmentsResponse = await axios.get(`${baseURL}/appointments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const updatedAppointments = updatedAppointmentsResponse.data.data
      const stillExists = updatedAppointments.find(apt => apt._id === testAppointment._id)
      
      if (stillExists) {
        console.log('❌ Appointment still exists after cancellation')
      } else {
        console.log('✅ Appointment successfully deleted after cancellation')
      }
      
      console.log(`📊 Appointments count: ${appointments.length} → ${updatedAppointments.length}`)
      
    } catch (cancelError) {
      console.log('❌ Cancellation failed!')
      console.log('Status:', cancelError.response?.status)
      console.log('Error message:', cancelError.response?.data?.message)
      console.log('Full error:', cancelError.response?.data)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    if (error.response) {
      console.error('Response status:', error.response.status)
      console.error('Response data:', error.response.data)
    }
  }
}

testNewCancellation()
