import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'
import Slot from '../models/Slot.js'
import Appointment from '../models/Appointment.js'

// Load environment variables
dotenv.config()

const cleanupUsers = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    // Keep only these users:
    const usersToKeep = [
      'admin@kasamhealthcare.com',  // Admin
      'patient@example.com'         // One patient
    ]

    // Find all users
    const allUsers = await User.find({})
    console.log(`👥 Found ${allUsers.length} users in database`)

    // Find users to delete
    const usersToDelete = allUsers.filter(user => !usersToKeep.includes(user.email))
    console.log(`🗑️  Will delete ${usersToDelete.length} users:`)
    
    usersToDelete.forEach(user => {
      console.log(`   - ${user.firstName} ${user.lastName} (${user.email}) - ${user.role}`)
    })

    if (usersToDelete.length > 0) {
      // Delete appointments for users being deleted
      const userIdsToDelete = usersToDelete.map(user => user._id)
      
      const appointmentsDeleted = await Appointment.deleteMany({
        $or: [
          { patient: { $in: userIdsToDelete } },
          { doctor: { $in: userIdsToDelete } }
        ]
      })
      console.log(`🗑️  Deleted ${appointmentsDeleted.deletedCount} appointments`)

      // Delete slots for doctors being deleted
      const slotsDeleted = await Slot.deleteMany({
        $or: [
          { doctor: { $in: userIdsToDelete } },
          { createdBy: { $in: userIdsToDelete } }
        ]
      })
      console.log(`🗑️  Deleted ${slotsDeleted.deletedCount} slots`)

      // Delete the users
      const result = await User.deleteMany({
        _id: { $in: userIdsToDelete }
      })
      console.log(`🗑️  Deleted ${result.deletedCount} users`)
    }

    // Update the admin user to be the doctor
    const adminUser = await User.findOne({ email: 'admin@kasamhealthcare.com' })
    if (adminUser) {
      // Only update role and specialization, keep existing name
      adminUser.role = 'admin' // Keep as admin but will also act as doctor
      adminUser.specialization = 'General Medicine'
      adminUser.phone = '+919898440880'
      await adminUser.save()
      console.log(`✅ Updated admin user: ${adminUser.firstName} ${adminUser.lastName}`)
    }

    // Update the patient user
    const patientUser = await User.findOne({ email: 'patient@example.com' })
    if (patientUser) {
      patientUser.firstName = 'Test'
      patientUser.lastName = 'Patient'
      patientUser.phone = '+919876543210'
      await patientUser.save()
      console.log(`✅ Updated patient user: ${patientUser.firstName} ${patientUser.lastName}`)
    }

    // Show final user count
    const finalUsers = await User.find({})
    console.log(`\n✅ Final user count: ${finalUsers.length}`)
    finalUsers.forEach(user => {
      console.log(`   - ${user.firstName} ${user.lastName} (${user.email}) - ${user.role}`)
    })

  } catch (error) {
    console.error('❌ Error cleaning up users:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Database connection closed')
    process.exit(0)
  }
}

// Run cleanup
cleanupUsers()
