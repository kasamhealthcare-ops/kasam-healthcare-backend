import express from 'express'
import Appointment from '../models/Appointment.js'
import User from '../models/User.js'
import Slot from '../models/Slot.js'
import {
  authenticate,
  authorize,
  authorizePatientOrProvider
} from '../middleware/auth.js'
import {
  validateAppointmentCreation,
  validateObjectId,
  validatePagination,
  validateDateRange
} from '../middleware/validation.js'

const router = express.Router()

// All routes require authentication
router.use(authenticate)

// @route   GET /api/appointments
// @desc    Get appointments (filtered by user role)
// @access  Private
router.get('/', validatePagination, validateDateRange, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = 'appointmentDate',
      status,
      service,
      startDate,
      endDate,
      doctor,
      patient
    } = req.query

    // Build query based on user role
    let query = {}

    if (req.user.role === 'patient') {
      // Patients can only see their own appointments
      query.patient = req.user._id
    } else if (req.user.role === 'doctor') {
      // Doctors can only see their own appointments
      query.doctor = req.user._id
    }
    // Admins and nurses can see all appointments

    // Apply filters
    if (status) query.status = status
    if (service) query.service = service
    if (doctor && req.user.role !== 'doctor') query.doctor = doctor
    if (patient && req.user.role === 'admin') query.patient = patient

    // Date range filter
    if (startDate || endDate) {
      query.appointmentDate = {}
      if (startDate) query.appointmentDate.$gte = new Date(startDate)
      if (endDate) query.appointmentDate.$lte = new Date(endDate)
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit)

    // Execute query
    const appointments = await Appointment.find(query)
      .populate('patient', 'firstName lastName email phone')
      .populate('doctor', 'firstName lastName email specialization')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))

    // Get total count
    const total = await Appointment.countDocuments(query)
    const totalPages = Math.ceil(total / parseInt(limit))

    res.json({
      success: true,
      data: {
        appointments,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalAppointments: total,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      }
    })
  } catch (error) {
    console.error('Get appointments error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get appointments'
    })
  }
})

// @route   GET /api/appointments/upcoming
// @desc    Get upcoming appointments
// @access  Private
router.get('/upcoming', async (req, res) => {
  try {
    const appointments = await Appointment.findUpcoming(
      req.user._id, 
      req.user.role
    )

    res.json({
      success: true,
      data: {
        appointments
      }
    })
  } catch (error) {
    console.error('Get upcoming appointments error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get upcoming appointments'
    })
  }
})

// @route   GET /api/appointments/stats
// @desc    Get appointment statistics
// @access  Private (Admin/Doctor)
router.get('/stats', authorize('admin', 'doctor'), async (req, res) => {
  try {
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()))

    let matchQuery = {}
    if (req.user.role === 'doctor') {
      matchQuery.doctor = req.user._id
    }

    const stats = await Appointment.aggregate([
      { $match: matchQuery },
      {
        $facet: {
          totalAppointments: [{ $count: "count" }],
          appointmentsByStatus: [
            { $group: { _id: "$status", count: { $sum: 1 } } }
          ],
          appointmentsThisMonth: [
            { $match: { appointmentDate: { $gte: startOfMonth } } },
            { $count: "count" }
          ],
          appointmentsThisWeek: [
            { $match: { appointmentDate: { $gte: startOfWeek } } },
            { $count: "count" }
          ],
          appointmentsByService: [
            { $group: { _id: "$service", count: { $sum: 1 } } }
          ]
        }
      }
    ])

    const result = stats[0]

    res.json({
      success: true,
      data: {
        totalAppointments: result.totalAppointments[0]?.count || 0,
        appointmentsThisMonth: result.appointmentsThisMonth[0]?.count || 0,
        appointmentsThisWeek: result.appointmentsThisWeek[0]?.count || 0,
        appointmentsByStatus: result.appointmentsByStatus.reduce((acc, item) => {
          acc[item._id] = item.count
          return acc
        }, {}),
        appointmentsByService: result.appointmentsByService.reduce((acc, item) => {
          acc[item._id] = item.count
          return acc
        }, {})
      }
    })
  } catch (error) {
    console.error('Get appointment stats error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get appointment statistics'
    })
  }
})

