import express from 'express'
import Slot from '../models/Slot.js'
import User from '../models/User.js'
import Appointment from '../models/Appointment.js'
import {
  authenticate,
  authorize
} from '../middleware/auth.js'
import {
  validateObjectId,
  validateSlotsPagination,
  validateDateRange
} from '../middleware/validation.js'
import slotService from '../services/slotService.js'
import { getISTDateReliable } from '../utils/dateUtils.js'

const router = express.Router()

// All routes require authentication
router.use(authenticate)

// @route   GET /api/slots/available
// @desc    Get all slots for a specific date (available and booked for patient view)
// @access  Public (authenticated)
router.get('/available', async (req, res) => {
  try {
    const { date, doctorId } = req.query

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      })
    }

    // Parse the date and validate it's not in the past using IST
    const targetDate = new Date(date)
    const todayIST = getISTDateReliable()

    // Set both dates to start of day for accurate comparison
    targetDate.setHours(0, 0, 0, 0)
    todayIST.setHours(0, 0, 0, 0)

    // Prevent fetching slots for past dates
    if (targetDate < todayIST) {
      return res.status(400).json({
        success: false,
        message: 'Cannot view slots for past dates. Please select today or a future date.'
      })
    }

    // Restrict booking to next 7 days only
    const maxBookingDate = new Date(todayIST)
    maxBookingDate.setDate(maxBookingDate.getDate() + 7)

    if (targetDate > maxBookingDate) {
      return res.status(400).json({
        success: false,
        message: 'Appointments can only be booked for the next 7 days. Please select a date within this range.'
      })
    }

    // If no doctorId provided, get the default doctor (admin/doctor role)
    let doctor = doctorId
    if (!doctor) {
      const defaultDoctor = await User.findOne({
        role: { $in: ['admin', 'doctor'] },
        isActive: true
      })
      if (!defaultDoctor) {
        return res.status(404).json({
          success: false,
          message: 'No doctor found'
        })
      }
      doctor = defaultDoctor._id
    }

    // Create a proper UTC date for database query
    const utcDate = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()))

    // Get all slots for the date (both available and booked)
    const allSlots = await Slot.find({
      doctor: doctor,
      date: utcDate,
      isAvailable: true
    })
    .populate('doctor', 'firstName lastName')
    .populate('bookedBy', 'firstName lastName')
    .sort({ startTime: 1 })

    // Filter out past slots if the selected date is today
    // Use IST timezone for proper time comparison
    const nowIST = getISTDateReliable()
    const todayISTForComparison = new Date(nowIST)
    todayISTForComparison.setHours(0, 0, 0, 0)

    const selectedDate = new Date(utcDate)
    selectedDate.setHours(0, 0, 0, 0)

    let filteredSlots = allSlots

    // Check if the selected date is today in IST
    const targetDateIST = new Date(targetDate)
    targetDateIST.setHours(0, 0, 0, 0)

    if (targetDateIST.getTime() === todayISTForComparison.getTime()) {
      const currentTimeIST = nowIST.getHours() * 60 + nowIST.getMinutes() // Current IST time in minutes

      // Debug logging for timezone issues
      console.log(`[TIMEZONE DEBUG] Server UTC: ${new Date().toISOString()}`)
      console.log(`[TIMEZONE DEBUG] IST Time: ${nowIST.toString()}`)
      console.log(`[TIMEZONE DEBUG] Current IST minutes: ${currentTimeIST}`)
      console.log(`[TIMEZONE DEBUG] Selected date is today, filtering ${allSlots.length} slots`)

      filteredSlots = allSlots.filter(slot => {
        const [hours, minutes] = slot.startTime.split(':').map(Number)
        const slotTime = hours * 60 + minutes // Slot time in minutes
        const isAvailable = slotTime > (currentTimeIST + 5)

        if (!isAvailable) {
          console.log(`[TIMEZONE DEBUG] Filtering out slot ${slot.startTime} (${slotTime} <= ${currentTimeIST + 5})`)
        }

        // Only show slots that haven't started yet (with a small buffer of 5 minutes)
        return isAvailable
      })

      console.log(`[TIMEZONE DEBUG] After filtering: ${filteredSlots.length} slots remaining`)
    }

    res.json({
      success: true,
      data: {
        slots: filteredSlots,
        date,
        doctorId: doctor,
        totalSlots: allSlots.length,
        availableSlots: filteredSlots.length,
        filteredPastSlots: selectedDate.getTime() === todayISTForComparison.getTime() ? allSlots.length - filteredSlots.length : 0
      }
    })
  } catch (error) {
    console.error('Get available slots error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get available slots'
    })
  }
})

