import mongoose from 'mongoose'
import dotenv from 'dotenv'
import SlotService from '../services/slotService.js'

// Load environment variables
dotenv.config()

const generateAllSlots = async () => {
  try {
    console.log('🚀 Generating slots for the next 30 days...')
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kasam-healthcare')
    console.log('✅ Connected to MongoDB')

    // Create slot service instance
    const slotService = new SlotService()
    
    // Generate slots for the next 30 days
    await slotService.ensureSlotsExist(30)
    
    console.log('🎉 Slot generation completed!')
    console.log('\n📅 Weekly clinic schedule:')
    console.log('   Monday & Thursday: Ghodasar Clinic')
    console.log('   Tuesday & Friday: Jasodanagar Clinic')
    console.log('   Wednesday & Saturday: Ellis Bridge Clinic')
    console.log('   Sunday: Ellis Bridge Clinic')

  } catch (error) {
    console.error('❌ Error generating slots:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Database connection closed')
    process.exit(0)
  }
}

// Run the generation
generateAllSlots()
