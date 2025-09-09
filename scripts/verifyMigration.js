import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Appointment from '../models/Appointment.js'
import Slot from '../models/Slot.js'
import User from '../models/User.js'

dotenv.config()

const verifyMigration = async () => {
  try {
    console.log('🔍 Verifying migration results...')
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    // Check current slot distribution
    console.log('\n📅 Current slot distribution:')
    const slotsByLocation = await Slot.aggregate([
      { $group: { _id: '$location', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])

    slotsByLocation.forEach(({ _id, count }) => {
      console.log(`   ${_id}: ${count} slots`)
    })

    // Check for any invalid locations
    const validLocations = ['ghodasar', 'vastral', 'gandhinagar', 'clinic', 'hospital', 'home', 'online']
    const invalidSlots = await Slot.find({ location: { $nin: validLocations } })
    
    if (invalidSlots.length > 0) {
      console.log('\n⚠️  Found slots with invalid locations:')
      invalidSlots.forEach(slot => {
        console.log(`   Slot ID: ${slot._id}, Location: "${slot.location}", Date: ${slot.date}`)
      })
    } else {
      console.log('\n✅ All slots have valid locations')
    }

    // Check appointments
    console.log('\n📋 Current appointment distribution:')
    const appointmentsByLocation = await Appointment.aggregate([
      { $group: { _id: '$location', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])

    if (appointmentsByLocation.length > 0) {
      appointmentsByLocation.forEach(({ _id, count }) => {
        console.log(`   ${_id}: ${count} appointments`)
      })
    } else {
      console.log('   No appointments found')
    }

    // Check for any invalid appointment locations
    const invalidAppointments = await Appointment.find({ location: { $nin: validLocations } })
    
    if (invalidAppointments.length > 0) {
      console.log('\n⚠️  Found appointments with invalid locations:')
      invalidAppointments.forEach(appointment => {
        console.log(`   Appointment ID: ${appointment._id}, Location: "${appointment.location}"`)
      })
    } else {
      console.log('\n✅ All appointments have valid locations')
    }

    // Sample some slots to verify they look correct
    console.log('\n📋 Sample slots from each location:')
    for (const location of ['ghodasar', 'vastral', 'gandhinagar']) {
      const sampleSlots = await Slot.find({ location }).limit(3).sort({ date: 1, startTime: 1 })
      if (sampleSlots.length > 0) {
        console.log(`\n   ${location.toUpperCase()} (showing ${sampleSlots.length} samples):`)
        sampleSlots.forEach((slot, index) => {
          console.log(`   ${index + 1}. ${slot.date?.toDateString()} ${slot.startTime}-${slot.endTime} (Available: ${slot.isAvailable})`)
        })
      }
    }

    console.log('\n✅ Migration verification completed!')

  } catch (error) {
    console.error('❌ Verification failed:', error)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Disconnected from MongoDB')
  }
}

// Run the verification
verifyMigration()
