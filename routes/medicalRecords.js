import express from 'express'
import MedicalRecord from '../models/MedicalRecord.js'
import { 
  authenticate, 
  authorize, 
  authorizePatientOrProvider 
} from '../middleware/auth.js'
import {
  validateMedicalRecord,
  validateObjectId,
  validatePagination,
  validateDateRange
} from '../middleware/validation.js'

const router = express.Router()

// All routes require authentication
router.use(authenticate)

// @route   GET /api/medical-records
// @desc    Get medical records (filtered by user role)
// @access  Private
router.get('/', validatePagination, validateDateRange, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = '-recordDate',
      recordType,
      startDate,
      endDate,
      patient,
      search
    } = req.query

    // Build query based on user role
    let query = {}

    if (req.user.role === 'patient') {
      // Patients can only see their own records
      query.patient = req.user._id
    } else if (req.user.role === 'doctor') {
      // Doctors can see records they created or are authorized to view
      query.$or = [
        { doctor: req.user._id },
        { 'privacy.authorizedUsers': req.user._id }
      ]
    }
    // Admins can see all records

    // Apply filters
    if (recordType) query.recordType = recordType
    if (patient && ['admin', 'doctor', 'nurse'].includes(req.user.role)) {
      query.patient = patient
    }

    // Date range filter
    if (startDate || endDate) {
      query.recordDate = {}
      if (startDate) query.recordDate.$gte = new Date(startDate)
      if (endDate) query.recordDate.$lte = new Date(endDate)
    }

    // Text search
    if (search) {
      query.$text = { $search: search }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit)

    // Execute query
    const records = await MedicalRecord.find(query)
      .populate('patient', 'firstName lastName email dateOfBirth')
      .populate('doctor', 'firstName lastName specialization')
      .populate('appointment', 'appointmentDate service')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))

    // Filter records based on access permissions
    const accessibleRecords = records.filter(record => 
      record.canAccess(req.user._id, req.user.role)
    )

    // Get total count
    const total = await MedicalRecord.countDocuments(query)
    const totalPages = Math.ceil(total / parseInt(limit))

    res.json({
      success: true,
      data: {
        records: accessibleRecords,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRecords: total,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      }
    })
  } catch (error) {
    console.error('Get medical records error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get medical records'
    })
  }
})

// @route   GET /api/medical-records/patient/:patientId
// @desc    Get medical records for a specific patient
// @access  Private (Patient themselves or Healthcare providers)
router.get('/patient/:patientId', 
  validateObjectId('patientId'),
  authorizePatientOrProvider,
  async (req, res) => {
    try {
      const { recordType, dateFrom, dateTo } = req.query

      const records = await MedicalRecord.findByPatient(req.params.patientId, {
        recordType,
        dateFrom,
        dateTo
      })

      // Filter records based on access permissions
      const accessibleRecords = records.filter(record => 
        record.canAccess(req.user._id, req.user.role)
      )

      res.json({
        success: true,
        data: {
          records: accessibleRecords
        }
      })
    } catch (error) {
      console.error('Get patient records error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to get patient medical records'
      })
    }
  }
)

// @route   GET /api/medical-records/search
// @desc    Search medical records
// @access  Private
router.get('/search', async (req, res) => {
  try {
    const { q, patient } = req.query

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      })
    }

    let patientId = patient
    if (req.user.role === 'patient') {
      patientId = req.user._id
    }

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID is required'
      })
    }

    const records = await MedicalRecord.searchRecords(q, patientId)

    // Filter records based on access permissions
    const accessibleRecords = records.filter(record => 
      record.canAccess(req.user._id, req.user.role)
    )

    res.json({
      success: true,
      data: {
        records: accessibleRecords,
        searchQuery: q
      }
    })
  } catch (error) {
    console.error('Search medical records error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to search medical records'
    })
  }
})

// @route   POST /api/medical-records
// @desc    Create new medical record
// @access  Private (Healthcare providers only)
router.post('/', 
  authorize('doctor', 'nurse', 'admin'),
  validateMedicalRecord,
  async (req, res) => {
    try {
      const recordData = {
        ...req.body,
        doctor: req.user._id,
        createdBy: req.user._id
      }

      const record = new MedicalRecord(recordData)
      await record.save()

      await record.populate('patient', 'firstName lastName email')
      await record.populate('doctor', 'firstName lastName specialization')

      res.status(201).json({
        success: true,
        message: 'Medical record created successfully',
        data: {
          record
        }
      })
    } catch (error) {
      console.error('Create medical record error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to create medical record'
      })
    }
  }
)

