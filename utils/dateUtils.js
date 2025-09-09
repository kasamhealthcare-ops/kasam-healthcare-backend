/**
 * Date utility functions for IST timezone and dd/mm/yyyy format
 * Ensures consistency across the entire application
 */

// IST timezone offset (UTC+5:30)
const IST_OFFSET = 5.5 * 60 * 60 * 1000

/**
 * Get current date/time in IST
 * @param {Date} date - Optional date to convert to IST
 * @returns {Date} Date object in IST
 */
export const getISTDate = (date = new Date()) => {
  const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000)
  return new Date(utcTime + IST_OFFSET)
}

/**
 * Get current date/time in IST using proper timezone conversion
 * This is more reliable for server deployments in different timezones
 * @param {Date} date - Optional date to convert to IST
 * @returns {Date} Date object in IST
 */
export const getISTDateReliable = (date = new Date()) => {
  return new Date(date.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}))
}

/**
 * Parse dd/mm/yyyy format to Date object
 * @param {string} dateString - Date in dd/mm/yyyy format
 * @returns {Date|null} Date object or null if invalid
 */
export const parseISTDate = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return null
  
  const [day, month, year] = dateString.split('/')
  if (!day || !month || !year) return null
  
  const dayNum = parseInt(day, 10)
  const monthNum = parseInt(month, 10)
  const yearNum = parseInt(year, 10)
  
  // Validate ranges
  if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900 || yearNum > 2100) {
    return null
  }
  
  // Create date (month is 0-indexed in JavaScript)
  const date = new Date(yearNum, monthNum - 1, dayNum)
  
  // Verify the date is valid (handles invalid dates like 31/02/2023)
  if (date.getDate() !== dayNum || date.getMonth() !== monthNum - 1 || date.getFullYear() !== yearNum) {
    return null
  }
  
  return date
}

/**
 * Format Date object to dd/mm/yyyy string in IST
 * @param {Date} date - Date object to format
 * @returns {string} Date in dd/mm/yyyy format
 */
export const formatDateIST = (date) => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return ''
  }
  
  const istDate = getISTDate(date)
  const day = String(istDate.getDate()).padStart(2, '0')
  const month = String(istDate.getMonth() + 1).padStart(2, '0')
  const year = istDate.getFullYear()
  return `${day}/${month}/${year}`
}

/**
 * Format Date object to dd/mm/yyyy HH:mm string in IST
 * @param {Date} date - Date object to format
 * @returns {string} Date and time in dd/mm/yyyy HH:mm format
 */
export const formatDateTimeIST = (date) => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return ''
  }
  
  const istDate = getISTDate(date)
  const day = String(istDate.getDate()).padStart(2, '0')
  const month = String(istDate.getMonth() + 1).padStart(2, '0')
  const year = istDate.getFullYear()
  const hours = String(istDate.getHours()).padStart(2, '0')
  const minutes = String(istDate.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

/**
 * Get start of day in IST
 * @param {Date} date - Date object
 * @returns {Date} Start of day in IST
 */
export const getStartOfDayIST = (date = new Date()) => {
  const istDate = getISTDate(date)
  istDate.setHours(0, 0, 0, 0)
  return istDate
}

/**
 * Get end of day in IST
 * @param {Date} date - Date object
 * @returns {Date} End of day in IST
 */
export const getEndOfDayIST = (date = new Date()) => {
  const istDate = getISTDate(date)
  istDate.setHours(23, 59, 59, 999)
  return istDate
}

/**
 * Check if a date is today in IST
 * @param {Date} date - Date to check
 * @returns {boolean} True if date is today in IST
 */
export const isToday = (date) => {
  if (!date || !(date instanceof Date)) return false
  
  const today = getStartOfDayIST()
  const checkDate = getStartOfDayIST(date)
  
  return today.getTime() === checkDate.getTime()
}

/**
 * Check if a date is in the past (IST)
 * @param {Date} date - Date to check
 * @returns {boolean} True if date is in the past
 */
export const isPastDate = (date) => {
  if (!date || !(date instanceof Date)) return false
  
  const today = getStartOfDayIST()
  const checkDate = getStartOfDayIST(date)
  
  return checkDate.getTime() < today.getTime()
}

/**
 * Check if a date is in the future (IST)
 * @param {Date} date - Date to check
 * @returns {boolean} True if date is in the future
 */
export const isFutureDate = (date) => {
  if (!date || !(date instanceof Date)) return false
  
  const today = getStartOfDayIST()
  const checkDate = getStartOfDayIST(date)
  
  return checkDate.getTime() > today.getTime()
}

/**
 * Add days to a date in IST
 * @param {Date} date - Base date
 * @param {number} days - Number of days to add
 * @returns {Date} New date with days added
 */
export const addDaysIST = (date, days) => {
  const newDate = getISTDate(date)
  newDate.setDate(newDate.getDate() + days)
  return newDate
}

/**
 * Calculate age from birth date in IST
 * @param {Date} birthDate - Birth date
 * @returns {number} Age in years
 */
export const calculateAge = (birthDate) => {
  if (!birthDate || !(birthDate instanceof Date)) return 0
  
  const today = getISTDate()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return Math.max(0, age)
}

/**
 * Parse flexible date input (supports both ISO and dd/mm/yyyy)
 * @param {string} dateInput - Date string in various formats
 * @returns {Date|null} Parsed date or null if invalid
 */
export const parseFlexibleDate = (dateInput) => {
  if (!dateInput || typeof dateInput !== 'string') return null
  
  // Try dd/mm/yyyy format first
  if (dateInput.includes('/')) {
    return parseISTDate(dateInput)
  }
  
  // Try ISO format
  const isoDate = new Date(dateInput)
  if (!isNaN(isoDate.getTime())) {
    return isoDate
  }
  
  return null
}

/**
 * Get IST timezone info
 * @returns {object} Timezone information
 */
export const getISTInfo = () => {
  return {
    name: 'India Standard Time',
    abbreviation: 'IST',
    offset: '+05:30',
    offsetMinutes: 330
  }
}

export default {
  getISTDate,
  parseISTDate,
  formatDateIST,
  formatDateTimeIST,
  getStartOfDayIST,
  getEndOfDayIST,
  isToday,
  isPastDate,
  isFutureDate,
  addDaysIST,
  calculateAge,
  parseFlexibleDate,
  getISTInfo
}
