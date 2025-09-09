import { body, param, query, validationResult } from 'express-validator'
import mongoose from 'mongoose'
import { getISTDate, parseISTDate, parseFlexibleDate, calculateAge } from '../utils/dateUtils.js'
import { validateINRAmount, DEFAULT_CURRENCY } from '../utils/currencyUtils.js'

// Handle validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }))
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors
    })
  }
  
  next()
}

// Custom validator for MongoDB ObjectId
const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value)
}

// User registration validation
export const validateUserRegistration = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),
    
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),
    
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
    
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
    
  body('dateOfBirth')
    .optional()
    .custom((value) => {
      if (!value) return true // Optional field

      // Parse flexible date format (supports both ISO and dd/mm/yyyy)
      const birthDate = parseFlexibleDate(value)

      if (!birthDate) {
        throw new Error('Please provide date in dd/mm/yyyy format or valid ISO date')
      }

      // Calculate age using IST
      const age = calculateAge(birthDate)

      if (age < 0 || age > 150) {
        throw new Error('Please provide a valid date of birth (age must be between 0 and 150 years)')
      }

      return true
    }),
    
  body('role')
    .optional()
    .isIn(['patient', 'doctor', 'admin', 'nurse'])
    .withMessage('Invalid role specified'),
    
  handleValidationErrors
]

// User login validation
export const validateUserLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
    
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
    
  handleValidationErrors
]

// User profile update validation
export const validateUserUpdate = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),
    
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),
    
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
    
  body('phone')
    .optional()
    .custom((value) => {
      if (!value) return true // Optional field

      // Remove all spaces, hyphens, and other non-digit characters except +
      let cleanPhone = value.replace(/[\s\-()]/g, '')

      // Remove leading 0 if present (common in Indian mobile numbers)
      if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
        cleanPhone = cleanPhone.substring(1)
      }

      // Indian mobile number patterns
      const indianMobilePatterns = [
        /^(\+91|91)?[6-9]\d{9}$/, // Standard Indian mobile format
        /^[6-9]\d{9}$/, // Without country code
      ]

      const isValid = indianMobilePatterns.some(pattern => pattern.test(cleanPhone))

      if (!isValid) {
        throw new Error('Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9')
      }

      return true
    }),
    
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date of birth'),

  // Address validation
  body('address.street')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Street address must be between 1 and 200 characters'),

  body('address.city')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('City must be between 1 and 100 characters'),

  body('address.state')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('State must be between 1 and 100 characters'),

  body('address.zipCode')
    .optional()
    .trim()
    .matches(/^[0-9]{6}$/)
    .withMessage('ZIP code must be 6 digits'),

  body('address.country')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Country must be between 1 and 100 characters'),

  // Emergency contact validation
  body('emergencyContact.name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Emergency contact name must be between 2 and 100 characters'),

  body('emergencyContact.phone')
    .optional()
    .custom((value) => {
      if (!value) return true // Optional field

      // Remove all spaces, hyphens, and other non-digit characters except +
      let cleanPhone = value.replace(/[\s\-()]/g, '')

      // Remove leading 0 if present (common in Indian mobile numbers)
      if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
        cleanPhone = cleanPhone.substring(1)
      }

      // Indian mobile number patterns
      const indianMobilePatterns = [
        /^(\+91|91)?[6-9]\d{9}$/, // Standard Indian mobile format
        /^[6-9]\d{9}$/, // Without country code
      ]

      const isValid = indianMobilePatterns.some(pattern => pattern.test(cleanPhone))

      if (!isValid) {
        throw new Error('Please enter a valid 10-digit mobile number for emergency contact (starting with 6, 7, 8, or 9)')
      }

      return true
    }),

  body('emergencyContact.relationship')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Relationship must be between 1 and 50 characters'),

  handleValidationErrors
]

