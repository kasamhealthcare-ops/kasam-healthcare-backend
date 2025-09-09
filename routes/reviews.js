import express from 'express'
import googleReviewsService from '../services/googleReviews.js'

const router = express.Router()

// @route   GET /api/reviews
// @desc    Get Google Reviews for the healthcare clinic
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { limit = 5 } = req.query
    
    const reviewsData = await googleReviewsService.getReviews()
    
    // Limit the number of reviews returned
    const limitedReviews = {
      ...reviewsData,
      reviews: reviewsData.reviews.slice(0, parseInt(limit))
    }

    res.json({
      success: true,
      data: limitedReviews
    })
  } catch (error) {
    console.error('Get reviews error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews'
    })
  }
})

// @route   GET /api/reviews/place-details
// @desc    Get complete place details including reviews
// @access  Public
router.get('/place-details', async (req, res) => {
  try {
    const placeDetails = await googleReviewsService.getPlaceDetails()

    res.json({
      success: true,
      data: placeDetails
    })
  } catch (error) {
    console.error('Get place details error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch place details'
    })
  }
})

// @route   POST /api/reviews/refresh
// @desc    Refresh reviews cache (force fetch from Google)
// @access  Public
router.post('/refresh', async (req, res) => {
  try {
    // Clear cache to force fresh fetch
    googleReviewsService.clearCache()
    
    const reviewsData = await googleReviewsService.getReviews()

    res.json({
      success: true,
      message: 'Reviews cache refreshed successfully',
      data: reviewsData
    })
  } catch (error) {
    console.error('Refresh reviews error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to refresh reviews'
    })
  }
})

// @route   GET /api/reviews/cache-stats
// @desc    Get cache statistics (for debugging)
// @access  Public
router.get('/cache-stats', (req, res) => {
  try {
    const stats = googleReviewsService.getCacheStats()

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Get cache stats error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get cache stats'
    })
  }
})

export default router
