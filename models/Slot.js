import mongoose from 'mongoose'

const slotSchema = new mongoose.Schema({
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Doctor is required']
  },
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter time in HH:MM format']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter time in HH:MM format']
  },
  duration: {
    type: Number,
    default: 30, // minutes
    min: [15, 'Minimum slot duration is 15 minutes'],
    max: [240, 'Maximum slot duration is 4 hours']
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  isBooked: {
    type: Boolean,
    default: false
  },
  bookedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  location: {
    type: String,
    enum: ['clinic', 'hospital', 'home', 'online', 'ghodasar', 'vastral', 'gandhinagar'],
    default: 'clinic'
  },
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Virtual for full date-time
slotSchema.virtual('startDateTime').get(function() {
  if (!this.date || !this.startTime) return null
  
  const [hours, minutes] = this.startTime.split(':').map(Number)
  const dateTime = new Date(this.date)
  dateTime.setHours(hours, minutes, 0, 0)
  return dateTime
})

slotSchema.virtual('endDateTime').get(function() {
  if (!this.date || !this.endTime) return null
  
  const [hours, minutes] = this.endTime.split(':').map(Number)
  const dateTime = new Date(this.date)
  dateTime.setHours(hours, minutes, 0, 0)
  return dateTime
})

// Index for efficient queries
slotSchema.index({ doctor: 1, date: 1, startTime: 1 })
slotSchema.index({ date: 1, isAvailable: 1, isBooked: 1 })

// Static method to find available slots
slotSchema.statics.findAvailableSlots = function(doctorId, date, filters = {}) {
  const query = {
    doctor: doctorId,
    date: date,
    isAvailable: true,
    isBooked: false,
    ...filters
  }
  
  return this.find(query)
    .populate('doctor', 'firstName lastName')
    .sort({ startTime: 1 })
}

// Static method to find slots by date range
slotSchema.statics.findByDateRange = function(doctorId, startDate, endDate, filters = {}) {
  return this.find({
    doctor: doctorId,
    date: {
      $gte: startDate,
      $lte: endDate
    },
    ...filters
  }).populate('doctor bookedBy', 'firstName lastName email')
    .sort({ date: 1, startTime: 1 })
}

// Instance method to book slot
slotSchema.methods.bookSlot = function(patientId, appointmentId) {
  if (this.isBooked || !this.isAvailable) {
    throw new Error('Slot is not available for booking')
  }
  
  this.isBooked = true
  this.bookedBy = patientId
  this.appointment = appointmentId
  return this.save()
}

// Instance method to cancel booking
slotSchema.methods.cancelBooking = function() {
  this.isBooked = false
  this.bookedBy = undefined
  this.appointment = undefined
  return this.save()
}

// Pre-save validation
slotSchema.pre('save', function(next) {
  // Validate that end time is after start time
  if (this.startTime && this.endTime) {
    const [startHours, startMinutes] = this.startTime.split(':').map(Number)
    const [endHours, endMinutes] = this.endTime.split(':').map(Number)
    
    const startTotalMinutes = startHours * 60 + startMinutes
    const endTotalMinutes = endHours * 60 + endMinutes
    
    if (endTotalMinutes <= startTotalMinutes) {
      return next(new Error('End time must be after start time'))
    }
    
    // Calculate and set duration
    this.duration = endTotalMinutes - startTotalMinutes
  }
  
  next()
})

export default mongoose.model('Slot', slotSchema)
