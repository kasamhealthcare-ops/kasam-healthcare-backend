import axios from 'axios'

const baseURL = 'http://localhost:5000/api'

// List of cancelled appointment IDs from the previous check
const cancelledAppointmentIds = [
  '6849682c5cf9a89015819d96',
  '684968045cf9a89015819d78', 
  '684965f95cf9a89015819d55',
  '68494eae53051a732489ce94'
]

async function cleanupViaAPI() {
  try {
    console.log('🧹 Cleaning up cancelled appointments via API')
    console.log('============================================')
    
    // Step 1: Login as admin or patient
    console.log('\n1️⃣ Logging in...')
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'amit@example.com',  // Try patient first
      password: 'password123'
    })
    
    const token = loginResponse.data.token
    console.log('✅ Login successful')
    
    // Step 2: Clean up each cancelled appointment
    console.log(`\n2️⃣ Cleaning up ${cancelledAppointmentIds.length} cancelled appointments...`)
    
    let successCount = 0
    let failCount = 0
    
    for (let i = 0; i < cancelledAppointmentIds.length; i++) {
      const appointmentId = cancelledAppointmentIds[i]
      console.log(`\n📋 Processing appointment ${i + 1}/${cancelledAppointmentIds.length}`)
      console.log(`   ID: ${appointmentId}`)
      
      try {
        // Try the regular DELETE endpoint since these are already cancelled
        const deleteResponse = await axios.delete(`${baseURL}/appointments/${appointmentId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        console.log('   ✅ Successfully deleted')
        console.log(`   Response: ${deleteResponse.data.message}`)
        successCount++
        
      } catch (error) {
        console.log('   ❌ Failed to delete')
        console.log(`   Status: ${error.response?.status}`)
        console.log(`   Error: ${error.response?.data?.message}`)
        failCount++
      }
    }
    
    console.log(`\n📊 Cleanup Summary:`)
    console.log(`   ✅ Successfully deleted: ${successCount}`)
    console.log(`   ❌ Failed to delete: ${failCount}`)
    console.log(`   📋 Total processed: ${cancelledAppointmentIds.length}`)
    
    if (successCount === cancelledAppointmentIds.length) {
      console.log('\n🎉 All cancelled appointments have been successfully cleaned up!')
    } else if (successCount > 0) {
      console.log('\n⚠️  Some appointments were cleaned up, but some failed.')
    } else {
      console.log('\n❌ No appointments were successfully cleaned up.')
    }
    
    // Step 3: Verify by checking remaining appointments
    console.log('\n3️⃣ Verifying cleanup...')
    try {
      const appointmentsResponse = await axios.get(`${baseURL}/appointments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const appointments = appointmentsResponse.data.data
      const cancelledAppointments = appointments.filter(apt => apt.status === 'cancelled')
      
      console.log(`📋 Current appointments: ${appointments.length}`)
      console.log(`❌ Cancelled appointments remaining: ${cancelledAppointments.length}`)
      
      if (cancelledAppointments.length === 0) {
        console.log('✅ No cancelled appointments remaining!')
      } else {
        console.log('⚠️  Some cancelled appointments still exist:')
        cancelledAppointments.forEach(apt => {
          console.log(`   - ${apt._id}: ${apt.service} (${apt.status})`)
        })
      }
      
    } catch (verifyError) {
      console.log('❌ Failed to verify cleanup')
      console.log(`Error: ${verifyError.response?.data?.message}`)
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message)
    if (error.response) {
      console.error('Response status:', error.response.status)
      console.error('Response data:', error.response.data)
    }
  }
}

cleanupViaAPI()
