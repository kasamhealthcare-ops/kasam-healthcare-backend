import mongoose from 'mongoose'

const medicalRecordSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Patient is required']
  },
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Doctor is required']
  },
  recordDate: {
    type: Date,
    required: [true, 'Record date is required'],
    default: Date.now
  },
  recordType: {
    type: String,
    enum: [
      'consultation',
      'diagnosis',
      'treatment',
      'lab-result',
      'imaging',
      'surgery',
      'vaccination',
      'prescription',
      'follow-up',
      'emergency',
      'other'
    ],
    required: [true, 'Record type is required']
  },
  title: {
    type: String,
    required: [true, 'Record title is required'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  symptoms: [String],
  diagnosis: [{
    condition: {
      type: String,
      required: true
    },
    icd10Code: String,
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe', 'critical']
    },
    status: {
      type: String,
      enum: ['active', 'resolved', 'chronic', 'monitoring']
    },
    notes: String
  }],
  treatment: [{
    type: {
      type: String,
      enum: ['medication', 'therapy', 'surgery', 'lifestyle', 'other']
    },
    description: String,
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: ['prescribed', 'ongoing', 'completed', 'discontinued']
    }
  }],
  medications: [{
    name: {
      type: String,
      required: true
    },
    dosage: String,
    frequency: String,
    route: {
      type: String,
      enum: ['oral', 'injection', 'topical', 'inhalation', 'other']
    },
    startDate: Date,
    endDate: Date,
    prescribedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    instructions: String,
    sideEffects: [String],
    status: {
      type: String,
      enum: ['active', 'completed', 'discontinued', 'on-hold']
    }
  }],
  vitals: {
    bloodPressure: {
      systolic: {
        type: Number,
        min: [50, 'Systolic pressure too low'],
        max: [300, 'Systolic pressure too high']
      },
      diastolic: {
        type: Number,
        min: [30, 'Diastolic pressure too low'],
        max: [200, 'Diastolic pressure too high']
      }
    },
    heartRate: {
      type: Number,
      min: [30, 'Heart rate too low'],
      max: [250, 'Heart rate too high']
    },
    temperature: {
      value: Number,
      unit: {
        type: String,
        enum: ['celsius', 'fahrenheit'],
        default: 'fahrenheit'
      }
    },
    weight: {
      value: Number,
      unit: {
        type: String,
        enum: ['kg', 'lbs'],
        default: 'lbs'
      }
    },
    height: {
      value: Number,
      unit: {
        type: String,
        enum: ['cm', 'inches'],
        default: 'inches'
      }
    },
    oxygenSaturation: {
      type: Number,
      min: [70, 'Oxygen saturation too low'],
      max: [100, 'Oxygen saturation cannot exceed 100%']
    },
    respiratoryRate: {
      type: Number,
      min: [8, 'Respiratory rate too low'],
      max: [60, 'Respiratory rate too high']
    },
    bmi: Number
  },
  labResults: [{
    testName: String,
    testCode: String,
    result: String,
    normalRange: String,
    unit: String,
    status: {
      type: String,
      enum: ['normal', 'abnormal', 'critical', 'pending']
    },
    testDate: Date,
    lab: String,
    notes: String
  }],
  imaging: [{
    type: {
      type: String,
      enum: ['x-ray', 'ct-scan', 'mri', 'ultrasound', 'mammogram', 'other']
    },
    bodyPart: String,
    findings: String,
    impression: String,
    radiologist: String,
    imageDate: Date,
    imageFiles: [String]
  }],
  allergies: [{
    allergen: String,
    reaction: String,
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe', 'life-threatening']
    },
    onsetDate: Date
  }],
  immunizations: [{
    vaccine: String,
    date: Date,
    lot: String,
    site: String,
    provider: String,
    nextDue: Date
  }],
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    description: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  followUp: {
    required: {
      type: Boolean,
      default: false
    },
    date: Date,
    instructions: String,
    completed: {
      type: Boolean,
      default: false
    }
  },
  privacy: {
    isConfidential: {
      type: Boolean,
      default: false
    },
    accessLevel: {
      type: String,
      enum: ['public', 'restricted', 'confidential'],
      default: 'restricted'
    },
    authorizedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'amended', 'archived'],
    default: 'active'
  },
  version: {
    type: Number,
    default: 1
  },
  amendmentReason: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Virtual for BMI calculation
medicalRecordSchema.virtual('calculatedBMI').get(function() {
  if (!this.vitals?.weight?.value || !this.vitals?.height?.value) return null
  
  let weightKg = this.vitals.weight.value
  let heightM = this.vitals.height.value
  
  // Convert to metric if needed
  if (this.vitals.weight.unit === 'lbs') {
    weightKg = weightKg * 0.453592
  }
  if (this.vitals.height.unit === 'inches') {
    heightM = heightM * 0.0254
  } else if (this.vitals.height.unit === 'cm') {
    heightM = heightM / 100
  }
  
  const bmi = weightKg / (heightM * heightM)
  return Math.round(bmi * 10) / 10
})

// Indexes for better query performance
medicalRecordSchema.index({ patient: 1, recordDate: -1 })
medicalRecordSchema.index({ doctor: 1, recordDate: -1 })
medicalRecordSchema.index({ recordType: 1 })
medicalRecordSchema.index({ status: 1 })
medicalRecordSchema.index({ 'diagnosis.condition': 'text', 'description': 'text' })

// Pre-save middleware to calculate BMI
medicalRecordSchema.pre('save', function(next) {
  if (this.vitals?.weight?.value && this.vitals?.height?.value) {
    this.vitals.bmi = this.calculatedBMI
  }
  next()
})

// Static method to find records by patient
medicalRecordSchema.statics.findByPatient = function(patientId, options = {}) {
  const query = { patient: patientId }
  
  if (options.recordType) {
    query.recordType = options.recordType
  }
  
  if (options.dateFrom || options.dateTo) {
    query.recordDate = {}
    if (options.dateFrom) query.recordDate.$gte = new Date(options.dateFrom)
    if (options.dateTo) query.recordDate.$lte = new Date(options.dateTo)
  }
  
  return this.find(query)
    .populate('doctor', 'firstName lastName specialization')
    .populate('appointment', 'appointmentDate service')
    .sort({ recordDate: -1 })
}

// Static method to search records
medicalRecordSchema.statics.searchRecords = function(searchTerm, patientId) {
  return this.find({
    patient: patientId,
    $text: { $search: searchTerm }
  }).populate('doctor', 'firstName lastName')
}

// Instance method to check if user can access record
medicalRecordSchema.methods.canAccess = function(userId, userRole) {
  // Patient can always access their own records
  if (this.patient.toString() === userId.toString()) return true
  
  // Doctor who created the record can access
  if (this.doctor.toString() === userId.toString()) return true
  
  // Admin or doctor can access all records (since doctor is also admin)
  if (userRole === 'admin' || userRole === 'doctor') return true
  
  // Check authorized users for confidential records
  if (this.privacy.isConfidential) {
    return this.privacy.authorizedUsers.some(id => id.toString() === userId.toString())
  }
  
  // Healthcare providers can access non-confidential records
  if (['doctor', 'nurse'].includes(userRole) && this.privacy.accessLevel !== 'confidential') {
    return true
  }
  
  return false
}

export default mongoose.model('MedicalRecord', medicalRecordSchema)
