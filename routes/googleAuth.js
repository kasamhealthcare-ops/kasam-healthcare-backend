import express from 'express'
import passport from '../config/passport.js'
import { generateToken } from '../middleware/auth.js'

const router = express.Router()

// @route   GET /api/auth/google/test
// @desc    Test Google OAuth route accessibility
// @access  Public
router.get('/google/test', (req, res) => {
  res.json({
    success: true,
    message: 'Google OAuth routes are accessible',
    configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    clientId: process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Not set',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Not set'
  })
})

// @route   GET /api/auth/google
// @desc    Start Google OAuth flow
// @access  Public
router.get('/google', (req, res, next) => {
  // Check if Google OAuth is configured
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({
      success: false,
      message: 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.',
      setup_guide: 'See GOOGLE_OAUTH_SETUP.md for configuration instructions'
    })
  }

  // Proceed with Google OAuth
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })(req, res, next)
})

// @route   GET /api/auth/google/callback
// @desc    Google OAuth callback
// @access  Public
router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=google_auth_failed`,
    session: false 
  }),
  async (req, res) => {
    try {
      // Generate JWT token for the user
      const token = generateToken(req.user._id)
      
      // Remove password from user object
      const userResponse = req.user.toObject()
      delete userResponse.password

      // Redirect to frontend with token and user data
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
      const redirectUrl = `${frontendUrl}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(userResponse))}`
      
      res.redirect(redirectUrl)
    } catch (error) {
      console.error('Google callback error:', error)
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
      res.redirect(`${frontendUrl}/login?error=auth_callback_failed`)
    }
  }
)

// @route   POST /api/auth/google/verify
// @desc    Verify Google token (alternative method)
// @access  Public
router.post('/google/verify', async (req, res) => {
  try {
    const { credential } = req.body

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'Google credential is required'
      })
    }

    // Here you would verify the Google JWT token
    // For now, we'll use the passport strategy above
    res.json({
      success: true,
      message: 'Use the /api/auth/google endpoint for OAuth flow'
    })

  } catch (error) {
    console.error('Google verify error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to verify Google token'
    })
  }
})

export default router
