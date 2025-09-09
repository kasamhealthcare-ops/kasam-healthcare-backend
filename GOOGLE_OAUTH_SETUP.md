# 🔐 Google OAuth Setup Guide

## Overview

This guide explains how to set up Google OAuth authentication for the Kasam Healthcare application. With Google OAuth, users can login using their Google accounts, which automatically validates that they have a valid Gmail account.

## 🚀 Benefits of Google OAuth

✅ **Automatic Gmail Validation** - Only users with valid Google accounts can login  
✅ **No Password Management** - Users don't need to remember another password  
✅ **Enhanced Security** - Google handles authentication and security  
✅ **Quick Registration** - New users can sign up instantly with Google  
✅ **Email Verification** - Google emails are automatically verified  

## 📋 Prerequisites

1. Google Cloud Console account
2. Domain verification (for production)
3. SSL certificate (for production)

## 🛠️ Setup Steps

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google+ API and Google OAuth2 API

### Step 2: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type
3. Fill in required information:
   - **App name**: Kasam Healthcare
   - **User support email**: your-email@gmail.com
   - **Developer contact**: your-email@gmail.com
4. Add scopes:
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
5. Add test users (for development)

### Step 3: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client IDs**
3. Choose **Web application**
4. Configure:
   - **Name**: Kasam Healthcare Web Client
   - **Authorized JavaScript origins**:
     - `http://localhost:5173` (development)
     - `https://yourdomain.com` (production)
   - **Authorized redirect URIs**:
     - `http://localhost:5000/api/auth/google/callback` (development)
     - `https://api.yourdomain.com/api/auth/google/callback` (production)

### Step 4: Configure Environment Variables

Update your `.env` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
FRONTEND_URL=http://localhost:5173
SESSION_SECRET=your-super-secret-session-key

# Other existing variables...
MONGODB_URI=mongodb://localhost:27017/kasam-healthcare
JWT_SECRET=your-jwt-secret
PORT=5000
```

## 🧪 Testing the Integration

### Development Testing

1. **Start Backend Server**:
   ```bash
   cd kasam-healthcare-backend
   npm start
   ```

2. **Start Frontend Server**:
   ```bash
   cd kasam-healthcare-react
   npm run dev
   ```

3. **Test Google Login**:
   - Go to `http://localhost:5173/login`
   - Click "Continue with Google"
   - Sign in with your Google account
   - Should redirect back to dashboard

### Test Scenarios

1. **New User with Google Account**:
   - First-time Google login creates new user account
   - User role defaults to 'patient'
   - Email is automatically verified

2. **Existing User with Same Email**:
   - Links Google account to existing user
   - Preserves existing user data and role

3. **Invalid/Cancelled Authentication**:
   - Redirects back to login with error message
   - User can try again or use regular login

## 🔧 API Endpoints

### Google OAuth Flow

```
GET /api/auth/google
→ Redirects to Google OAuth consent screen

GET /api/auth/google/callback
→ Handles Google OAuth callback
→ Redirects to frontend with token

GET /api/auth/debug/users
→ Development endpoint to view users (dev only)
```

### Frontend Routes

```
/login - Login page with Google OAuth button
/auth/callback - Handles OAuth callback
/dashboard - User dashboard after login
/admin - Admin dashboard (for admin users)
```

## 🔒 Security Features

1. **CSRF Protection** - State parameter validation
2. **Token Validation** - JWT tokens with expiration
3. **Session Management** - Secure session handling
4. **Role-based Access** - Automatic role assignment
5. **Email Verification** - Google emails are pre-verified

## 🚀 Production Deployment

### Domain Configuration

1. **Update OAuth Credentials**:
   - Add production domain to authorized origins
   - Add production callback URL

2. **Environment Variables**:
   ```env
   GOOGLE_CLIENT_ID=your-production-client-id
   GOOGLE_CLIENT_SECRET=your-production-client-secret
   FRONTEND_URL=https://yourdomain.com
   NODE_ENV=production
   ```

3. **SSL Certificate**:
   - Google OAuth requires HTTPS in production
   - Configure SSL for both frontend and backend

### Verification Requirements

For production apps with many users:
1. **Domain Verification** - Verify domain ownership
2. **App Verification** - Submit app for Google review
3. **Privacy Policy** - Required for OAuth consent screen
4. **Terms of Service** - Required for OAuth consent screen

## 🛠️ Troubleshooting

### Common Issues

1. **"redirect_uri_mismatch" Error**:
   - Check authorized redirect URIs in Google Console
   - Ensure exact match including protocol and port

2. **"invalid_client" Error**:
   - Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
   - Check environment variables are loaded

3. **"access_denied" Error**:
   - User cancelled OAuth flow
   - Check OAuth consent screen configuration

4. **Session/Cookie Issues**:
   - Verify SESSION_SECRET is set
   - Check CORS configuration for credentials

### Debug Steps

1. **Check Server Logs**:
   ```bash
   # Backend logs show OAuth flow details
   npm start
   ```

2. **Verify Environment Variables**:
   ```bash
   # Check if variables are loaded
   console.log(process.env.GOOGLE_CLIENT_ID)
   ```

3. **Test OAuth URLs**:
   ```
   # Direct OAuth URL test
   http://localhost:5000/api/auth/google
   ```

## 📞 Support

For issues with Google OAuth setup:
1. Check Google Cloud Console error logs
2. Verify OAuth consent screen status
3. Test with different Google accounts
4. Check browser developer tools for errors

## 🎯 Next Steps

After successful setup:
1. Test with multiple user accounts
2. Configure email notifications (optional)
3. Set up production domain verification
4. Add additional OAuth providers (optional)
5. Implement user role management
