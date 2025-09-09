import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'

dotenv.config()

const updateAdminRole = async () => {
  try {
    console.log('👨‍⚕️ Updating admin role to include doctor privileges...')
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    // Find the admin user
    const admin = await User.findOne({ email: 'admin@kasamhealthcare.com' })
    if (!admin) {
      console.log('❌ Admin user not found')
      return
    }

    console.log(`👤 Found admin: ${admin.firstName} ${admin.lastName} (${admin.email})`)
    console.log(`   Current role: ${admin.role}`)

    // Update role to doctor (since admin is also the doctor)
    const result = await User.updateOne(
      { email: 'admin@kasamhealthcare.com' },
      { $set: { role: 'doctor' } }
    )

    if (result.modifiedCount > 0) {
      console.log('✅ Successfully updated admin role to doctor')
      
      // Verify the change
      const updatedAdmin = await User.findOne({ email: 'admin@kasamhealthcare.com' })
      console.log(`   New role: ${updatedAdmin.role}`)
    } else {
      console.log('ℹ️  No changes made (role may already be correct)')
    }

  } catch (error) {
    console.error('❌ Update failed:', error)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Disconnected from MongoDB')
  }
}

// Run the update
updateAdminRole()