// @route   POST /api/appointments
// @desc    Create new appointment with slot booking
// @access  Private
router.post('/', validateAppointmentCreation, async (req, res) => {
  try {
    const {
      appointmentDate,
      appointmentTime,
      service,
      reason,
      duration,
      priority,
      symptoms,
      slotId
    } = req.body

    // Prevent admin/doctor from booking appointments for themselves
    if (req.user.role === 'admin' || req.user.role === 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Admin/Doctor cannot book appointments for themselves'
      })
    }

    // Find the admin/doctor user (there's only one) - ignore doctor field from request body
    const doctorUser = await User.findOne({ role: { $in: ['admin', 'doctor'] }, isActive: true })
    if (!doctorUser) {
      return res.status(400).json({
        success: false,
        message: 'No doctor available'
      })
    }

    // For patients, set themselves as the patient
    let patientId = req.user._id
    if (req.body.patient && ['admin', 'nurse', 'doctor'].includes(req.user.role)) {
      patientId = req.body.patient
    }

    let slot = null

    // If slotId is provided, book the specific slot
    if (slotId) {
      slot = await Slot.findById(slotId)
      if (!slot) {
        return res.status(404).json({
          success: false,
          message: 'Slot not found'
        })
      }

      if (slot.isBooked || !slot.isAvailable) {
        return res.status(409).json({
          success: false,
          message: 'This slot is no longer available'
        })
      }
    } else {
      // Find available slot for the requested time
      slot = await Slot.findOne({
        doctor: doctorUser._id,
        date: new Date(appointmentDate),
        startTime: appointmentTime,
        isAvailable: true,
        isBooked: false
      })

      if (!slot) {
        return res.status(409).json({
          success: false,
          message: 'No available slot found for the requested time. Please choose a different time.'
        })
      }
    }

    // Create the appointment
    const appointment = new Appointment({
      patient: patientId,
      doctor: doctorUser._id,
      appointmentDate,
      appointmentTime,
      service,
      reason,
      duration: duration || slot.duration,
      priority,
      symptoms,
      location: slot.location, // Transfer location from slot to appointment
      status: 'confirmed', // Direct confirmation for available slots
      createdBy: req.user._id
    })

    await appointment.save()

    // Book the slot
    await slot.bookSlot(patientId, appointment._id)

    // Populate the appointment with user details
    await appointment.populate('patient', 'firstName lastName email phone')
    await appointment.populate('doctor', 'firstName lastName email specialization')

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully!',
      data: {
        appointment,
        slot: {
          _id: slot._id,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime
        }
      }
    })
  } catch (error) {
    console.error('Create appointment error:', error)

    if (error.message === 'Slot is not available for booking') {
      return res.status(409).json({
        success: false,
        message: 'This slot is no longer available. Please choose a different time slot.'
      })
    }

    if (error.message === 'Doctor is not available at this time') {
      return res.status(409).json({
        success: false,
        message: 'Doctor is not available at this time. Please choose a different time slot.'
      })
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create appointment'
    })
  }
})

// @route   GET /api/appointments/:id
// @desc    Get appointment by ID
// @access  Private
router.get('/:id', validateObjectId('id'), async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patient', 'firstName lastName email phone dateOfBirth')
      .populate('doctor', 'firstName lastName email specialization')
      .populate('createdBy', 'firstName lastName')

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      })
    }

    // Check if user can access this appointment
    const canAccess = (
      req.user.role === 'admin' || req.user.role === 'doctor' ||
      appointment.patient._id.toString() === req.user._id.toString() ||
      appointment.doctor._id.toString() === req.user._id.toString() ||
      req.user.role === 'nurse'
    )

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      })
    }

    res.json({
      success: true,
      data: {
        appointment
      }
    })
  } catch (error) {
    console.error('Get appointment error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get appointment'
    })
  }
})

