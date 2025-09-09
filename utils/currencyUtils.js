/**
 * Currency utility functions for INR (Indian Rupee)
 * Ensures consistency across the entire application
 */

// Default currency configuration
export const DEFAULT_CURRENCY = 'INR'
export const SUPPORTED_CURRENCIES = ['INR', 'USD']

// INR formatting configuration
const INR_CONFIG = {
  currency: 'INR',
  locale: 'en-IN',
  symbol: '₹',
  decimals: 2,
  thousandsSeparator: ',',
  decimalSeparator: '.'
}

/**
 * Format amount in INR with proper Indian number formatting
 * @param {number} amount - Amount to format
 * @param {object} options - Formatting options
 * @returns {string} Formatted currency string
 */
export const formatINR = (amount, options = {}) => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '₹0.00'
  }
  
  const {
    showSymbol = true,
    showDecimals = true,
    locale = 'en-IN'
  } = options
  
  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: showDecimals ? 2 : 0,
      maximumFractionDigits: showDecimals ? 2 : 0
    })
    
    let formatted = formatter.format(amount)
    
    if (!showSymbol) {
      formatted = formatted.replace('₹', '').trim()
    }
    
    return formatted
  } catch (error) {
    // Fallback formatting
    const fixed = showDecimals ? amount.toFixed(2) : Math.round(amount).toString()
    const withCommas = fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return showSymbol ? `₹${withCommas}` : withCommas
  }
}

/**
 * Format amount in words (Indian style)
 * @param {number} amount - Amount to convert to words
 * @returns {string} Amount in words
 */
export const formatINRInWords = (amount) => {
  if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
    return 'Zero Rupees'
  }
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  
  const convertHundreds = (num) => {
    let result = ''
    
    if (num >= 100) {
      result += ones[Math.floor(num / 100)] + ' Hundred '
      num %= 100
    }
    
    if (num >= 20) {
      result += tens[Math.floor(num / 10)] + ' '
      num %= 10
    } else if (num >= 10) {
      result += teens[num - 10] + ' '
      return result
    }
    
    if (num > 0) {
      result += ones[num] + ' '
    }
    
    return result
  }
  
  const rupees = Math.floor(amount)
  const paise = Math.round((amount - rupees) * 100)
  
  let result = ''
  
  if (rupees === 0) {
    result = 'Zero'
  } else {
    // Handle crores
    if (rupees >= 10000000) {
      result += convertHundreds(Math.floor(rupees / 10000000)) + 'Crore '
      rupees %= 10000000
    }
    
    // Handle lakhs
    if (rupees >= 100000) {
      result += convertHundreds(Math.floor(rupees / 100000)) + 'Lakh '
      rupees %= 100000
    }
    
    // Handle thousands
    if (rupees >= 1000) {
      result += convertHundreds(Math.floor(rupees / 1000)) + 'Thousand '
      rupees %= 1000
    }
    
    // Handle hundreds
    if (rupees > 0) {
      result += convertHundreds(rupees)
    }
  }
  
  result += 'Rupees'
  
  if (paise > 0) {
    result += ' and ' + convertHundreds(paise) + 'Paise'
  }
  
  return result.trim()
}

/**
 * Parse INR string to number
 * @param {string} currencyString - Currency string to parse
 * @returns {number} Parsed amount
 */
export const parseINR = (currencyString) => {
  if (typeof currencyString !== 'string') {
    return 0
  }
  
  // Remove currency symbol and spaces
  const cleaned = currencyString.replace(/[₹,\s]/g, '')
  const parsed = parseFloat(cleaned)
  
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Validate INR amount
 * @param {number} amount - Amount to validate
 * @param {object} options - Validation options
 * @returns {object} Validation result
 */
export const validateINRAmount = (amount, options = {}) => {
  const {
    min = 0,
    max = 10000000, // 1 crore
    allowZero = true
  } = options
  
  const errors = []
  
  if (typeof amount !== 'number' || isNaN(amount)) {
    errors.push('Amount must be a valid number')
    return { isValid: false, errors }
  }
  
  if (!allowZero && amount === 0) {
    errors.push('Amount cannot be zero')
  }
  
  if (amount < min) {
    errors.push(`Amount cannot be less than ${formatINR(min)}`)
  }
  
  if (amount > max) {
    errors.push(`Amount cannot be more than ${formatINR(max)}`)
  }
  
  if (amount < 0) {
    errors.push('Amount cannot be negative')
  }
  
  // Check for too many decimal places
  const decimalPlaces = (amount.toString().split('.')[1] || '').length
  if (decimalPlaces > 2) {
    errors.push('Amount cannot have more than 2 decimal places')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Convert currency from other currencies to INR
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency
 * @param {number} exchangeRate - Exchange rate to INR
 * @returns {number} Amount in INR
 */
export const convertToINR = (amount, fromCurrency, exchangeRate) => {
  if (fromCurrency === 'INR') {
    return amount
  }
  
  if (typeof amount !== 'number' || typeof exchangeRate !== 'number') {
    return 0
  }
  
  return Math.round((amount * exchangeRate) * 100) / 100
}

/**
 * Get consultation fee in INR
 * @param {string} serviceType - Type of service
 * @returns {number} Fee in INR
 */
export const getConsultationFee = (serviceType = 'general') => {
  const fees = {
    'general': 1000,
    'follow-up': 500,
    'emergency': 1500,
    'online': 800,
    'home-visit': 2000
  }
  
  return fees[serviceType.toLowerCase()] || fees.general
}

/**
 * Calculate tax amount (if applicable)
 * @param {number} amount - Base amount
 * @param {number} taxRate - Tax rate (e.g., 0.18 for 18%)
 * @returns {object} Tax calculation details
 */
export const calculateTax = (amount, taxRate = 0) => {
  if (typeof amount !== 'number' || typeof taxRate !== 'number') {
    return { baseAmount: 0, taxAmount: 0, totalAmount: 0 }
  }
  
  const taxAmount = Math.round((amount * taxRate) * 100) / 100
  const totalAmount = amount + taxAmount
  
  return {
    baseAmount: amount,
    taxAmount,
    totalAmount,
    taxRate: taxRate * 100 // Convert to percentage
  }
}

/**
 * Get currency configuration
 * @returns {object} Currency configuration
 */
export const getCurrencyConfig = () => {
  return { ...INR_CONFIG }
}

export default {
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
  formatINR,
  formatINRInWords,
  parseINR,
  validateINRAmount,
  convertToINR,
  getConsultationFee,
  calculateTax,
  getCurrencyConfig
}
