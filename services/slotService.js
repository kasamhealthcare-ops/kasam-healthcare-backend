import mongoose from 'mongoose'
import User from '../models/User.js'
import Slot from '../models/Slot.js'
import Appointment from '../models/Appointment.js'
import { getISTDateReliable } from '../utils/dateUtils.js'

class SlotService {
  constructor() {
    this.isRunning = false
    this.clinicLocations = [
      {
        code: 'ghodasar',
        name: 'Ghodasar Clinic',
        address: 'R/1, Annapurna Society, Ghodasar, Ahmedabad - 380050',
        coordinates: { lat: 22.988879753817518, lng: 72.61134051324319 }
      },
      {
        code: 'vastral',
        name: 'Vastral Clinic',
        address: 'Vastral Cross Road, Vastral, Ahmedabad - 382418',
        coordinates: { lat: 23.010146066893338, lng: 72.64498933997966 }
      },
      {
        code: 'gandhinagar',
        name: 'Gandhinagar Clinic',
        address: '122/2, Sector 4/A, Gandhinagar, Gujarat',
        coordinates: { lat: 23.209192334491412, lng: 72.62446865673193 }
      }
    ]
  }

  // Get time slots for a specific clinic
  getTimeSlotsForClinic(clinicCode, dayOfWeek) {
    // Special handling for Sundays - only Gandhinagar is open
    if (dayOfWeek === 0) {
      if (clinicCode === 'gandhinagar') {
        return [
          // Sunday slots: 12:00 PM to 5:00 PM (12:00-17:00)
          { start: '12:00', end: '12:30' },
          { start: '12:30', end: '13:00' },
          { start: '13:00', end: '13:30' },
          { start: '13:30', end: '14:00' },
          { start: '14:00', end: '14:30' },
          { start: '14:30', end: '15:00' },
          { start: '15:00', end: '15:30' },
          { start: '15:30', end: '16:00' },
          { start: '16:00', end: '16:30' },
          { start: '16:30', end: '17:00' }
        ]
      }
      // Other clinics (Ghodasar, Vastral) are closed on Sunday
      return []
    }

    switch (clinicCode) {
      case 'ghodasar':
        return [
          // Morning slots: 7:00 AM to 8:30 AM
          { start: '07:00', end: '07:30' },
          { start: '07:30', end: '08:00' },
          { start: '08:00', end: '08:30' },
          // Extended morning slots: 9:00 AM to 12:00 PM
          { start: '09:00', end: '09:30' },
          { start: '09:30', end: '10:00' },
          { start: '10:00', end: '10:30' },
          { start: '10:30', end: '11:00' },
          { start: '11:00', end: '11:30' },
          { start: '11:30', end: '12:00' },
          // Afternoon slots: 1:00 PM to 2:00 PM
          { start: '13:00', end: '13:30' },
          { start: '13:30', end: '14:00' },
          // Evening slots: 8:30 PM to 10:30 PM
          { start: '20:30', end: '21:00' },
          { start: '21:00', end: '21:30' },
          { start: '21:30', end: '22:00' },
          { start: '22:00', end: '22:30' }
        ]

      case 'vastral':
        return [
          // Afternoon slots: 4:00 PM to 7:00 PM
          { start: '16:00', end: '16:30' },
          { start: '16:30', end: '17:00' },
          { start: '17:00', end: '17:30' },
          { start: '17:30', end: '18:00' },
          { start: '18:00', end: '18:30' },
          { start: '18:30', end: '19:00' }
        ]

      case 'gandhinagar':
        // Gandhinagar is ONLY open on Sundays, closed on weekdays
        return []

      default:
        return []
    }
  }

  // Get all clinic locations (available every day)
  getAllClinics() {
    return this.clinicLocations
  }

  // Find the doctor/admin user
  async findDoctor() {
    const doctor = await User.findOne({ 
      role: { $in: ['admin', 'doctor'] }, 
      isActive: true 
    })
    
    if (!doctor) {
      throw new Error('No doctor/admin user found')
    }
    
    return doctor
  }

