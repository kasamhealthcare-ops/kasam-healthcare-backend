import express from 'express'
import User from '../models/User.js'
import { 
  authenticate, 
  authorize, 
  authorizeOwnerOrAdmin 
} from '../middleware/auth.js'
import {
  validateUserUpdate,
  validateObjectId,
  validatePagination
} from '../middleware/validation.js'

const router = express.Router()

// Most routes require authentication (doctors endpoint is public)
// router.use(authenticate) - moved to individual routes



// @route   GET /api/users
// @desc    Get all users (admin only) or search users
// @access  Private (Admin only)
router.get('/', authenticate, authorize('admin', 'doctor'), validatePagination, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = '-createdAt',
      role,
      search,
      isActive
    } = req.query

    // Build query
    const query = {}
    
    if (role) {
      query.role = role
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true'
    }
    
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit)
    
    // Execute query
    const users = await User.find(query)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))

    // Get total count for pagination
    const total = await User.countDocuments(query)
    const totalPages = Math.ceil(total / parseInt(limit))

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalUsers: total,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      }
    })
  } catch (error) {
    console.error('Get users error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get users'
    })
  }
})

// Removed /api/users/doctors endpoint - no longer needed since using static doctor info

// @route   GET /api/users/stats
// @desc    Get user statistics (admin only)
// @access  Private (Admin only)
router.get('/stats', authenticate, authorize('admin', 'doctor'), async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ])

    const totalUsers = await User.countDocuments()
    const activeUsers = await User.countDocuments({ isActive: true })
    const newUsersThisMonth = await User.countDocuments({
      createdAt: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      }
    })

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        newUsersThisMonth,
        usersByRole: stats.reduce((acc, stat) => {
          acc[stat._id] = stat.count
          return acc
        }, {})
      }
    })
  } catch (error) {
    console.error('Get user stats error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get user statistics'
    })
  }
})

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private (Own profile or Admin)
router.get('/:id',
  authenticate,
  validateObjectId('id'),
  authorizeOwnerOrAdmin('id'),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id)
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
      console.error('Get user error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to get user'
      })
    }
  }
)

// @route   PUT /api/users/:id
// @desc    Update user profile
// @access  Private (Own profile or Admin)
router.put('/:id',
  authenticate,
  validateObjectId('id'),
  authorizeOwnerOrAdmin('id'),
  validateUserUpdate,
  async (req, res) => {
    try {

      const {
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth,
        address,
        emergencyContact,
        medicalInfo,
        preferences
      } = req.body

      const user = await User.findById(req.params.id)

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        })
      }

      // Check if email is being changed and if it's already taken
      if (email && email !== user.email) {
        const existingUser = await User.findByEmail(email)
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Email is already taken'
          })
        }
      }

      // Update fields
      if (firstName) user.firstName = firstName
      if (lastName) user.lastName = lastName
      if (email) user.email = email
      if (phone) user.phone = phone
      if (dateOfBirth) user.dateOfBirth = dateOfBirth
      if (address) user.address = { ...user.address, ...address }
      if (emergencyContact) user.emergencyContact = { ...user.emergencyContact, ...emergencyContact }
      if (medicalInfo) user.medicalInfo = { ...user.medicalInfo, ...medicalInfo }
      if (preferences) user.preferences = { ...user.preferences, ...preferences }

      await user.save()

      // Remove password from response
      const userResponse = user.toObject()
      delete userResponse.password

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: userResponse
        }
      })
    } catch (error) {
      console.error('Update user error:', error)

      // Handle validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }))

        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationErrors
        })
      }

      // Handle duplicate key errors
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0]
        return res.status(400).json({
          success: false,
          message: `${field} already exists`
        })
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
)

// @route   PUT /api/users/:id/role
// @desc    Update user role (admin only)
// @access  Private (Admin only)
router.put('/:id/role',
  authenticate,
  validateObjectId('id'),
  authorize('admin', 'doctor'),
  async (req, res) => {
    try {
      const { role } = req.body

      if (!role || !['patient', 'doctor', 'admin', 'nurse'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role specified'
        })
      }

      const user = await User.findById(req.params.id)

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        })
      }

      user.role = role
      await user.save()

      res.json({
        success: true,
        message: 'User role updated successfully',
        data: {
          user: {
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role
          }
        }
      })
    } catch (error) {
      console.error('Update user role error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to update user role'
      })
    }
  }
)

// @route   PUT /api/users/:id/status
// @desc    Activate/deactivate user (admin only)
// @access  Private (Admin only)
router.put('/:id/status',
  authenticate,
  validateObjectId('id'),
  authorize('admin'),
  async (req, res) => {
    try {
      const { isActive } = req.body

      if (typeof isActive !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'isActive must be a boolean value'
        })
      }

      const user = await User.findById(req.params.id)

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        })
      }

      user.isActive = isActive
      await user.save()

      res.json({
        success: true,
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: {
          user: {
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            isActive: user.isActive
          }
        }
      })
    } catch (error) {
      console.error('Update user status error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to update user status'
      })
    }
  }
)

// @route   DELETE /api/users/:id
// @desc    Delete user (admin only)
// @access  Private (Admin only)
router.delete('/:id',
  authenticate,
  validateObjectId('id'),
  authorize('admin'),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id)

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        })
      }

      // Prevent admin from deleting themselves
      if (user._id.toString() === req.user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'You cannot delete your own account'
        })
      }

      await User.findByIdAndDelete(req.params.id)

      res.json({
        success: true,
        message: 'User deleted successfully'
      })
    } catch (error) {
      console.error('Delete user error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to delete user'
      })
    }
  }
)

export default router
