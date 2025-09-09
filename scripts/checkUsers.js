import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'

// Load environment variables
dotenv.config()

const checkUsers = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    // Check existing users
    const users = await User.find({})
    console.log(`\n👥 Found ${users.length} users in database:`)
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName}`)
      console.log(`   Email: ${user.email}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Active: ${user.isActive}`)
      console.log(`   Created: ${user.createdAt}`)
      console.log('   ---')
    })

    if (users.length === 0) {
      console.log('❌ No users found in database')
      console.log('💡 You need to register a user first')
    }

    // Check for admin/doctor users
    const adminUsers = await User.find({ role: { $in: ['admin', 'doctor'] } })
    console.log(`\n🏥 Admin/Doctor users: ${adminUsers.length}`)
    
    adminUsers.forEach((user) => {
      console.log(`   - ${user.firstName} ${user.lastName} (${user.role})`)
    })

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Database connection closed')
    process.exit(0)
  }
}

// Run the script
checkUsers()