  // Create slots for a specific date at ALL clinic locations
  async createSlotsForDate(date, doctor) {
    const dayOfWeek = date.getDay()

    // Note: Sundays are now supported for Gandhinagar clinic only

    // Create a proper date object for the target date (midnight UTC)
    const targetDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))

    const allClinics = this.getAllClinics()
    const slotsToCreate = []

    // Create slots for each clinic location with their specific time slots
    for (const clinic of allClinics) {
      const timeSlots = this.getTimeSlotsForClinic(clinic.code, dayOfWeek)

      for (const timeSlot of timeSlots) {
        // Check if slot already exists for this clinic and time
        const existingSlot = await Slot.findOne({
          doctor: doctor._id,
          date: targetDate,
          startTime: timeSlot.start,
          location: clinic.code
        })

        if (!existingSlot) {
          slotsToCreate.push({
            doctor: doctor._id,
            date: targetDate,
            startTime: timeSlot.start,
            endTime: timeSlot.end,
            location: clinic.code,
            notes: `${clinic.name} - ${clinic.address}`,
            isAvailable: true,
            isBooked: false,
            createdBy: doctor._id
          })
        }
      }
    }

    if (slotsToCreate.length > 0) {
      await Slot.insertMany(slotsToCreate)
      console.log(`✅ Created ${slotsToCreate.length} slots for ${date.toDateString()} across all clinics`)
    }

    return slotsToCreate
  }

  // Ensure slots exist for the next 7 days (weekly refresh)
  async ensureSlotsExist(daysAhead = 7) {
    try {
      if (this.isRunning) {
        console.log('⏳ Slot generation already running, skipping...')
        return
      }

      this.isRunning = true
      console.log(`🔄 Ensuring slots exist for the next ${daysAhead} days...`)

      const doctor = await this.findDoctor()
      // Use IST timezone for consistent date handling
      const todayIST = getISTDateReliable()
      let totalCreated = 0

      for (let i = 0; i < daysAhead; i++) {
        const targetDate = new Date(todayIST)
        targetDate.setDate(todayIST.getDate() + i)

        const created = await this.createSlotsForDate(targetDate, doctor)
        totalCreated += created.length
      }

      if (totalCreated > 0) {
        console.log(`✅ Total slots created: ${totalCreated}`)
      } else {
        console.log(`ℹ️  All slots already exist for the next ${daysAhead} days`)
      }

    } catch (error) {
      console.error('❌ Error ensuring slots exist:', error)
    } finally {
      this.isRunning = false
    }
  }

  // Clean up old slots (all past unbooked slots) - more aggressive cleanup
  async cleanupOldSlots() {
    try {
      // Use IST timezone for consistent date handling
      const todayIST = getISTDateReliable()
      todayIST.setHours(0, 0, 0, 0) // Start of today in IST

      const result = await Slot.deleteMany({
        date: { $lt: todayIST },
        isBooked: false // Only delete unbooked slots
      })

      if (result.deletedCount > 0) {
        console.log(`🗑️  Cleaned up ${result.deletedCount} past unbooked slots`)
      }
    } catch (error) {
      console.error('❌ Error cleaning up old slots:', error)
    }
  }

  // Clean up past appointments (appointments from previous days)
  async cleanupPastAppointments() {
    try {
      // Use IST timezone for consistent date handling
      const todayIST = getISTDateReliable()
      todayIST.setHours(0, 0, 0, 0) // Start of today in IST

      // Find appointments from past dates
      const pastAppointments = await Appointment.find({
        appointmentDate: { $lt: todayIST }
      })

      if (pastAppointments.length === 0) {
        console.log('🗑️  No past appointments to clean up')
        return
      }

      console.log(`🗑️  Found ${pastAppointments.length} past appointments to clean up...`)

      let cleanedCount = 0
      let slotsFreedCount = 0

      for (const appointment of pastAppointments) {
        try {
          // Find and free up associated slot
          const slot = await Slot.findOne({
            appointment: appointment._id,
            isBooked: true
          })

          if (slot) {
            slot.isBooked = false
            slot.bookedBy = null
            slot.appointment = null
            await slot.save()
            slotsFreedCount++
          }

          // Delete the appointment
          await Appointment.findByIdAndDelete(appointment._id)
          cleanedCount++

        } catch (appointmentError) {
          console.error(`❌ Error cleaning up appointment ${appointment._id}:`, appointmentError.message)
        }
      }

      console.log(`🗑️  Successfully cleaned up ${cleanedCount} past appointments`)
      console.log(`🔓 Freed up ${slotsFreedCount} associated slots`)

    } catch (error) {
      console.error('❌ Error cleaning up past appointments:', error)
    }
  }

  // Generate slots for the next 7 days (called daily)
  async generateDailySlots() {
    try {
      console.log('🕐 Daily slot refresh started - maintaining 7-day rolling window...')

      // Ensure we always have slots for the next 7 days
      await this.ensureSlotsExist(7)

      // Clean up old slots to maintain the rolling window
      await this.cleanupOldSlots()

      // Clean up past appointments
      await this.cleanupPastAppointments()

      console.log('✅ Daily 7-day slot refresh completed')
    } catch (error) {
      console.error('❌ Daily slot refresh failed:', error)
    }
  }

  // Note: Automated scheduling is now handled by Vercel Cron Jobs
  // See vercel.json and /api/cron/* endpoints for the new implementation
  startAutomation() {
    console.log('ℹ️  Slot automation is now handled by Vercel Cron Jobs')
    console.log('📅 Daily 7-day refresh: 12:01 AM IST via /api/cron/daily-slot-refresh')
    console.log('🗑️  Daily slot cleanup: 1:00 AM IST via /api/cron/slot-cleanup')
    console.log('🗑️  Daily appointment cleanup: 2:00 AM IST via /api/cron/appointment-cleanup')
    console.log('✅ Cron jobs configured in vercel.json')
  }

  // Generate slots for a specific month and year
  async generateSlotsForMonth(year, month) {
    try {
      console.log(`🗓️  Generating slots for ${year}-${month.toString().padStart(2, '0')}...`)

      const doctor = await this.findDoctor()
      const daysInMonth = new Date(year, month, 0).getDate()
      let totalCreated = 0

      for (let day = 1; day <= daysInMonth; day++) {
        const targetDate = new Date(Date.UTC(year, month - 1, day)) // month is 1-indexed, Date constructor is 0-indexed
        const created = await this.createSlotsForDate(targetDate, doctor)
        totalCreated += created.length
      }

      console.log(`✅ Created ${totalCreated} slots for ${year}-${month.toString().padStart(2, '0')}`)
      return totalCreated
    } catch (error) {
      console.error(`❌ Error generating slots for ${year}-${month}:`, error)
      throw error
    }
  }

  // Generate slots for multiple months ahead
  async generateSlotsForFuture(monthsAhead = 6) {
    try {
      console.log(`🔮 Generating slots for the next ${monthsAhead} months...`)

      // Use IST timezone for consistent date handling
      const todayIST = getISTDateReliable()
      let totalCreated = 0

      for (let i = 0; i < monthsAhead; i++) {
        const targetDate = new Date(todayIST.getFullYear(), todayIST.getMonth() + i, 1)
        const year = targetDate.getFullYear()
        const month = targetDate.getMonth() + 1 // Convert to 1-indexed

        const created = await this.generateSlotsForMonth(year, month)
        totalCreated += created
      }

      console.log(`✅ Total slots created for ${monthsAhead} months: ${totalCreated}`)
      return totalCreated
    } catch (error) {
      console.error('❌ Error generating future slots:', error)
      throw error
    }
  }

  // Initialize slots on server startup
  async initialize() {
    console.log('🚀 Initializing 7-day rolling slot service...')

    try {
      // First, clean up old data on server startup
      console.log('🧹 Cleaning up old data on server startup...')
      await this.cleanupPastAppointments()
      await this.cleanupOldSlots()

      // Then ensure slots exist for the next 7 days
      await this.ensureSlotsExist(7)

      // Start automation for 7-day rolling window
      this.startAutomation()

      console.log('✅ 7-day rolling slot service initialized successfully')
      console.log('📅 Maintaining slots for next 7 days with daily refresh')
    } catch (error) {
      console.error('❌ Failed to initialize slot service:', error)
    }
  }
}

export default new SlotService()