// Appointment creation validation
export const validateAppointmentCreation = [
  body('appointmentDate')
    .notEmpty()
    .withMessage('Appointment date is required')
    .custom((value) => {
      // Parse flexible date format
      const appointmentDate = parseFlexibleDate(value)

      if (!appointmentDate) {
        throw new Error('Please provide appointment date in dd/mm/yyyy format or valid ISO date')
      }

      const todayIST = getISTDate()

      // Set both dates to start of day for accurate comparison in IST
      appointmentDate.setHours(0, 0, 0, 0)
      todayIST.setHours(0, 0, 0, 0)

      // Prevent booking appointments for past dates (IST comparison)
      if (appointmentDate < todayIST) {
        throw new Error('Appointment date cannot be in the past. Please select today or a future date.')
      }

      // Don't allow appointments more than 1 year in advance (IST)
      const oneYearFromNowIST = getISTDate()
      oneYearFromNowIST.setFullYear(oneYearFromNowIST.getFullYear() + 1)
      oneYearFromNowIST.setHours(0, 0, 0, 0)

      if (appointmentDate > oneYearFromNowIST) {
        throw new Error('Appointment date cannot be more than 1 year in advance')
      }

      return true
    }),
    
  body('appointmentTime')
    .notEmpty()
    .withMessage('Appointment time is required')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Please provide time in HH:MM format'),
    
  body('service')
    .notEmpty()
    .withMessage('Service type is required')
    .isIn([
      'Gynaecological Problems', 'Dermatologist Problems', 'Ortho Problems',
      'Paediatric Problems', 'Skin Related Issues', 'Sex Related Problems',
      'Urology Problems', 'Ayurvedic Treatment', 'Homoepathic Medicine', 'Other'
    ])
    .withMessage('Invalid service type'),
    
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Reason for appointment is required')
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters'),
    
  body('duration')
    .optional()
    .isInt({ min: 15, max: 240 })
    .withMessage('Duration must be between 15 and 240 minutes'),
    
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority level'),

  // Payment validation for INR
  body('payment.amount')
    .optional()
    .isNumeric()
    .withMessage('Payment amount must be a number')
    .custom((value) => {
      if (typeof value === 'string') {
        value = parseFloat(value)
      }

      const validation = validateINRAmount(value, {
        min: 0,
        max: 100000, // 1 lakh INR maximum
        allowZero: true
      })

      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '))
      }

      return true
    }),

  body('payment.currency')
    .optional()
    .isIn(['INR', 'USD'])
    .withMessage('Currency must be INR or USD')
    .default(DEFAULT_CURRENCY),

  handleValidationErrors
]

// Medical record validation
export const validateMedicalRecord = [
  body('patient')
    .notEmpty()
    .withMessage('Patient is required')
    .custom(isValidObjectId)
    .withMessage('Invalid patient ID'),
    
  body('recordType')
    .notEmpty()
    .withMessage('Record type is required')
    .isIn([
      'consultation', 'diagnosis', 'treatment', 'lab-result',
      'imaging', 'surgery', 'vaccination', 'prescription',
      'follow-up', 'emergency', 'other'
    ])
    .withMessage('Invalid record type'),
    
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Record title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
    
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
    
  body('vitals.bloodPressure.systolic')
    .optional()
    .isInt({ min: 50, max: 300 })
    .withMessage('Systolic pressure must be between 50 and 300'),
    
  body('vitals.bloodPressure.diastolic')
    .optional()
    .isInt({ min: 30, max: 200 })
    .withMessage('Diastolic pressure must be between 30 and 200'),
    
  body('vitals.heartRate')
    .optional()
    .isInt({ min: 30, max: 250 })
    .withMessage('Heart rate must be between 30 and 250'),
    
  body('vitals.temperature.value')
    .optional()
    .isFloat({ min: 90, max: 110 })
    .withMessage('Temperature must be between 90 and 110 (Fahrenheit) or equivalent'),
    
  handleValidationErrors
]

// Password change validation
export const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
    
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
    
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password')
      }
      return true
    }),
    
  handleValidationErrors
]

// MongoDB ObjectId parameter validation
export const validateObjectId = (paramName = 'id') => [
  param(paramName)
    .custom(isValidObjectId)
    .withMessage(`Invalid ${paramName}`),
    
  handleValidationErrors
]

// Query parameter validation for pagination
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('sort')
    .optional()
    .isIn(['createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'name', '-name', 'appointmentDate', '-appointmentDate'])
    .withMessage('Invalid sort parameter'),

  handleValidationErrors
]

// Query parameter validation for slots pagination
export const validateSlotsPagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('sort')
    .optional()
    .isIn(['createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'date', '-date', 'startTime', '-startTime', 'date startTime', '-date -startTime'])
    .withMessage('Invalid sort parameter'),

  handleValidationErrors
]

// Date range validation
export const validateDateRange = [
  query('startDate')
    .optional()
    .custom((value) => {
      if (!value) return true

      const startDate = parseFlexibleDate(value)

      if (!startDate) {
        throw new Error('Start date must be in dd/mm/yyyy format or valid ISO date')
      }

      return true
    }),

  query('endDate')
    .optional()
    .custom((value, { req }) => {
      if (!value) return true

      const endDate = parseFlexibleDate(value)

      if (!endDate) {
        throw new Error('End date must be in dd/mm/yyyy format or valid ISO date')
      }

      if (req.query.startDate && value) {
        const startDate = parseFlexibleDate(req.query.startDate)

        if (startDate && endDate < startDate) {
          throw new Error('End date must be after start date')
        }
      }
      return true
    }),

  handleValidationErrors
]

export default {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validateUserUpdate,
  validateAppointmentCreation,
  validateMedicalRecord,
  validatePasswordChange,
  validateObjectId,
  validatePagination,
  validateSlotsPagination,
  validateDateRange
}
