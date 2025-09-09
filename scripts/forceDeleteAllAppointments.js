import mongoose from 'mongoose'
import Appointment from '../models/Appointment.js'
import Slot from '../models/Slot.js'

async function forceDeleteAllAppointments() {
  console.log('🗑️  FORCE DELETING ALL APPOINTMENTS')
  console.log('=================================')
  console.log('⚠️  This will delete ALL appointments from the database!')
  console.log('This includes: scheduled, cancelled, pending, confirmed, etc.')
  console.log('')

  // Try different MongoDB connection strings
  const connectionStrings = [
    'mongodb://localhost:27017/kasam-healthcare',
    'mongodb://127.0.0.1:27017/kasam-healthcare',
    process.env.MONGODB_URI,
    'mongodb+srv://cluster0.mongodb.net/kasam-healthcare'
  ].filter(Boolean)

  let connected = false
  let connection

  for (const connectionString of connectionStrings) {
    try {
      console.log(`🔌 Trying to connect to: ${connectionString.replace(/\/\/.*@/, '//***@')}`)
      connection = await mongoose.connect(connectionString, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000
      })
      console.log('✅ Connected successfully!')
      connected = true
      break
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`)
    }
  }

  if (!connected) {
    console.log('\n❌ Could not connect to MongoDB with any connection string')
    console.log('📋 Manual deletion required. Use one of these methods:')
    console.log('')
    console.log('METHOD 1 - MongoDB Shell:')
    console.log('  mongosh kasam-healthcare')
    console.log('  db.appointments.deleteMany({})')
    console.log('  db.slots.updateMany({isBooked: true}, {$set: {isBooked: false, bookedBy: null, appointment: null}})')
    console.log('')
    console.log('METHOD 2 - MongoDB Compass:')
    console.log('  1. Open MongoDB Compass')
    console.log('  2. Connect to mongodb://localhost:27017')
    console.log('  3. Go to kasam-healthcare database')
    console.log('  4. Delete all documents in appointments collection')
    console.log('  5. Update slots collection to set isBooked: false')
    console.log('')
    console.log('METHOD 3 - Direct Command:')
    console.log('  mongosh --eval "use kasam-healthcare; db.appointments.deleteMany({}); db.slots.updateMany({isBooked: true}, {\\$set: {isBooked: false, bookedBy: null, appointment: null}})"')
    return
  }

  try {
    // Get initial counts
    const initialAppointmentCount = await Appointment.countDocuments()
    const initialBookedSlots = await Slot.countDocuments({ isBooked: true })
    
    console.log(`\n📊 Current Status:`)
    console.log(`   Total appointments: ${initialAppointmentCount}`)
    console.log(`   Booked slots: ${initialBookedSlots}`)

    if (initialAppointmentCount === 0) {
      console.log('\n✅ No appointments found to delete!')
      return
    }

    // Show breakdown by status
    const statusCounts = await Appointment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])
    
    console.log('\n📋 Appointments by status:')
    statusCounts.forEach(status => {
      console.log(`   ${status._id}: ${status.count}`)
    })

    console.log('\n🔄 Starting deletion process...')

    // Step 1: Free up all booked slots
    console.log('\n1️⃣ Freeing up booked slots...')
    const slotUpdateResult = await Slot.updateMany(
      { isBooked: true },
      { 
        $set: { 
          isBooked: false, 
          bookedBy: null, 
          appointment: null 
        } 
      }
    )
    console.log(`   ✅ Freed up ${slotUpdateResult.modifiedCount} slots`)

    // Step 2: Delete all appointments
    console.log('\n2️⃣ Deleting all appointments...')
    const deleteResult = await Appointment.deleteMany({})
    console.log(`   ✅ Deleted ${deleteResult.deletedCount} appointments`)

    // Step 3: Verify deletion
    console.log('\n3️⃣ Verifying deletion...')
    const finalAppointmentCount = await Appointment.countDocuments()
    const finalBookedSlots = await Slot.countDocuments({ isBooked: true })
    const totalSlots = await Slot.countDocuments()

    console.log(`\n📊 Final Status:`)
    console.log(`   Remaining appointments: ${finalAppointmentCount}`)
    console.log(`   Booked slots: ${finalBookedSlots}`)
    console.log(`   Available slots: ${totalSlots - finalBookedSlots}`)
    console.log(`   Total slots: ${totalSlots}`)

    if (finalAppointmentCount === 0 && finalBookedSlots === 0) {
      console.log('\n🎉 SUCCESS! All appointments deleted and slots freed up!')
      console.log('✅ Your appointment system is now clean')
      console.log('✅ All slots are available for new bookings')
      console.log('✅ Future cancellations will auto-delete appointments')
    } else {
      console.log('\n⚠️  Partial success:')
      if (finalAppointmentCount > 0) {
        console.log(`   ${finalAppointmentCount} appointments still remain`)
      }
      if (finalBookedSlots > 0) {
        console.log(`   ${finalBookedSlots} slots still marked as booked`)
      }
    }

  } catch (error) {
    console.error('\n❌ Error during deletion process:', error.message)
    console.log('\n📋 If this fails, try manual deletion:')
    console.log('   mongosh kasam-healthcare --eval "db.appointments.deleteMany({})"')
  } finally {
    if (connection) {
      await mongoose.disconnect()
      console.log('\n🔌 Disconnected from MongoDB')
    }
  }
}

// Run the deletion
forceDeleteAllAppointments().catch(console.error)