// @route   PUT /api/appointments/:id
// @desc    Update appointment
// @access  Private
router.put('/:id', validateObjectId('id'), async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      })
    }

    // Check permissions
    const canUpdate = (
      req.user.role === 'admin' ||
      appointment.patient.toString() === req.user._id.toString() ||
      appointment.doctor.toString() === req.user._id.toString()
    )

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      })
    }

    // Patients can only update certain fields
    const allowedUpdates = req.user.role === 'patient' 
      ? ['reason', 'symptoms', 'notes.patient']
      : Object.keys(req.body)

    // Update allowed fields
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field.includes('.')) {
          const [parent, child] = field.split('.')
          if (!appointment[parent]) appointment[parent] = {}
          appointment[parent][child] = req.body[field]
        } else {
          appointment[field] = req.body[field]
        }
      }
    })

    appointment.updatedBy = req.user._id
    await appointment.save()

    await appointment.populate('patient', 'firstName lastName email phone')
    await appointment.populate('doctor', 'firstName lastName email specialization')

    res.json({
      success: true,
      message: 'Appointment updated successfully',
      data: {
        appointment
      }
    })
  } catch (error) {
    console.error('Update appointment error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update appointment'
    })
  }
})

// @route   PUT /api/appointments/:id/status
// @desc    Update appointment status
// @access  Private (Doctor/Admin)
router.put('/:id/status', 
  validateObjectId('id'),
  authorize('doctor', 'admin', 'nurse'),
  async (req, res) => {
    try {
      const { status } = req.body
      const validStatuses = ['pending', 'scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show', 'rejected']

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        })
      }

      const appointment = await Appointment.findById(req.params.id)

      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: 'Appointment not found'
        })
      }

      appointment.status = status
      appointment.updatedBy = req.user._id
      await appointment.save()

      res.json({
        success: true,
        message: 'Appointment status updated successfully',
        data: {
          appointment: {
            _id: appointment._id,
            status: appointment.status,
            updatedAt: appointment.updatedAt
          }
        }
      })
    } catch (error) {
      console.error('Update appointment status error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to update appointment status'
      })
    }
  }
)

// @route   DELETE /api/appointments/:id/cancel
// @desc    Cancel appointment (permanently delete)
// @access  Private
router.delete('/:id/cancel', validateObjectId('id'), authenticate, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      })
    }

    // Check permissions
    const canCancel = (
      req.user.role === 'admin' ||
      appointment.patient.toString() === req.user._id.toString() ||
      appointment.doctor.toString() === req.user._id.toString()
    )

    if (!canCancel) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      })
    }

    // Check if appointment can be cancelled
    if (!appointment.canBeCancelled()) {
      return res.status(400).json({
        success: false,
        message: 'This appointment cannot be cancelled'
      })
    }

    // Free up the slot if it was booked
    try {
      const slot = await Slot.findOne({
        appointment: appointment._id,
        isBooked: true
      })

      if (slot) {
        slot.isBooked = false
        slot.bookedBy = null
        slot.appointment = null
        await slot.save()
      }
    } catch (slotError) {
      console.error('Error freeing up slot after cancellation:', slotError)
      // Don't fail the cancellation if slot update fails
    }

    // Permanently delete the appointment
    await Appointment.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: 'Appointment cancelled and deleted successfully'
    })
  } catch (error) {
    console.error('Cancel appointment error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to cancel appointment'
    })
  }
})