// @route   GET /api/slots/all
// @desc    Get all slots without pagination (for client-side pagination)
// @access  Private (Admin/Doctor only)
router.get('/all', authenticate, authorize('admin', 'doctor'), async (req, res) => {
  try {
    // Build query based on user role (same logic as paginated endpoint)
    let query = {}

    // For admin/doctor users, only show upcoming slots (from today onwards)
    if (req.user.role === 'admin' || req.user.role === 'doctor') {
      const today = new Date()
      // Create UTC date for proper comparison with database dates
      const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
      query.date = { $gte: todayUTC }
    }

    if (req.user.role === 'doctor') {
      // Doctors can only see their own slots
      query.doctor = req.user._id
    }

    // Get all slots without pagination
    const allSlots = await Slot.find(query)
      .populate('doctor', 'firstName lastName email')
      .populate('bookedBy', 'firstName lastName email')
      .populate('appointment', 'service status')
      .sort('date startTime')

    // Filter out past time slots for today (admin users only) - same logic as paginated endpoint
    let slots = allSlots
    if (req.user.role === 'admin') {
      // Use IST timezone for proper time comparison
      const nowIST = getISTDateReliable()
      const todayISTForComparison = new Date(nowIST)
      todayISTForComparison.setHours(0, 0, 0, 0)

      slots = allSlots.filter(slot => {
        const slotDate = new Date(slot.date)
        slotDate.setHours(0, 0, 0, 0)

        // If the slot is for today, check if the time has passed
        if (slotDate.getTime() === todayISTForComparison.getTime()) {
          const currentTimeIST = nowIST.getHours() * 60 + nowIST.getMinutes() // Current IST time in minutes
          const [hours, minutes] = slot.startTime.split(':').map(Number)
          const slotTime = hours * 60 + minutes // Slot time in minutes

          // Only show slots that haven't started yet (with a small buffer of 5 minutes)
          return slotTime > (currentTimeIST + 5)
        }

        // For future dates, show all slots
        return true
      })
    }

    // Calculate statistics - match paginated endpoint logic
    // Total count should be from database query (before time filtering)
    const totalSlots = await Slot.countDocuments(query)

    // Available count should also be from database query (before time filtering)
    const availableQuery = { ...query, isBooked: false, isAvailable: true }
    const availableSlots = await Slot.countDocuments(availableQuery)

    res.json({
      success: true,
      data: {
        slots, // This is the time-filtered slots for display
        totalSlots, // This is the total from DB (matches paginated endpoint)
        availableSlots // This is available count from DB (matches paginated endpoint)
      }
    })
  } catch (error) {
    console.error('Get all slots error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get all slots'
    })
  }
})

