import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Appointment from '../models/Appointment.js'
import User from '../models/User.js'

// Load environment variables
dotenv.config()

const fixPendingAppointments = async () => {
  try {
    console.log('🔧 Starting to fix pending appointments...')
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kasam-healthcare')
    console.log('✅ Connected to MongoDB')

    // Find all pending appointments
    const pendingAppointments = await Appointment.find({ status: 'pending' })
      .populate('patient', 'firstName lastName email')
      .populate('doctor', 'firstName lastName')

    console.log(`\n📋 Found ${pendingAppointments.length} pending appointments`)

    if (pendingAppointments.length === 0) {
      console.log('✅ No pending appointments to fix!')
      return
    }

    // Display pending appointments
    console.log('\n📝 Pending appointments to be updated:')
    pendingAppointments.forEach((appointment, index) => {
      console.log(`${index + 1}. ${appointment.service} - ${appointment.patient.firstName} ${appointment.patient.lastName}`)
      console.log(`   Date: ${appointment.appointmentDate.toDateString()}`)
      console.log(`   Time: ${appointment.appointmentTime}`)
      console.log(`   Reason: ${appointment.reason}`)
      console.log(`   Current Status: ${appointment.status}`)
      console.log('')
    })

    // Update all pending appointments to confirmed
    const updateResult = await Appointment.updateMany(
      { status: 'pending' },
      { 
        status: 'confirmed',
        updatedAt: new Date()
      }
    )

    console.log(`✅ Successfully updated ${updateResult.modifiedCount} appointments from 'pending' to 'confirmed'`)

    // Verify the update
    const remainingPending = await Appointment.countDocuments({ status: 'pending' })
    const confirmedCount = await Appointment.countDocuments({ status: 'confirmed' })

    console.log(`\n📊 Final Status:`)
    console.log(`   Remaining pending appointments: ${remainingPending}`)
    console.log(`   Total confirmed appointments: ${confirmedCount}`)

    if (remainingPending === 0) {
      console.log('\n🎉 All appointments are now properly confirmed!')
      console.log('   Patients will no longer see "Waiting for approval" message')
      console.log('   Appointments can now be cancelled directly')
    }

  } catch (error) {
    console.error('❌ Error fixing pending appointments:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Database connection closed')
    process.exit(0)
  }
}

// Run the fix
fixPendingAppointments()
