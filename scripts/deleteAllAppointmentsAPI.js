import axios from 'axios'

const baseURL = 'http://localhost:5000/api'

async function deleteAllAppointmentsAPI() {
  try {
    console.log('🗑️  Deleting ALL appointments via API')
    console.log('===================================')
    console.log('⚠️  WARNING: This will delete ALL appointments!')
    console.log('This action cannot be undone.\n')
    
    // Step 1: Login as admin or patient
    console.log('1️⃣ Logging in...')

    // Try different login credentials
    let loginResponse
    const credentials = [
      { email: 'admin@kasamhealthcare.com', password: 'admin123' },
      { email: 'patient@example.com', password: 'password123' },
      { email: 'alice.smith@example.com', password: 'password123' },
      { email: 'bob.wilson@example.com', password: 'password123' }
    ]

    for (const cred of credentials) {
      try {
        console.log(`   Trying ${cred.email}...`)
        loginResponse = await axios.post(`${baseURL}/auth/login`, cred)
        console.log(`   ✅ Login successful with ${cred.email}`)
        break
      } catch (err) {
        console.log(`   ❌ Failed with ${cred.email}`)
      }
    }

    if (!loginResponse) {
      throw new Error('All login attempts failed')
    }
    
    const token = loginResponse.data.token
    console.log('✅ Login successful')
    
    // Step 2: Get all appointments
    console.log('\n2️⃣ Fetching all appointments...')
    const appointmentsResponse = await axios.get(`${baseURL}/appointments`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    const appointments = appointmentsResponse.data.data
    console.log(`📋 Found ${appointments.length} appointments to delete`)
    
    if (appointments.length === 0) {
      console.log('✅ No appointments to delete')
      return
    }
    
    // Step 3: Delete each appointment
    console.log('\n3️⃣ Deleting appointments...')
    
    let successCount = 0
    let failCount = 0
    
    for (let i = 0; i < appointments.length; i++) {
      const appointment = appointments[i]
      console.log(`\n📋 Processing ${i + 1}/${appointments.length}`)
      console.log(`   ID: ${appointment._id}`)
      console.log(`   Service: ${appointment.service}`)
      console.log(`   Status: ${appointment.status}`)
      console.log(`   Date: ${appointment.appointmentDate}`)
      console.log(`   Time: ${appointment.appointmentTime}`)
      
      try {
        // Use the regular DELETE endpoint (works for all appointments now)
        const deleteResponse = await axios.delete(`${baseURL}/appointments/${appointment._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        console.log('   ✅ Successfully deleted')
        successCount++
        
      } catch (error) {
        console.log('   ❌ Failed to delete')
        console.log(`   Status: ${error.response?.status}`)
        console.log(`   Error: ${error.response?.data?.message}`)
        failCount++
        
        // If regular DELETE fails, try the cancel endpoint
        if (appointment.status !== 'cancelled' && appointment.status !== 'completed' && appointment.status !== 'no-show') {
          try {
            console.log('   🔄 Trying cancel endpoint...')
            const cancelResponse = await axios.delete(`${baseURL}/appointments/${appointment._id}/cancel`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
            
            console.log('   ✅ Successfully cancelled/deleted')
            successCount++
            failCount-- // Adjust the fail count
            
          } catch (cancelError) {
            console.log('   ❌ Cancel also failed')
            console.log(`   Cancel Error: ${cancelError.response?.data?.message}`)
          }
        }
      }
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log(`\n📊 Deletion Summary:`)
    console.log(`   ✅ Successfully deleted: ${successCount}`)
    console.log(`   ❌ Failed to delete: ${failCount}`)
    console.log(`   📋 Total processed: ${appointments.length}`)
    
    // Step 4: Verify deletion
    console.log('\n4️⃣ Verifying deletion...')
    try {
      const verifyResponse = await axios.get(`${baseURL}/appointments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const remainingAppointments = verifyResponse.data.data
      console.log(`📋 Remaining appointments: ${remainingAppointments.length}`)
      
      if (remainingAppointments.length === 0) {
        console.log('🎉 All appointments have been successfully deleted!')
      } else {
        console.log('⚠️  Some appointments still remain:')
        remainingAppointments.forEach(apt => {
          console.log(`   - ${apt._id}: ${apt.service} (${apt.status})`)
        })
      }
      
    } catch (verifyError) {
      console.log('❌ Failed to verify deletion')
      console.log(`Error: ${verifyError.response?.data?.message}`)
    }
    
  } catch (error) {
    console.error('❌ Deletion process failed:', error.message)
    if (error.response) {
      console.error('Response status:', error.response.status)
      console.error('Response data:', error.response.data)
    }
  }
}

deleteAllAppointmentsAPI()