// @route   GET /api/slots
// @desc    Get slots (filtered by user role)
// @access  Private
router.get('/', validateSlotsPagination, validateDateRange, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      sort = 'date startTime',
      startDate,
      endDate,
      doctorId,
      isAvailable,
      isBooked
    } = req.query

    // Build query based on user role
    let query = {}

    // For admin/doctor users, only show upcoming slots (from today onwards)
    if (req.user.role === 'admin' || req.user.role === 'doctor') {
      const today = new Date()
      // Create UTC date for proper comparison with database dates
      const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
      query.date = { $gte: todayUTC }
    }

    if (req.user.role === 'doctor') {
      // Doctors can only see their own slots
      query.doctor = req.user._id
      // Also filter to upcoming slots for doctors
      const today = new Date()
      const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
      query.date = { $gte: todayUTC }
    } else if (req.user.role === 'patient') {
      // Patients can only see available slots or their booked slots
      query.$or = [
        { isAvailable: true, isBooked: false },
        { bookedBy: req.user._id }
      ]
      // Also filter to upcoming slots for patients
      const today = new Date()
      const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
      if (!query.date) {
        query.date = { $gte: todayUTC }
      }
    }

    // Add filters
    if (doctorId && req.user.role === 'admin') {
      query.doctor = doctorId
    }
    if (isAvailable !== undefined) {
      query.isAvailable = isAvailable === 'true'
    }
    if (isBooked !== undefined) {
      query.isBooked = isBooked === 'true'
    }
    if (startDate && endDate) {
      // Override the default date filter if specific date range is provided
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    } else if (query.date && startDate && !endDate) {
      // If only startDate is provided, combine with existing date filter
      const existingDateFilter = query.date
      query.date = {
        ...existingDateFilter,
        $gte: new Date(startDate)
      }
    } else if (query.date && !startDate && endDate) {
      // If only endDate is provided, combine with existing date filter
      const existingDateFilter = query.date
      query.date = {
        ...existingDateFilter,
        $lte: new Date(endDate)
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit)

    // Execute query
    const allSlots = await Slot.find(query)
      .populate('doctor', 'firstName lastName email')
      .populate('bookedBy', 'firstName lastName email')
      .populate('appointment', 'service status')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))

    // Filter out past time slots for today (admin users only)
    let slots = allSlots
    if (req.user.role === 'admin') {
      // Use IST timezone for proper time comparison
      const nowIST = getISTDateReliable()
      const todayISTForComparison = new Date(nowIST)
      todayISTForComparison.setHours(0, 0, 0, 0)

      slots = allSlots.filter(slot => {
        const slotDate = new Date(slot.date)
        slotDate.setHours(0, 0, 0, 0)

        // If the slot is for today, check if the time has passed
        if (slotDate.getTime() === todayISTForComparison.getTime()) {
          const currentTimeIST = nowIST.getHours() * 60 + nowIST.getMinutes() // Current IST time in minutes
          const [hours, minutes] = slot.startTime.split(':').map(Number)
          const slotTime = hours * 60 + minutes // Slot time in minutes

          // Only show slots that haven't started yet (with a small buffer of 5 minutes)
          return slotTime > (currentTimeIST + 5)
        }

        // For future dates, show all slots
        return true
      })
    }

    // Get total count
    const total = await Slot.countDocuments(query)
    const totalPages = Math.ceil(total / parseInt(limit))

    // Get available slots count
    const availableQuery = { ...query, isBooked: false, isAvailable: true }
    const availableCount = await Slot.countDocuments(availableQuery)

    res.json({
      success: true,
      data: {
        slots,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalSlots: total,
          availableSlots: availableCount,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      }
    })
  } catch (error) {
    console.error('Get slots error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get slots'
    })
  }
})

