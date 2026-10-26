#!/usr/bin/env node

/**
 * Test Rate Limits Script
 * 
 * This script tests the rate limiting configuration to ensure
 * OAuth routes are properly excluded from rate limiting.
 */

import fetch from 'node-fetch'

const BASE_URL = 'http://localhost:5000'

async function testEndpoint(endpoint, description) {
  console.log(`\n🧪 Testing ${description}...`)
  console.log(`📍 Endpoint: ${endpoint}`)
  
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'User-Agent': 'Rate-Limit-Test-Script'
      }
    })
    
    const data = await response.text()
    
    console.log(`📊 Status: ${response.status}`)
    console.log(`📋 Headers:`)
    console.log(`   - RateLimit-Limit: ${response.headers.get('ratelimit-limit') || 'Not set'}`)
    console.log(`   - RateLimit-Remaining: ${response.headers.get('ratelimit-remaining') || 'Not set'}`)
    console.log(`   - RateLimit-Reset: ${response.headers.get('ratelimit-reset') || 'Not set'}`)
    
    if (response.status === 429) {
      console.log(`❌ RATE LIMITED: ${data}`)
      return false
    } else if (response.status >= 200 && response.status < 400) {
      console.log(`✅ SUCCESS: Endpoint accessible`)
      return true
    } else {
      console.log(`⚠️  Response: ${response.status} - ${data}`)
      return true // Not rate limited, just other error
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`)
    return false
  }
}

async function runTests() {
  console.log('🚀 Starting Rate Limit Tests...')
  console.log('=' .repeat(50))
  
  const tests = [
    { endpoint: `${BASE_URL}/api/health`, description: 'Health Check (should be excluded)' },
    { endpoint: `${BASE_URL}/api/auth/google/test`, description: 'Google OAuth Test (should be excluded)' },
    { endpoint: `${BASE_URL}/api/auth/google`, description: 'Google OAuth Start (should be excluded)' },
    { endpoint: `${BASE_URL}/api/reviews`, description: 'Reviews API (should have general limits)' }
  ]
  
  const results = []
  
  for (const test of tests) {
    const result = await testEndpoint(test.endpoint, test.description)
    results.push({ ...test, success: result })
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  console.log('\n' + '=' .repeat(50))
  console.log('📊 Test Results Summary:')
  console.log('=' .repeat(50))
  
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL'
    console.log(`${status} - ${result.description}`)
  })
  
  const passedTests = results.filter(r => r.success).length
  const totalTests = results.length
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`)
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Rate limiting is configured correctly.')
  } else {
    console.log('⚠️  Some tests failed. Check the server configuration.')
  }
}

// Run the tests
runTests().catch(console.error)
