import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'

// Load environment variables
dotenv.config()

/**
 * Migration script to update users with "USA" country to "India"
 * This fixes legacy data where users had "USA" as default country
 */
const migrateUSAToIndia = async () => {
  try {
    console.log('🌍 Starting USA to India Country Migration...')
    console.log('=' .repeat(60))

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    // Find all users with USA as country
    console.log('\n🔍 Finding users with USA as country...')
    const usersWithUSA = await User.find({
      'address.country': { $in: ['USA', 'United States', 'US'] }
    }).select('firstName lastName email address')

    console.log(`📊 Found ${usersWithUSA.length} users with USA/US country`)

    if (usersWithUSA.length === 0) {
      console.log('✅ No users found with USA country. Migration not needed.')
      return
    }

    // Display users that will be updated
    console.log('\n👥 Users to be updated:')
    usersWithUSA.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} (${user.email}) - ${user.address?.country}`)
    })

    // Update all users with USA to India
    console.log('\n🔄 Updating users...')
    const updateResult = await User.updateMany(
      { 'address.country': { $in: ['USA', 'United States', 'US'] } },
      { 
        $set: { 
          'address.country': 'India',
          'updatedAt': new Date()
        } 
      }
    )

    console.log(`✅ Updated ${updateResult.modifiedCount} users successfully`)

    // Verify the update
    console.log('\n🔍 Verifying update...')
    const remainingUSAUsers = await User.countDocuments({
      'address.country': { $in: ['USA', 'United States', 'US'] }
    })

    const indiaUsers = await User.countDocuments({
      'address.country': 'India'
    })

    console.log(`   ✓ Remaining USA users: ${remainingUSAUsers}`)
    console.log(`   ✓ Total India users: ${indiaUsers}`)

    if (remainingUSAUsers === 0) {
      console.log('✅ All USA users successfully migrated to India')
    } else {
      console.log('⚠️  Some USA users may still exist')
    }

    // Optional: Update any null/empty countries to India as well
    console.log('\n🔄 Updating users with null/empty countries...')
    const nullCountryUpdate = await User.updateMany(
      { 
        $or: [
          { 'address.country': { $exists: false } },
          { 'address.country': null },
          { 'address.country': '' }
        ]
      },
      { 
        $set: { 
          'address.country': 'India',
          'updatedAt': new Date()
        } 
      }
    )

    console.log(`✅ Updated ${nullCountryUpdate.modifiedCount} users with null/empty countries`)

    // Final statistics
    console.log('\n📊 Final Statistics:')
    const totalUsers = await User.countDocuments()
    const usersWithIndia = await User.countDocuments({ 'address.country': 'India' })
    const usersWithOtherCountries = await User.countDocuments({ 
      'address.country': { $exists: true, $ne: 'India' } 
    })

    console.log(`   📈 Total users: ${totalUsers}`)
    console.log(`   🇮🇳 Users with India: ${usersWithIndia}`)
    console.log(`   🌍 Users with other countries: ${usersWithOtherCountries}`)

    console.log('\n🎉 Migration completed successfully!')
    console.log('\n📋 What happened:')
    console.log('   ✓ All users with "USA", "United States", or "US" country updated to "India"')
    console.log('   ✓ All users with null/empty countries updated to "India"')
    console.log('   ✓ Frontend will now use dynamic country detection for new users')
    console.log('   ✓ Existing users will see "India" as their country (can be changed manually)')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    console.error('Stack trace:', error.stack)
  } finally {
    await mongoose.disconnect()
    console.log('\n🔌 Disconnected from MongoDB')
    process.exit(0)
  }
}

// Run the migration
migrateUSAToIndia()