// @route   POST /api/slots
// @desc    Create new slot (Doctor/Admin only)
// @access  Private (Doctor/Admin)
router.post('/', authorize('doctor', 'admin'), async (req, res) => {
  try {
    const {
      date,
      startTime,
      endTime,
      location,
      notes
    } = req.body

    // Validation
    if (!date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Date, start time, and end time are required'
      })
    }

    // For doctors, set themselves as the doctor
    // For admins, they can create slots for any doctor
    let doctorId = req.user._id
    if (req.body.doctorId && req.user.role === 'admin') {
      doctorId = req.body.doctorId
    }

    // Parse the date and create a proper UTC date
    const targetDate = new Date(date)
    const utcDate = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()))

    // Check if slot already exists at this time
    const existingSlot = await Slot.findOne({
      doctor: doctorId,
      date: utcDate,
      startTime: startTime
    })

    if (existingSlot) {
      return res.status(409).json({
        success: false,
        message: 'A slot already exists at this time'
      })
    }

    const slot = new Slot({
      doctor: doctorId,
      date: utcDate,
      startTime,
      endTime,
      location,
      notes,
      createdBy: req.user._id
    })

    await slot.save()
    await slot.populate('doctor', 'firstName lastName email')

    res.status(201).json({
      success: true,
      message: 'Slot created successfully',
      data: {
        slot
      }
    })
  } catch (error) {
    console.error('Create slot error:', error)
    
    if (error.message.includes('End time must be after start time')) {
      return res.status(400).json({
        success: false,
        message: error.message
      })
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create slot'
    })
  }
})

// @route   PUT /api/slots/:id
// @desc    Update slot (Doctor/Admin only)
// @access  Private (Doctor/Admin)
router.put('/:id', 
  validateObjectId('id'),
  authorize('doctor', 'admin'),
  async (req, res) => {
    try {
      const slot = await Slot.findById(req.params.id)

      if (!slot) {
        return res.status(404).json({
          success: false,
          message: 'Slot not found'
        })
      }

      // Check permissions
      if (req.user.role === 'doctor' && slot.doctor.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own slots'
        })
      }

      // Don't allow updating booked slots
      if (slot.isBooked) {
        return res.status(400).json({
          success: false,
          message: 'Cannot update a booked slot'
        })
      }

      const {
        date,
        startTime,
        endTime,
        isAvailable,
        location,
        notes
      } = req.body

      // Update fields
      if (date) {
        const targetDate = new Date(date)
        slot.date = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()))
      }
      if (startTime) slot.startTime = startTime
      if (endTime) slot.endTime = endTime
      if (isAvailable !== undefined) slot.isAvailable = isAvailable
      if (location) slot.location = location
      if (notes !== undefined) slot.notes = notes

      await slot.save()
      await slot.populate('doctor', 'firstName lastName email')

      res.json({
        success: true,
        message: 'Slot updated successfully',
        data: {
          slot
        }
      })
    } catch (error) {
      console.error('Update slot error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to update slot'
      })
    }
  }
)

// @route   DELETE /api/slots/:id
// @desc    Delete slot (Doctor/Admin only)
// @access  Private (Doctor/Admin)
router.delete('/:id',
  validateObjectId('id'),
  authorize('doctor', 'admin'),
  async (req, res) => {
    try {
      const slot = await Slot.findById(req.params.id)

      if (!slot) {
        return res.status(404).json({
          success: false,
          message: 'Slot not found'
        })
      }

      // Check permissions
      if (req.user.role === 'doctor' && slot.doctor.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own slots'
        })
      }

      // Don't allow deleting booked slots
      if (slot.isBooked) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete a booked slot. Cancel the appointment first.'
        })
      }

      await Slot.findByIdAndDelete(req.params.id)

      res.json({
        success: true,
        message: 'Slot deleted successfully'
      })
    } catch (error) {
      console.error('Delete slot error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to delete slot'
      })
    }
  }
)

// @route   POST /api/slots/cleanup-past
// @desc    Cleanup past unbooked slots (Admin only)
// @access  Private (Admin)
router.post('/cleanup-past',
  authorize('admin', 'doctor'),
  async (req, res) => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Delete all unbooked slots from past dates
      const result = await Slot.deleteMany({
        date: { $lt: today },
        isBooked: false
      })

      res.json({
        success: true,
        message: `Cleanup completed. Removed ${result.deletedCount} past unbooked slots.`,
        data: {
          deletedCount: result.deletedCount,
          cleanupDate: today.toISOString()
        }
      })
    } catch (error) {
      console.error('Cleanup past slots error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to cleanup past slots',
        error: error.message
      })
    }
  }
)

