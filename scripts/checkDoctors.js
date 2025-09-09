import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'

// Load environment variables
dotenv.config()

const checkDoctors = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    console.log('🔍 Checking all doctors in database...\n')

    // Find all users with doctor role
    const doctors = await User.find({
      role: 'doctor',
      isActive: true
    }).select('firstName lastName email phone role medicalInfo isActive createdAt')

    // Find all users with admin role (who act as doctors)
    const admins = await User.find({
      role: 'admin',
      isActive: true
    }).select('firstName lastName email phone role medicalInfo isActive createdAt')

    // Find any inactive doctors/admins
    const inactiveDoctors = await User.find({
      role: { $in: ['doctor', 'admin'] },
      isActive: false
    }).select('firstName lastName email phone role medicalInfo isActive createdAt')

    console.log('👨‍⚕️ ACTIVE DOCTORS:')
    console.log('=' .repeat(60))
    
    if (doctors.length > 0) {
      doctors.forEach((doctor, index) => {
        console.log(`${index + 1}. ${doctor.firstName} ${doctor.lastName}`)
        console.log(`   📧 Email: ${doctor.email}`)
        console.log(`   📞 Phone: ${doctor.phone || 'Not set'}`)
        console.log(`   👤 Role: ${doctor.role}`)
        console.log(`   🏥 Specialization: ${doctor.medicalInfo?.specialization || 'Not set'}`)
        console.log(`   📅 Created: ${doctor.createdAt}`)
        console.log('')
      })
    } else {
      console.log('❌ No active doctors found with role "doctor"')
    }

    console.log('\n👑 ADMIN USERS (Acting as Doctors):')
    console.log('=' .repeat(60))
    
    if (admins.length > 0) {
      admins.forEach((admin, index) => {
        console.log(`${index + 1}. ${admin.firstName} ${admin.lastName}`)
        console.log(`   📧 Email: ${admin.email}`)
        console.log(`   📞 Phone: ${admin.phone || 'Not set'}`)
        console.log(`   👤 Role: ${admin.role}`)
        console.log(`   🏥 Specialization: ${admin.medicalInfo?.specialization || 'Not set'}`)
        console.log(`   📅 Created: ${admin.createdAt}`)
        console.log('')
      })
    } else {
      console.log('❌ No active admin users found')
    }

    if (inactiveDoctors.length > 0) {
      console.log('\n⚠️  INACTIVE DOCTORS/ADMINS:')
      console.log('=' .repeat(60))
      
      inactiveDoctors.forEach((doctor, index) => {
        console.log(`${index + 1}. ${doctor.firstName} ${doctor.lastName}`)
        console.log(`   📧 Email: ${doctor.email}`)
        console.log(`   👤 Role: ${doctor.role}`)
        console.log(`   ❌ Status: Inactive`)
        console.log('')
      })
    }

    // Summary
    const totalActiveDoctors = doctors.length + admins.length
    console.log('\n📊 SUMMARY:')
    console.log('=' .repeat(60))
    console.log(`Total Active Doctors: ${doctors.length}`)
    console.log(`Total Active Admins: ${admins.length}`)
    console.log(`Total Active Doctor/Admin Users: ${totalActiveDoctors}`)
    console.log(`Inactive Doctor/Admin Users: ${inactiveDoctors.length}`)

    if (totalActiveDoctors === 0) {
      console.log('\n⚠️  WARNING: No active doctors or admins found!')
      console.log('💡 Run "npm run update-doctor" to create Dr. Jignesh Parmar as admin/doctor')
    } else if (totalActiveDoctors === 1) {
      console.log('\n✅ Perfect! You have exactly 1 active doctor/admin (single-doctor practice)')
    } else {
      console.log('\n⚠️  You have multiple doctors/admins. Consider cleaning up if you want single-doctor practice.')
    }

    console.log('\n✅ Doctor check completed!')

  } catch (error) {
    console.error('❌ Error checking doctors:', error)
  } finally {
    await mongoose.disconnect()
    console.log('👋 Disconnected from MongoDB')
    process.exit(0)
  }
}

// Run the check
checkDoctors()
