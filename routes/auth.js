import express from 'express'
import User from '../models/User.js'
import { generateToken, authenticate, sensitiveOperationLimit } from '../middleware/auth.js'
import {
  validateUserRegistration,
  validateUserLogin,
  validatePasswordChange
} from '../middleware/validation.js'
import { sendPasswordResetEmail, sendOTPEmail } from '../services/emailService.js'

const router = express.Router()

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', validateUserRegistration, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      dateOfBirth,
      address,
      role = 'patient'
    } = req.body

    // Check if user already exists
    const existingUser = await User.findByEmail(email)
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      })
    }

    // Create new user
    const user = new User({
      firstName,
      lastName,
      email,
      password,
      phone,
      dateOfBirth,
      role
    })

    // Handle address if provided
    if (address) {
      if (typeof address === 'string') {
        user.address = { street: address }
      } else {
        user.address = address
      }
    }

    await user.save()

    // Generate JWT token
    const token = generateToken(user._id)

    // Remove password from response
    const userResponse = user.toObject()
    delete userResponse.password

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userResponse,
        token
      }
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', validateUserLogin, async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user and include password for comparison
    const user = await User.findByEmail(email).select('+password')
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    // Check if account is locked
    if (user.isLocked()) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to too many failed login attempts'
      })
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      })
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password)
    
    if (!isPasswordValid) {
      // Increment login attempts
      await user.incLoginAttempts()
      
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts()
    }

    // Update last login
    user.lastLogin = new Date()
    await user.save()

    // Generate JWT token
    const token = generateToken(user._id)

    // Remove password from response
    const userResponse = user.toObject()
    delete userResponse.password

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        token
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', authenticate, async (req, res) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // Here we can log the logout event or invalidate refresh tokens if implemented
    
    res.json({
      success: true,
      message: 'Logout successful'
    })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    })
  }
})

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('emergencyContact')
      .select('-password')

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    res.json({
      success: true,
      data: {
        user
      }
    })
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile'
    })
  }
})

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', 
  authenticate, 
  sensitiveOperationLimit, 
  validatePasswordChange, 
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body

      // Get user with password
      const user = await User.findById(req.user._id).select('+password')
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        })
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword)
      
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        })
      }

      // Update password
      user.password = newPassword
      await user.save()

      res.json({
        success: true,
        message: 'Password changed successfully'
      })
    } catch (error) {
      console.error('Change password error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to change password'
      })
    }
  }
)

// @route   POST /api/auth/forgot-password
// @desc    Request password reset
// @access  Public
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      })
    }

    // Check if user exists
    const user = await User.findByEmail(email)

    if (user) {
      // Generate reset token (6-digit code for simplicity)
      const resetToken = Math.floor(100000 + Math.random() * 900000).toString()
      const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

      // Save reset token to user
      user.resetPasswordToken = resetToken
      user.resetPasswordExpiry = resetTokenExpiry
      await user.save()

      // Try to send email, fallback to console logging
      const emailResult = await sendPasswordResetEmail(email, resetToken)

      if (!emailResult.success) {
        console.log(`Email sending failed: ${emailResult.message}`)
        console.log(`Password reset token for ${email}: ${resetToken}`)
        console.log(`Token expires at: ${resetTokenExpiry}`)
      }
    }

    // Always return success message (security best practice)
    const response = {
      success: true,
      message: 'If an account with that email exists, a password reset code has been sent. If email is not configured, check the server console for the reset code.'
    }

    // In development mode, include the token in response for testing
    if (process.env.NODE_ENV === 'development' && user && (!process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      response.developmentToken = user.resetPasswordToken
      response.message = 'Password reset code generated. Since email is not configured, the code is provided below for testing.'
    }

    res.json(response)
  } catch (error) {
    console.error('Forgot password error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request'
    })
  }
})

// @route   POST /api/auth/reset-password
// @desc    Reset password using token
// @access  Public
router.post('/reset-password', async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, reset token, and new password are required'
      })
    }

    // Find user with valid reset token
    const user = await User.findOne({
      email: email,
      resetPasswordToken: resetToken,
      resetPasswordExpiry: { $gt: new Date() }
    })

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      })
    }

    // Update password and clear reset token
    user.password = newPassword // This will be hashed by the User model
    user.resetPasswordToken = undefined
    user.resetPasswordExpiry = undefined
    await user.save()

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.'
    })
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    })
  }
})