// @route   POST /api/slots/force-cleanup
// @desc    Force cleanup ALL past slots and appointments (Admin only)
// @access  Private (Admin)
router.post('/force-cleanup',
  authorize('admin', 'doctor'),
  async (req, res) => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      let results = {
        appointmentsDeleted: 0,
        slotsFreed: 0,
        slotsDeleted: 0
      }

      // Step 1: Clean up past appointments and free associated slots
      const pastAppointments = await Appointment.find({
        appointmentDate: { $lt: today }
      })

      for (const appointment of pastAppointments) {
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
          results.slotsFreed++
        }
      }

      // Delete past appointments
      const appointmentResult = await Appointment.deleteMany({
        appointmentDate: { $lt: today }
      })
      results.appointmentsDeleted = appointmentResult.deletedCount

      // Step 2: Delete ALL past slots (both booked and unbooked)
      const slotResult = await Slot.deleteMany({
        date: { $lt: today }
      })
      results.slotsDeleted = slotResult.deletedCount

      res.json({
        success: true,
        message: `Force cleanup completed. Removed ${results.appointmentsDeleted} past appointments and ${results.slotsDeleted} past slots.`,
        data: {
          ...results,
          cleanupDate: today.toISOString()
        }
      })
    } catch (error) {
      console.error('Force cleanup error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to perform force cleanup',
        error: error.message
      })
    }
  }
)

// @route   POST /api/slots/generate
// @desc    Generate slots for specific date range (Admin only)
// @access  Private (Admin)
router.post('/generate',
  authorize('admin'),
  async (req, res) => {
    try {
      const { startDate, endDate, daysAhead } = req.body

      // Import SlotService dynamically to avoid circular imports
      const { default: SlotService } = await import('../services/slotService.js')

      let totalCreated = 0

      if (daysAhead) {
        // Generate slots for the next N days
        await SlotService.ensureSlotsExist(daysAhead)
        totalCreated = daysAhead // Approximate
      } else if (startDate && endDate) {
        // Generate slots for specific date range
        const start = new Date(startDate)
        const end = new Date(endDate)
        const doctor = await SlotService.findDoctor()

        const currentDate = new Date(start)
        while (currentDate <= end) {
          const created = await SlotService.createSlotsForDate(currentDate, doctor)
          totalCreated += created.length
          currentDate.setDate(currentDate.getDate() + 1)
        }
      } else {
        return res.status(400).json({
          success: false,
          message: 'Please provide either daysAhead or startDate and endDate'
        })
      }

      res.json({
        success: true,
        message: `Slot generation completed`,
        data: {
          totalCreated,
          startDate,
          endDate,
          daysAhead
        }
      })
    } catch (error) {
      console.error('Generate slots error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to generate slots',
        error: error.message
      })
    }
  }
)

// @route   POST /api/slots/reinitialize
// @desc    Reinitialize slot service (Admin only)
// @access  Private (Admin)
router.post('/reinitialize',
  authorize('admin', 'doctor'),
  async (req, res) => {
    try {
      console.log('🔄 Manual slot service reinitialization requested by admin...')

      // Reinitialize the slot service
      await slotService.initialize()

      // Get current slot statistics
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const totalSlots = await Slot.countDocuments()
      const futureSlots = await Slot.countDocuments({ date: { $gte: today } })
      const bookedSlots = await Slot.countDocuments({ isBooked: true, date: { $gte: today } })
      const availableSlots = await Slot.countDocuments({ isBooked: false, isAvailable: true, date: { $gte: today } })

      res.json({
        success: true,
        message: 'Slot service reinitialized successfully',
        data: {
          totalSlots,
          futureSlots,
          bookedSlots,
          availableSlots,
          reinitializedAt: new Date().toISOString()
        }
      })
    } catch (error) {
      console.error('Slot service reinitialization error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to reinitialize slot service',
        error: error.message
      })
    }
  }
)

export default router