// @route   DELETE /api/appointments/:id
// @desc    Delete appointment permanently (use /cancel endpoint instead)
// @access  Private
router.delete('/:id', validateObjectId('id'), authenticate, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      })
    }

    // Check permissions
    const canDelete = (
      req.user.role === 'admin' || req.user.role === 'doctor' ||
      appointment.patient.toString() === req.user._id.toString() ||
      appointment.doctor.toString() === req.user._id.toString()
    )

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      })
    }

    // Check if appointment can be cancelled/deleted
    if (!appointment.canBeCancelled()) {
      return res.status(400).json({
        success: false,
        message: 'This appointment cannot be cancelled'
      })
    }

    // Free up the slot if it was booked
    try {
      const slot = await Slot.findOne({
        appointment: appointment._id,
        isBooked: true
      })

      if (slot) {
        slot.isBooked = false
        slot.bookedBy = null
        slot.appointment = null
        await slot.save()
      }
    } catch (slotError) {
      console.error('Error freeing up slot after deletion:', slotError)
      // Don't fail the deletion if slot update fails
    }

    // Permanently delete the appointment
    await Appointment.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: 'Appointment deleted successfully'
    })
  } catch (error) {
    console.error('Delete appointment error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete appointment'
    })
  }
})

// @route   PUT /api/appointments/:id/approve
// @desc    Approve appointment (Admin only)
// @access  Private (Admin only)
router.put('/:id/approve',
  validateObjectId('id'),
  authenticate,
  authorize('admin'),
  async (req, res) => {
    try {
      const appointment = await Appointment.findById(req.params.id)
        .populate('patient', 'firstName lastName email')

      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: 'Appointment not found'
        })
      }

      if (appointment.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Only pending appointments can be approved'
        })
      }

      appointment.status = 'confirmed'
      appointment.updatedBy = req.user._id
      await appointment.save()

      res.json({
        success: true,
        message: `Appointment approved for ${appointment.patient.firstName} ${appointment.patient.lastName}`,
        data: {
          appointment: {
            _id: appointment._id,
            status: appointment.status,
            patient: appointment.patient,
            appointmentDate: appointment.appointmentDate,
            appointmentTime: appointment.appointmentTime,
            service: appointment.service
          }
        }
      })
    } catch (error) {
      console.error('Approve appointment error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to approve appointment'
      })
    }
  }
)

// @route   PUT /api/appointments/:id/reject
// @desc    Reject appointment (Admin only)
// @access  Private (Admin only)
router.put('/:id/reject',
  validateObjectId('id'),
  authenticate,
  authorize('admin'),
  async (req, res) => {
    try {
      const { reason } = req.body
      const appointment = await Appointment.findById(req.params.id)
        .populate('patient', 'firstName lastName email')

      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: 'Appointment not found'
        })
      }

      if (appointment.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Only pending appointments can be rejected'
        })
      }

      appointment.status = 'rejected'
      appointment.updatedBy = req.user._id
      if (reason) {
        appointment.notes.doctor = reason
      }
      await appointment.save()

      res.json({
        success: true,
        message: `Appointment rejected for ${appointment.patient.firstName} ${appointment.patient.lastName}`,
        data: {
          appointment: {
            _id: appointment._id,
            status: appointment.status,
            patient: appointment.patient,
            appointmentDate: appointment.appointmentDate,
            appointmentTime: appointment.appointmentTime,
            service: appointment.service,
            rejectionReason: reason
          }
        }
      })
    } catch (error) {
      console.error('Reject appointment error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to reject appointment'
      })
    }
  }
)

// @route   GET /api/appointments/pending
// @desc    Get pending appointments (Admin/Doctor only)
// @access  Private (Admin/Doctor only)
router.get('/pending', authenticate, authorize('admin', 'doctor'), async (req, res) => {
  try {
    const pendingAppointments = await Appointment.find({ status: 'pending' })
      .populate('patient', 'firstName lastName email phone')
      .populate('doctor', 'firstName lastName')
      .sort({ createdAt: -1 })

    res.json({
      success: true,
      data: {
        appointments: pendingAppointments,
        count: pendingAppointments.length
      }
    })
  } catch (error) {
    console.error('Get pending appointments error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get pending appointments'
    })
  }
})

