import mongoose from 'mongoose'

const appointmentSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Patient is required']
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Doctor is required']
  },
  appointmentDate: {
    type: Date,
    required: [true, 'Appointment date is required']
  },
  appointmentTime: {
    type: String,
    required: [true, 'Appointment time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter time in HH:MM format']
  },
  duration: {
    type: Number,
    default: 30, // minutes
    min: [15, 'Minimum appointment duration is 15 minutes'],
    max: [240, 'Maximum appointment duration is 4 hours']
  },
  service: {
    type: String,
    required: [true, 'Service type is required'],
    enum: [
      'Gynaecological Problems',
      'Dermatologist Problems',
      'Ortho Problems',
      'Paediatric Problems',
      'Skin Related Issues',
      'Sex Related Problems',
      'Urology Problems',
      'Ayurvedic Treatment',
      'Homoepathic Medicine',
      'Other'
    ]
  },
  status: {
    type: String,
    enum: ['pending', 'scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show', 'rejected'],
    default: 'confirmed'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  reason: {
    type: String,
    required: [true, 'Reason for appointment is required'],
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  symptoms: [String],
  notes: {
    patient: String,
    doctor: String,
    nurse: String
  },
  vitals: {
    bloodPressure: {
      systolic: Number,
      diastolic: Number
    },
    heartRate: Number,
    temperature: Number,
    weight: Number,
    height: Number,
    oxygenSaturation: Number
  },
  diagnosis: [String],
  prescription: [{
    medication: String,
    dosage: String,
    frequency: String,
    duration: String,
    instructions: String
  }],
  followUp: {
    required: {
      type: Boolean,
      default: false
    },
    date: Date,
    notes: String
  },
  payment: {
    amount: {
      type: Number,
      min: [0, 'Amount cannot be negative']
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD'], // Allow INR as primary, USD as fallback
      validate: {
        validator: function(v) {
          return ['INR', 'USD'].includes(v)
        },
        message: 'Currency must be INR or USD'
      }
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'partially-paid', 'refunded', 'cancelled'],
      default: 'pending'
    },
    method: {
      type: String,
      enum: ['cash', 'card', 'insurance', 'online', 'bank-transfer']
    },
    transactionId: String,
    paidAt: Date
  },
  reminders: [{
    type: {
      type: String,
      enum: ['email', 'sms', 'push']
    },
    sentAt: Date,
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed']
    }
  }],
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isEmergency: {
    type: Boolean,
    default: false
  },
  location: {
    type: String,
    enum: ['clinic', 'hospital', 'home', 'online', 'ghodasar', 'vastral', 'gandhinagar'],
    default: 'clinic'
  },
  room: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Virtual for appointment duration in hours
appointmentSchema.virtual('durationHours').get(function() {
  return this.duration / 60
})

// Virtual for full appointment datetime
appointmentSchema.virtual('fullDateTime').get(function() {
  if (!this.appointmentDate || !this.appointmentTime) return null
  
  const [hours, minutes] = this.appointmentTime.split(':')
  const datetime = new Date(this.appointmentDate)
  datetime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
  
  return datetime
})

// Virtual for appointment end time
appointmentSchema.virtual('endDateTime').get(function() {
  const startTime = this.fullDateTime
  if (!startTime) return null
  
  const endTime = new Date(startTime)
  endTime.setMinutes(endTime.getMinutes() + this.duration)
  
  return endTime
})

// Indexes for better query performance
appointmentSchema.index({ patient: 1, appointmentDate: 1 })
appointmentSchema.index({ doctor: 1, appointmentDate: 1 })
appointmentSchema.index({ status: 1 })
appointmentSchema.index({ appointmentDate: 1, appointmentTime: 1 })
appointmentSchema.index({ service: 1 })

// Pre-save middleware to validate appointment time conflicts
appointmentSchema.pre('save', async function(next) {
  if (!this.isModified('appointmentDate') && !this.isModified('appointmentTime') && !this.isModified('doctor')) {
    return next()
  }
  
  try {
    // Check for doctor availability
    const conflictingAppointment = await this.constructor.findOne({
      _id: { $ne: this._id },
      doctor: this.doctor,
      appointmentDate: this.appointmentDate,
      appointmentTime: this.appointmentTime,
      status: { $in: ['scheduled', 'confirmed', 'in-progress'] }
    })
    
    if (conflictingAppointment) {
      const error = new Error('Doctor is not available at this time')
      error.name = 'ValidationError'
      return next(error)
    }
    
    next()
  } catch (error) {
    next(error)
  }
})

// Static method to find appointments by date range
appointmentSchema.statics.findByDateRange = function(startDate, endDate, filters = {}) {
  return this.find({
    appointmentDate: {
      $gte: startDate,
      $lte: endDate
    },
    ...filters
  }).populate('patient doctor', 'firstName lastName email phone')
}

// Static method to find upcoming appointments
appointmentSchema.statics.findUpcoming = function(userId, role = 'patient') {
  const filter = {
    appointmentDate: { $gte: new Date() },
    status: { $in: ['scheduled', 'confirmed'] }
  }
  
  if (role === 'patient') {
    filter.patient = userId
  } else if (role === 'doctor') {
    filter.doctor = userId
  }
  
  return this.find(filter)
    .populate('patient doctor', 'firstName lastName email phone')
    .sort({ appointmentDate: 1, appointmentTime: 1 })
}

// Instance method to check if appointment can be cancelled
appointmentSchema.methods.canBeCancelled = function() {
  // Allow cancellation regardless of appointment time (past or future)
  // Only prevent cancellation if already completed, cancelled, or no-show
  if (['completed', 'cancelled', 'no-show'].includes(this.status)) return false

  return true
}

// Instance method to check if appointment can be rescheduled
appointmentSchema.methods.canBeRescheduled = function() {
  // Allow rescheduling if appointment can be cancelled and is not in progress
  return this.canBeCancelled() && this.status !== 'in-progress'
}

export default mongoose.model('Appointment', appointmentSchema)
