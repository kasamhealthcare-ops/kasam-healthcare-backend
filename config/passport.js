import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import User from '../models/User.js'
import { generateToken } from '../middleware/auth.js'

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value

    // Prevent admin@kasamhealthcare.com from using Google OAuth
    if (email === 'admin@kasamhealthcare.com') {
      return done(new Error('Admin account must use traditional login. Please use the Admin Login option.'), null)
    }

    // Check if user already exists with this Google ID
    let user = await User.findOne({ googleId: profile.id })

    if (user) {
      // User exists, return user
      return done(null, user)
    }

    // Check if user exists with the same email
    user = await User.findByEmail(email)

    if (user) {
      // User exists with same email, link Google account
      user.googleId = profile.id
      user.isEmailVerified = true // Google emails are verified
      await user.save()
      return done(null, user)
    }

    // Create new user (only for non-admin emails)
    const newUser = new User({
      googleId: profile.id,
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
      email: email,
      isEmailVerified: true,
      profilePicture: profile.photos[0]?.value,
      role: 'patient', // Default role for Google sign-ups (admin must use traditional login)
      // Generate a random password (user won't use it since they login with Google)
      password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
    })

    await newUser.save()
    return done(null, newUser)

  } catch (error) {
    console.error('Google OAuth error:', error)
    return done(error, null)
  }
}))

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id)
})

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id)
    done(null, user)
  } catch (error) {
    done(error, null)
  }
})

export default passport
