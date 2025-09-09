import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'

// Load environment variables
dotenv.config()

const checkDoctorInfo = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    console.log('🔧 Checking doctor information in database...\n')

    // Find the admin user (who acts as the doctor)
    const adminUser = await User.findOne({
      email: 'admin@kasamhealthcare.com',
      role: 'admin'
    })

    if (!adminUser) {
      console.log('❌ Admin user not found')
      return
    }

    console.log(`📋 Current admin user: ${adminUser.firstName} ${adminUser.lastName}`)
    console.log(`📧 Email: ${adminUser.email}`)
    console.log(`� Role: ${adminUser.role}`)
    console.log(`📞 Phone: ${adminUser.phone || 'Not set'}`)
    console.log(`🏥 Specialization: ${adminUser.specialization || 'Not set'}`)

    // Check if admin user has correct doctor name (Dr. Jignesh Parmar)
    if (adminUser.firstName !== 'Dr. Jignesh' || adminUser.lastName !== 'Parmar') {
      console.log(`\n⚠️  Admin user name needs updating:`)
      console.log(`   Current: ${adminUser.firstName} ${adminUser.lastName}`)
      console.log(`   Expected: Dr. Jignesh Parmar`)
      console.log(`\n💡 Run 'node scripts/updateDoctorInfo.js' to fix this.`)
    } else {
      console.log('\n✅ Admin user has correct doctor name: Dr. Jignesh Parmar')
    }

    console.log('\n✅ Doctor information check completed!')

  } catch (error) {
    console.error('❌ Error checking doctor information:', error)
  } finally {
    await mongoose.disconnect()
    console.log('👋 Disconnected from MongoDB')
    process.exit(0)
  }
}

// Run the check
checkDoctorInfo()
