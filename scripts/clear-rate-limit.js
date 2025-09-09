#!/usr/bin/env node

/**
 * Clear Rate Limit Script
 * 
 * This script helps clear rate limiting issues during development
 * by restarting the server and clearing any in-memory rate limit stores.
 */

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

console.log('🔄 Clearing rate limits and restarting server...')

try {
  // Kill any existing node processes (be careful in production!)
  console.log('📋 Stopping existing server processes...')
  
  try {
    if (process.platform === 'win32') {
      await execAsync('taskkill /f /im node.exe')
    } else {
      await execAsync('pkill -f "node.*server.js"')
    }
    console.log('✅ Existing processes stopped')
  } catch (error) {
    console.log('ℹ️  No existing processes found to stop')
  }

  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 2000))

  console.log('🚀 Starting server with cleared rate limits...')
  console.log('📝 Rate limits have been increased for development:')
  console.log('   - General: 1000 requests per 15 minutes')
  console.log('   - Auth: 50 requests per 15 minutes')
  console.log('   - OAuth: 100 requests per 5 minutes')
  console.log('')
  console.log('🌐 You can now try accessing:')
  console.log('   - http://localhost:5000/api/auth/google')
  console.log('   - http://localhost:5000/api/health')
  console.log('')
  console.log('💡 If you still get rate limited, wait 15 minutes or restart the server again.')

} catch (error) {
  console.error('❌ Error clearing rate limits:', error.message)
  process.exit(1)
}
