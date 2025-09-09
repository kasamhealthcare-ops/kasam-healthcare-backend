import jwt from 'jsonwebtoken'
import User from '../models/User.js'

// Generate JWT token
export const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  })
}

// Verify JWT token and authenticate user
export const authenticate = async (req, res, next) => {
  try {
    let token

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1]
    }
    // Check for token in cookies (if using cookie-based auth)
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      })
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      
      // Get user from database
      const user = await User.findById(decoded.userId).select('-password')
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Token is valid but user not found'
        })
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated'
        })
      }

      // Add user to request object
      req.user = user
      next()
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired'
        })
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        })
      } else {
        throw error
      }
    }
  } catch (error) {
    console.error('Authentication error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error during authentication'
    })
  }
}

// Authorize user based on roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`
      })
    }

    next()
  }
}

// Check if user owns the resource or has admin privileges
export const authorizeOwnerOrAdmin = (resourceUserField = 'user') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      })
    }

    // Admin or doctor can access everything (since doctor is also admin)
    if (req.user.role === 'admin' || req.user.role === 'doctor') {
      return next()
    }

    // Check if user owns the resource
    // Look for user ID in different places based on the field parameter
    let resourceUserId

    if (resourceUserField === 'id') {
      // For routes like /users/:id, check req.params.id
      resourceUserId = req.params.id
    } else {
      // For other cases, check the specified field in params, body, or query
      resourceUserId = req.params[resourceUserField] ||
                      req.params.userId ||
                      req.body[resourceUserField] ||
                      req.query[resourceUserField]
    }

    // Try multiple comparison methods
    const userIdStr = req.user._id.toString()
    const resourceIdStr = resourceUserId ? resourceUserId.toString() : null

    console.log('🔐 Authorization Debug:')
    console.log('  User ID from token:', userIdStr)
    console.log('  Resource User ID:', resourceUserId)
    console.log('  Resource User ID (string):', resourceIdStr)
    console.log('  Match check:', userIdStr === resourceIdStr)

    if (userIdStr === resourceIdStr || userIdStr === resourceUserId) {
      console.log('  ✅ Authorization granted')
      return next()
    }

    console.log('  ❌ Authorization denied')
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own resources.'
    })
  }
}

// Check if user is patient accessing their own data or healthcare provider
export const authorizePatientOrProvider = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    })
  }

  // Healthcare providers and admins can access
  if (['doctor', 'nurse', 'admin'].includes(req.user.role)) {
    return next()
  }

  // Patients can only access their own data
  if (req.user.role === 'patient') {
    const patientId = req.params.patientId || req.params.userId || req.body.patient
    
    if (req.user._id.toString() === patientId) {
      return next()
    }
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied. Insufficient permissions.'
  })
}

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (req, res, next) => {
  try {
    let token

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1]
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await User.findById(decoded.userId).select('-password')
        
        if (user && user.isActive) {
          req.user = user
        }
      } catch (error) {
        // Ignore token errors for optional auth
        console.log('Optional auth token error:', error.message)
      }
    }

    next()
  } catch (error) {
    console.error('Optional authentication error:', error)
    next() // Continue even if there's an error
  }
}

// Rate limiting for sensitive operations
export const sensitiveOperationLimit = (req, res, next) => {
  // This would typically use Redis or a similar store
  // For now, we'll implement a simple in-memory rate limiter
  
  const key = `${req.ip}-${req.user?._id || 'anonymous'}`
  const now = Date.now()
  const windowMs = 15 * 60 * 1000 // 15 minutes
  const maxAttempts = 5

  // In production, use Redis or similar
  if (!global.rateLimitStore) {
    global.rateLimitStore = new Map()
  }

  const userAttempts = global.rateLimitStore.get(key) || []
  const recentAttempts = userAttempts.filter(time => now - time < windowMs)

  if (recentAttempts.length >= maxAttempts) {
    return res.status(429).json({
      success: false,
      message: 'Too many attempts. Please try again later.',
      retryAfter: Math.ceil((recentAttempts[0] + windowMs - now) / 1000)
    })
  }

  recentAttempts.push(now)
  global.rateLimitStore.set(key, recentAttempts)

  next()
}

// Middleware to log user activity
export const logActivity = (action) => {
  return (req, res, next) => {
    if (req.user) {
      // In production, you'd save this to a database
      console.log(`User ${req.user._id} performed action: ${action} at ${new Date().toISOString()}`)
    }
    next()
  }
}

export default {
  generateToken,
  authenticate,
  authorize,
  authorizeOwnerOrAdmin,
  authorizePatientOrProvider,
  optionalAuth,
  sensitiveOperationLimit,
  logActivity
}
