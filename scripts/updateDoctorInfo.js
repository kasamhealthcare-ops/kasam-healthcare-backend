import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'

// Load environment variables
dotenv.config()

const updateDoctorInfo = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    console.log('🔧 Updating doctor information in database...\n')

    // Find the admin user (who acts as the doctor)
    let adminUser = await User.findOne({
      email: 'admin@kasamhealthcare.com',
      role: 'admin'
    })

    if (!adminUser) {
      console.log('❌ Admin user not found, creating new admin user...')
      
      // Create admin user with Dr. Jignesh Parmar info
      adminUser = new User({
        firstName: 'Dr. Jignesh',
        lastName: 'Parmar',
        email: 'admin@kasamhealthcare.com',
        password: 'admin123', // Default password
        role: 'admin',
        phone: '+919898440880',
        isActive: true,
        isEmailVerified: true,
        medicalInfo: {
          specialization: 'General Medicine & Holistic Health'
        }
      })
      
      await adminUser.save()
      console.log('✅ Created new admin user: Dr. Jignesh Parmar')
    } else {
      // Update existing admin user to have correct doctor info
      adminUser.firstName = 'Dr. Jignesh'
      adminUser.lastName = 'Parmar'
      adminUser.phone = '+919898440880'

      // Ensure medicalInfo exists and set specialization
      if (!adminUser.medicalInfo) {
        adminUser.medicalInfo = {}
      }
      adminUser.medicalInfo.specialization = 'General Medicine & Holistic Health'
      
      await adminUser.save()
      console.log('✅ Updated admin user to: Dr. Jignesh Parmar')
    }

    console.log(`📋 Current admin/doctor: ${adminUser.firstName} ${adminUser.lastName}`)
    console.log(`📧 Email: ${adminUser.email}`)
    console.log(`👤 Role: ${adminUser.role}`)
    console.log(`📞 Phone: ${adminUser.phone}`)
    console.log(`🏥 Specialization: ${adminUser.medicalInfo?.specialization || 'Not set'}`)

    // Clean up any old doctor entries that are not the admin
    const oldDoctors = await User.find({
      role: 'doctor',
      email: { $ne: 'admin@kasamhealthcare.com' }
    })

    if (oldDoctors.length > 0) {
      console.log(`\n🗑️ Found ${oldDoctors.length} old doctor entries to clean up:`)
      for (const doctor of oldDoctors) {
        console.log(`   Removing: ${doctor.firstName} ${doctor.lastName} (${doctor.email})`)
        await User.findByIdAndDelete(doctor._id)
      }
      console.log('✅ Cleaned up old doctor entries')
    }

    // Update any existing slots to use the admin user as doctor
    const Slot = (await import('../models/Slot.js')).default
    const slotsUpdated = await Slot.updateMany(
      { doctor: { $ne: adminUser._id } },
      { doctor: adminUser._id }
    )
    
    if (slotsUpdated.modifiedCount > 0) {
      console.log(`✅ Updated ${slotsUpdated.modifiedCount} slots to use Dr. Jignesh Parmar`)
    }

    console.log('\n✅ Doctor information update completed!')
    console.log('\n🔑 Login Credentials:')
    console.log('   Admin/Doctor: admin@kasamhealthcare.com / admin123')

  } catch (error) {
    console.error('❌ Error updating doctor information:', error)
  } finally {
    await mongoose.disconnect()
    console.log('👋 Disconnected from MongoDB')
    process.exit(0)
  }
}

// Run the update
updateDoctorInfo()
