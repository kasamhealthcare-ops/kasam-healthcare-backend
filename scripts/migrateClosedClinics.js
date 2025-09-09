import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Appointment from '../models/Appointment.js'
import Slot from '../models/Slot.js'
import User from '../models/User.js'

dotenv.config()

const migrateClosedClinics = async () => {
  try {
    console.log('🏥 Starting migration of closed clinics (jashodanagar and paldi)...')
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    // Check what users exist in the database
    const allUsers = await User.find({}, 'firstName lastName email role')
    console.log(`\n👥 Found ${allUsers.length} users in database:`)
    allUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} (${user.email}) - Role: ${user.role}`)
    })

    // Find the doctor
    const doctor = await User.findOne({ role: 'doctor' })
    if (!doctor) {
      console.log('\n❌ No doctor found in database')
      console.log('💡 The migration will continue without doctor reference validation')
      console.log('   Slots and appointments will be migrated based on location only')
    } else {
      console.log(`\n👨‍⚕️ Found doctor: ${doctor.firstName} ${doctor.lastName} (${doctor.email})`)
    }

    // Check current database state before migration
    console.log('\n📊 Current database state before migration:')

    // Check all slots by location
    const allSlots = await Slot.aggregate([
      { $group: { _id: '$location', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])

    console.log('\n📅 Current slots by location:')
    allSlots.forEach(({ _id, count }) => {
      console.log(`   ${_id || 'undefined'}: ${count} slots`)
    })

    // Check all appointments by location
    const allAppointments = await Appointment.aggregate([
      { $group: { _id: '$location', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])

    console.log('\n📋 Current appointments by location:')
    allAppointments.forEach(({ _id, count }) => {
      console.log(`   ${_id || 'undefined'}: ${count} appointments`)
    })

    // Migration mapping: closed clinic -> new clinic
    const migrationMap = {
      'jashodanagar': 'ghodasar',  // jashodanagar slots/appointments go to ghodasar
      'paldi': 'vastral'           // paldi slots/appointments go to vastral
    }

    let totalMigratedSlots = 0
    let totalMigratedAppointments = 0

    // Migrate slots
    console.log('\n📅 Migrating slots from closed clinics...')
    for (const [oldLocation, newLocation] of Object.entries(migrationMap)) {
      console.log(`\n🔄 Migrating ${oldLocation} slots to ${newLocation}...`)
      
      // Find slots at the old location
      const slotsToMigrate = await Slot.find({ location: oldLocation })
      console.log(`   Found ${slotsToMigrate.length} slots at ${oldLocation}`)

      if (slotsToMigrate.length > 0) {
        // Update slots to new location
        const slotResult = await Slot.updateMany(
          { location: oldLocation },
          { $set: { location: newLocation } }
        )
        
        console.log(`   ✅ Migrated ${slotResult.modifiedCount} slots from ${oldLocation} to ${newLocation}`)
        totalMigratedSlots += slotResult.modifiedCount
      }
    }

    // Migrate appointments
    console.log('\n📋 Migrating appointments from closed clinics...')
    for (const [oldLocation, newLocation] of Object.entries(migrationMap)) {
      console.log(`\n🔄 Migrating ${oldLocation} appointments to ${newLocation}...`)
      
      // Find appointments at the old location
      const appointmentsToMigrate = await Appointment.find({ location: oldLocation })
        .populate('patient', 'firstName lastName email')
      console.log(`   Found ${appointmentsToMigrate.length} appointments at ${oldLocation}`)

      if (appointmentsToMigrate.length > 0) {
        // Show appointment details before migration
        appointmentsToMigrate.forEach((appointment, index) => {
          console.log(`   ${index + 1}. ${appointment.patient?.firstName} ${appointment.patient?.lastName} - ${appointment.service}`)
          console.log(`      Date: ${appointment.appointmentDate?.toDateString()}, Time: ${appointment.appointmentTime}`)
        })

        // Update appointments to new location
        const appointmentResult = await Appointment.updateMany(
          { location: oldLocation },
          { $set: { location: newLocation } }
        )
        
        console.log(`   ✅ Migrated ${appointmentResult.modifiedCount} appointments from ${oldLocation} to ${newLocation}`)
        totalMigratedAppointments += appointmentResult.modifiedCount
      }
    }

    // Verification
    console.log('\n🔍 Verification after migration...')
    
    // Check for any remaining jashodanagar/paldi records
    const remainingJashodanagarSlots = await Slot.countDocuments({ location: 'jashodanagar' })
    const remainingPaldiSlots = await Slot.countDocuments({ location: 'paldi' })
    const remainingJashodanagarAppointments = await Appointment.countDocuments({ location: 'jashodanagar' })
    const remainingPaldiAppointments = await Appointment.countDocuments({ location: 'paldi' })

    console.log(`   Remaining jashodanagar slots: ${remainingJashodanagarSlots}`)
    console.log(`   Remaining paldi slots: ${remainingPaldiSlots}`)
    console.log(`   Remaining jashodanagar appointments: ${remainingJashodanagarAppointments}`)
    console.log(`   Remaining paldi appointments: ${remainingPaldiAppointments}`)

    // Show new distribution
    console.log('\n📊 New location distribution:')
    const locationCounts = await Slot.aggregate([
      { $group: { _id: '$location', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])

    locationCounts.forEach(({ _id, count }) => {
      console.log(`   ${_id}: ${count} slots`)
    })

    const appointmentLocationCounts = await Appointment.aggregate([
      { $group: { _id: '$location', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])

    console.log('\n📋 Appointment distribution:')
    appointmentLocationCounts.forEach(({ _id, count }) => {
      console.log(`   ${_id}: ${count} appointments`)
    })

    // Summary
    console.log('\n📈 Migration Summary:')
    console.log(`   Total slots migrated: ${totalMigratedSlots}`)
    console.log(`   Total appointments migrated: ${totalMigratedAppointments}`)
    console.log(`   jashodanagar → ghodasar`)
    console.log(`   paldi → vastral`)

    if (remainingJashodanagarSlots === 0 && remainingPaldiSlots === 0 && 
        remainingJashodanagarAppointments === 0 && remainingPaldiAppointments === 0) {
      console.log('\n✅ Migration completed successfully! No records remain at closed clinics.')
    } else {
      console.log('\n⚠️  Some records may still exist at closed clinic locations. Please review.')
    }

  } catch (error) {
    console.error('❌ Migration failed:', error)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Disconnected from MongoDB')
  }
}

// Run the migration
migrateClosedClinics()