// @route   GET /api/auth/verify-token
// @desc    Verify if token is valid
// @access  Private
router.get('/verify-token', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user: req.user
      }
    })
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    })
  }
})

// @route   GET /api/auth/debug/users
// @desc    Get all users with reset tokens (development only)
// @access  Public (for development)
router.get('/debug/users', async (req, res) => {
  try {
    // Only enable in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ message: 'Not found' })
    }

    const users = await User.find({}, 'email resetPasswordToken resetPasswordExpiry')
    res.json({
      success: true,
      data: users
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    })
  }
})

// @route   POST /api/auth/send-otp
// @desc    Send OTP to email for authentication
// @access  Public
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      })
    }

    // Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      })
    }

    // Check if user exists
    let user = await User.findByEmail(email)

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    if (user) {
      // User exists - update OTP for login
      user.emailOTP = otp
      user.emailOTPExpiry = otpExpiry
      user.emailOTPAttempts = 0
      await user.save()
    } else {
      // User doesn't exist - this will be handled in verify-otp for registration
      // For now, we'll create a temporary record or handle it in verify-otp
      // Let's return success but handle registration in verify-otp
    }

    // Send OTP email
    const emailResult = await sendOTPEmail(email, otp, user ? user.firstName : 'User')

    if (!emailResult.success) {
      console.log(`OTP email sending failed: ${emailResult.message}`)
      console.log(`OTP for ${email}: ${otp}`)
    }

    // Always return success message (security best practice)
    const response = {
      success: true,
      message: 'OTP has been sent to your email address. Please check your inbox.',
      userExists: !!user
    }

    // In development mode, include the OTP in response for testing
    if (process.env.NODE_ENV === 'development' && (!process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      response.developmentOTP = otp
      response.message = 'OTP generated. Since email is not configured, the OTP is provided below for testing.'
    }

    res.json(response)
  } catch (error) {
    console.error('Send OTP error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.'
    })
  }
})

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP and login/register user
// @access  Public
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp, firstName, lastName } = req.body

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      })
    }

    // Find user by email
    let user = await User.findByEmail(email)

    if (user) {
      // User exists - verify OTP for login
      if (!user.emailOTP || !user.emailOTPExpiry) {
        return res.status(400).json({
          success: false,
          message: 'No OTP found. Please request a new OTP.'
        })
      }

      // Check if OTP has expired
      if (new Date() > user.emailOTPExpiry) {
        return res.status(400).json({
          success: false,
          message: 'OTP has expired. Please request a new OTP.'
        })
      }

      // Check OTP attempts
      if (user.emailOTPAttempts >= 5) {
        return res.status(429).json({
          success: false,
          message: 'Too many failed attempts. Please request a new OTP.'
        })
      }

      // Verify OTP
      if (user.emailOTP !== otp) {
        user.emailOTPAttempts += 1
        await user.save()

        return res.status(400).json({
          success: false,
          message: 'Invalid OTP. Please try again.',
          attemptsLeft: 5 - user.emailOTPAttempts
        })
      }

      // OTP is valid - clear OTP fields and login
      user.emailOTP = undefined
      user.emailOTPExpiry = undefined
      user.emailOTPAttempts = 0
      user.lastLogin = new Date()
      user.isEmailVerified = true
      await user.save()

    } else {
      // User doesn't exist - register new user
      if (!firstName || !lastName) {
        return res.status(400).json({
          success: false,
          message: 'First name and last name are required for registration'
        })
      }

      // Create new user
      user = new User({
        firstName,
        lastName,
        email,
        password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8), // Random password
        isEmailVerified: true,
        role: 'patient'
      })

      await user.save()
    }

    // Generate JWT token
    const token = generateToken(user._id)

    // Remove sensitive information
    const userResponse = user.toObject()
    delete userResponse.password
    delete userResponse.emailOTP
    delete userResponse.emailOTPExpiry
    delete userResponse.emailOTPAttempts

    res.json({
      success: true,
      message: user.isNew ? 'Registration successful' : 'Login successful',
      token,
      user: userResponse
    })

  } catch (error) {
    console.error('Verify OTP error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP. Please try again.'
    })
  }
})

export default router