// @route   PUT /api/appointments/:id/reschedule
// @desc    Reschedule an appointment (cancel old, create new)
// @access  Private
router.put('/:id/reschedule', validateObjectId('id'), async (req, res) => {
  try {
    const appointmentId = req.params.id
    const {
      appointmentDate,
      appointmentTime,
      service,
      reason,
      duration,
      priority,
      symptoms,
      slotId
    } = req.body

    // Find the existing appointment
    const existingAppointment = await Appointment.findById(appointmentId)
    if (!existingAppointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      })
    }

    // Check if user can reschedule this appointment
    if (req.user.role === 'patient' && existingAppointment.patient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only reschedule your own appointments'
      })
    }

    // Check if appointment can be rescheduled
    if (!existingAppointment.canBeRescheduled()) {
      return res.status(400).json({
        success: false,
        message: 'This appointment cannot be rescheduled'
      })
    }

    // Find the doctor (use the single doctor in the system)
    const doctorUser = await User.findOne({ role: { $in: ['admin', 'doctor'] }, isActive: true })
    if (!doctorUser) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      })
    }

    // Find and validate the new slot
    let newSlot = null
    if (slotId) {
      newSlot = await Slot.findById(slotId)
      if (!newSlot) {
        return res.status(404).json({
          success: false,
          message: 'New slot not found'
        })
      }

      if (newSlot.isBooked || !newSlot.isAvailable) {
        return res.status(409).json({
          success: false,
          message: 'The selected slot is no longer available'
        })
      }
    } else {
      // Find available slot for the requested time
      newSlot = await Slot.findOne({
        doctor: doctorUser._id,
        date: new Date(appointmentDate),
        startTime: appointmentTime,
        isAvailable: true,
        isBooked: false
      })

      if (!newSlot) {
        return res.status(409).json({
          success: false,
          message: 'No available slot found for the requested time. Please choose a different time.'
        })
      }
    }

    // Free up the old slot
    try {
      const oldSlot = await Slot.findOne({
        appointment: existingAppointment._id,
        isBooked: true
      })

      if (oldSlot) {
        oldSlot.isBooked = false
        oldSlot.bookedBy = null
        oldSlot.appointment = null
        await oldSlot.save()
      }
    } catch (slotError) {
      console.error('Error freeing up old slot during reschedule:', slotError)
      // Continue with reschedule even if old slot cleanup fails
    }

    // Update the existing appointment with new details
    existingAppointment.appointmentDate = appointmentDate
    existingAppointment.appointmentTime = appointmentTime
    existingAppointment.service = service || existingAppointment.service
    existingAppointment.reason = reason || existingAppointment.reason
    existingAppointment.duration = duration || newSlot.duration
    existingAppointment.priority = priority || existingAppointment.priority
    existingAppointment.symptoms = symptoms || existingAppointment.symptoms
    existingAppointment.location = newSlot.location // Update location from new slot
    existingAppointment.status = 'confirmed'
    existingAppointment.updatedBy = req.user._id
    existingAppointment.updatedAt = new Date()

    await existingAppointment.save()

    // Book the new slot
    await newSlot.bookSlot(existingAppointment.patient, existingAppointment._id)

    // Populate the appointment with user details
    await existingAppointment.populate('patient', 'firstName lastName email phone')
    await existingAppointment.populate('doctor', 'firstName lastName email specialization')

    res.json({
      success: true,
      message: 'Appointment rescheduled successfully!',
      data: {
        appointment: existingAppointment,
        slot: {
          _id: newSlot._id,
          date: newSlot.date,
          startTime: newSlot.startTime,
          endTime: newSlot.endTime
        }
      }
    })
  } catch (error) {
    console.error('Reschedule appointment error:', error)

    if (error.message === 'Slot is not available for booking') {
      return res.status(409).json({
        success: false,
        message: 'The selected slot is no longer available. Please choose a different time slot.'
      })
    }

    res.status(500).json({
      success: false,
      message: 'Failed to reschedule appointment'
    })
  }
})

export default router