// @route   GET /api/medical-records/:id
// @desc    Get medical record by ID
// @access  Private
router.get('/:id', validateObjectId('id'), async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id)
      .populate('patient', 'firstName lastName email dateOfBirth phone')
      .populate('doctor', 'firstName lastName specialization')
      .populate('appointment', 'appointmentDate service')
      .populate('createdBy', 'firstName lastName')

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      })
    }

    // Check access permissions
    if (!record.canAccess(req.user._id, req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      })
    }

    res.json({
      success: true,
      data: {
        record
      }
    })
  } catch (error) {
    console.error('Get medical record error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get medical record'
    })
  }
})

// @route   PUT /api/medical-records/:id
// @desc    Update medical record
// @access  Private (Healthcare providers only)
router.put('/:id', 
  validateObjectId('id'),
  authorize('doctor', 'nurse', 'admin'),
  async (req, res) => {
    try {
      const record = await MedicalRecord.findById(req.params.id)

      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'Medical record not found'
        })
      }

      // Check if user can edit this record
      const canEdit = (
        req.user.role === 'admin' || req.user.role === 'doctor' ||
        record.doctor.toString() === req.user._id.toString() ||
        record.createdBy.toString() === req.user._id.toString()
      )

      if (!canEdit) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        })
      }

      // Create amendment if record is already active
      if (record.status === 'active' && req.body.amendmentReason) {
        record.status = 'amended'
        record.version += 1
        record.amendmentReason = req.body.amendmentReason
      }

      // Update fields
      Object.keys(req.body).forEach(key => {
        if (key !== 'amendmentReason' && req.body[key] !== undefined) {
          record[key] = req.body[key]
        }
      })

      record.lastModifiedBy = req.user._id
      await record.save()

      await record.populate('patient', 'firstName lastName email')
      await record.populate('doctor', 'firstName lastName specialization')

      res.json({
        success: true,
        message: 'Medical record updated successfully',
        data: {
          record
        }
      })
    } catch (error) {
      console.error('Update medical record error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to update medical record'
      })
    }
  }
)

// @route   PUT /api/medical-records/:id/privacy
// @desc    Update medical record privacy settings
// @access  Private (Doctor who created it or Admin)
router.put('/:id/privacy', 
  validateObjectId('id'),
  authorize('doctor', 'admin'),
  async (req, res) => {
    try {
      const { isConfidential, accessLevel, authorizedUsers } = req.body

      const record = await MedicalRecord.findById(req.params.id)

      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'Medical record not found'
        })
      }

      // Check permissions
      const canUpdate = (
        req.user.role === 'admin' || req.user.role === 'doctor' ||
        record.doctor.toString() === req.user._id.toString()
      )

      if (!canUpdate) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        })
      }

      // Update privacy settings
      if (isConfidential !== undefined) record.privacy.isConfidential = isConfidential
      if (accessLevel) record.privacy.accessLevel = accessLevel
      if (authorizedUsers) record.privacy.authorizedUsers = authorizedUsers

      record.lastModifiedBy = req.user._id
      await record.save()

      res.json({
        success: true,
        message: 'Privacy settings updated successfully',
        data: {
          privacy: record.privacy
        }
      })
    } catch (error) {
      console.error('Update privacy settings error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to update privacy settings'
      })
    }
  }
)

// @route   DELETE /api/medical-records/:id
// @desc    Archive medical record (soft delete)
// @access  Private (Admin only)
router.delete('/:id',
  validateObjectId('id'),
  authorize('admin', 'doctor'),
  async (req, res) => {
    try {
      const record = await MedicalRecord.findById(req.params.id)

      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'Medical record not found'
        })
      }

      // Archive instead of delete
      record.status = 'archived'
      record.lastModifiedBy = req.user._id
      await record.save()

      res.json({
        success: true,
        message: 'Medical record archived successfully'
      })
    } catch (error) {
      console.error('Archive medical record error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to archive medical record'
      })
    }
  }
)

export default router
