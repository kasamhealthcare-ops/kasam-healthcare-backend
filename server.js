import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import session from 'express-session'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Import routes
import authRoutes from './routes/auth.js'
import googleAuthRoutes from './routes/googleAuth.js'
import userRoutes from './routes/users.js'
import appointmentRoutes from './routes/appointments.js'
import medicalRecordRoutes from './routes/medicalRecords.js'
import slotRoutes from './routes/slots.js'
import reviewRoutes from './routes/reviews.js'

// Import middleware
import { authenticate } from './middleware/auth.js'
import passport from './config/passport.js'

// Import services
import slotService from './services/slotService.js'

// Load environment variables
dotenv.config()

// Get current directory (ES modules)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Create Express app
const app = express()

// Trust proxy (important for rate limiting behind reverse proxy)
app.set('trust proxy', 1)

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}))

// Rate limiting configurations
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Increased for development
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip OAuth routes, health checks, and development IPs
  skip: (req) => {
    // Skip in development environment
    if (process.env.NODE_ENV === 'development') {
      const devIPs = ['127.0.0.1', '::1', 'localhost']
      if (devIPs.includes(req.ip) || req.ip.startsWith('192.168.') || req.ip.startsWith('10.')) {
        return true
      }
    }

    const skipPaths = [
      '/api/auth/google',
      '/api/auth/google/callback',
      '/api/auth/google/test',
      '/api/health'
    ]
    return skipPaths.some(path => req.path.startsWith(path))
  }
})

// Stricter rate limiting for sensitive auth operations
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // More lenient for auth operations
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Only apply to specific auth routes
  skip: (req) => {
    const authPaths = ['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password']
    return !authPaths.some(path => req.path === path)
  }
})

// Very lenient rate limiting for OAuth (to prevent blocking during redirects)
const oauthLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // Very high limit for OAuth flows
  message: {
    success: false,
    message: 'OAuth service temporarily unavailable, please try again in a few minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
})

// Apply general rate limiting to all routes
app.use(generalLimiter)

// Apply auth-specific rate limiting
app.use('/api/auth', authLimiter)

// Apply OAuth-specific rate limiting to OAuth routes
app.use('/api/auth/google', oauthLimiter)

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)
    
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    ]
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}

app.use(cors(corsOptions))

// Compression middleware
app.use(compression())

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
} else {
  app.use(morgan('combined'))
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Session middleware for Passport
app.use(session({
  secret: process.env.SESSION_SECRET || 'kasam-healthcare-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}))

// Passport middleware
app.use(passport.initialize())
app.use(passport.session())

// Static files (for file uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Kasam Healthcare API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  })
})

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/auth', googleAuthRoutes)
app.use('/api/users', userRoutes)
app.use('/api/appointments', appointmentRoutes)
app.use('/api/medical-records', medicalRecordRoutes)
app.use('/api/slots', slotRoutes)
app.use('/api/reviews', reviewRoutes)

// Health check endpoint under /api path (must be after other routes)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Kasam Healthcare API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  })
})

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Kasam Healthcare API',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register a new user',
        'POST /api/auth/login': 'Login user',
        'POST /api/auth/logout': 'Logout user',
        'GET /api/auth/me': 'Get current user profile',
        'PUT /api/auth/change-password': 'Change password'
      },
      users: {
        'GET /api/users': 'Get all users (admin only)',
        'GET /api/users/:id': 'Get user by ID',
        'PUT /api/users/:id': 'Update user profile',
        'DELETE /api/users/:id': 'Delete user (admin only)'
      },
      appointments: {
        'GET /api/appointments': 'Get appointments',
        'POST /api/appointments': 'Create appointment',
        'GET /api/appointments/:id': 'Get appointment by ID',
        'PUT /api/appointments/:id': 'Update appointment',
        'DELETE /api/appointments/:id': 'Cancel appointment'
      },
      medicalRecords: {
        'GET /api/medical-records': 'Get medical records',
        'POST /api/medical-records': 'Create medical record',
        'GET /api/medical-records/:id': 'Get medical record by ID',
        'PUT /api/medical-records/:id': 'Update medical record',
        'DELETE /api/medical-records/:id': 'Delete medical record'
      },
      slots: {
        'GET /api/slots/available': 'Get available slots',
        'GET /api/slots': 'Get slots',
        'POST /api/slots': 'Create slot (Doctor/Admin)',
        'PUT /api/slots/:id': 'Update slot (Doctor/Admin)',
        'DELETE /api/slots/:id': 'Delete slot (Doctor/Admin)'
      },
      reviews: {
        'GET /api/reviews': 'Get Google Reviews',
        'GET /api/reviews/place-details': 'Get place details',
        'POST /api/reviews/refresh': 'Refresh reviews cache'
      }
    },
    documentation: 'Visit /api/docs for detailed API documentation'
  })
})

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl
  })
})

// Global error handler
app.use((error, req, res, next) => {
  console.error('Error:', error)

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message
    }))
    
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors
    })
  }

  // Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0]
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
      field
    })
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    })
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    })
  }

  // CORS error
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation'
    })
  }

  // Default error
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  })
})

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`)
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err)
    })

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected')
    })

    process.on('SIGINT', async () => {
      await mongoose.connection.close()
      console.log('🔌 MongoDB connection closed through app termination')
      process.exit(0)
    })

  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    process.exit(1)
  }
}

// Start server
const PORT = process.env.PORT || 5000

const startServer = async () => {
  try {
    // Connect to database
    await connectDB()

    // Initialize slot service (automated slot management)
    await slotService.initialize()

    // Start listening
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`)
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`)
      console.log(`📋 Health check: http://localhost:${PORT}/health`)
      console.log(`📚 API docs: http://localhost:${PORT}/api`)

      if (process.env.NODE_ENV === 'development') {
        console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL}`)
      }
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error.message)
    process.exit(1)
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err.message)
  process.exit(1)
})

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message)
  process.exit(1)
})

// Start the server
startServer()

export default app
