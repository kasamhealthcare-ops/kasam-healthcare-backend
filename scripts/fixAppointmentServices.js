import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Appointment from '../models/Appointment.js'

// Load environment variables
dotenv.config()

const fixAppointmentServices = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    console.log('\n🔧 Fixing appointment service values...')

    // Mapping from old service values to new service values
    const serviceMapping = {
      'General Checkup': 'Homoepathic Medicine',
      'Consultation': 'Homoepathic Medicine',
      'Follow-up': 'Homoepathic Medicine',
      'Cardiology': 'Homoepathic Medicine',
      'Dermatology': 'Dermatologist Problems',
      'Neurology': 'Homoepathic Medicine',
      'Orthopedics': 'Ortho Problems',
      'Pediatrics': 'Paediatric Problems',
      'Gynecology': 'Gynaecological Problems',
      'Psychiatry': 'Homoepathic Medicine',
      'Emergency': 'Homoepathic Medicine',
      'Vaccination': 'Homoepathic Medicine',
      'Lab Test': 'Homoepathic Medicine',
      'Radiology': 'Homoepathic Medicine',
      'Physical Therapy': 'Ortho Problems'
    }

    // Get all appointments with old service values
    const oldServices = Object.keys(serviceMapping)
    const appointmentsToUpdate = await Appointment.find({
      service: { $in: oldServices }
    })

    console.log(`\n📋 Found ${appointmentsToUpdate.length} appointments with old service values`)

    if (appointmentsToUpdate.length === 0) {
      console.log('✅ No appointments need service updates')
      return
    }

    // Update each appointment
    let updatedCount = 0
    for (const appointment of appointmentsToUpdate) {
      const oldService = appointment.service
      const newService = serviceMapping[oldService]
      
      if (newService) {
        console.log(`   Updating: "${oldService}" → "${newService}"`)
        appointment.service = newService
        await appointment.save()
        updatedCount++
      }
    }

    console.log(`\n✅ Updated ${updatedCount} appointments`)

    // Verify the changes
    console.log('\n🔍 Verification:')
    const remainingOldServices = await Appointment.find({
      service: { $in: oldServices }
    })
    
    const newServiceCounts = {}
    const newServices = [
      'Gynaecological Problems',
      'Dermatologist Problems',
      'Ortho Problems',
      'Paediatric Problems',
      'Skin Related Issues',
      'Sex Related Problems',
      'Urology Problems',
      'Ayurvedic Treatment',
      'Homoepathic Medicine',
      'Other'
    ]

    for (const service of newServices) {
      const count = await Appointment.countDocuments({ service })
      if (count > 0) {
        newServiceCounts[service] = count
      }
    }

    console.log(`   Appointments with old services (should be 0): ${remainingOldServices.length}`)
    console.log('   Appointments with new services:')
    Object.entries(newServiceCounts).forEach(([service, count]) => {
      console.log(`     ${service}: ${count}`)
    })

    if (remainingOldServices.length === 0) {
      console.log('\n🎉 All service updates completed successfully!')
    } else {
      console.log('\n⚠️  Some appointments still have old service values:')
      remainingOldServices.forEach(apt => {
        console.log(`     ID: ${apt._id}, Service: "${apt.service}"`)
      })
    }

  } catch (error) {
    console.error('❌ Error fixing services:', error)
  } finally {
    await mongoose.disconnect()
    console.log('\n📤 Disconnected from MongoDB')
  }
}

// Run the script
fixAppointmentServices()
