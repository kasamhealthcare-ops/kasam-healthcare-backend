# 🔐 Password Reset System Guide

## Overview

This guide explains how to set up and use the password reset system for the Kasam Healthcare application. The system supports both email-based and development-mode password resets.

## 🚀 Quick Start (Development Mode)

### For Testing Without Email Setup:
1. Go to `http://localhost:5173/forgot-password`
2. Enter any existing user email (e.g., `patient@example.com`)
3. The reset code will be displayed directly on the page
4. Click "Enter Reset Code" to proceed to reset password page
5. Enter the code and set new password

## 📧 Email Configuration (Production)

### Option 1: Gmail Setup
1. Create a Gmail account or use existing one
2. Enable 2-Factor Authentication
3. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
4. Update your `.env` file:
```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-character-app-password
```

### Option 2: Other SMTP Services
```env
EMAIL_SERVICE=smtp
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
EMAIL_USER=your-email@domain.com
EMAIL_PASS=your-password
```

## 🧪 Testing Scenarios

### Scenario 1: Existing User with Email
```
Email: patient@example.com
Expected: Reset code sent to email OR displayed on page (dev mode)
```

### Scenario 2: Non-existent Email
```
Email: nonexistent@example.com
Expected: Same success message (security feature)
Result: No code generated, no email sent
```

### Scenario 3: Invalid Email Format
```
Email: invalid-email
Expected: Frontend validation error
```

## 🔧 API Endpoints

### Request Password Reset
```
POST /api/auth/forgot-password
Body: { "email": "user@example.com" }
Response: {
  "success": true,
  "message": "Reset code sent...",
  "developmentToken": "123456" // Only in dev mode without email config
}
```

### Reset Password
```
POST /api/auth/reset-password
Body: {
  "email": "user@example.com",
  "resetToken": "123456",
  "newPassword": "newpassword123"
}
```

### Debug Endpoint (Development Only)
```
GET /api/auth/debug/users
Response: List of all users with their reset tokens
```

## 🔒 Security Features

1. **Token Expiry**: Reset codes expire after 15 minutes
2. **One-time Use**: Tokens are cleared after successful reset
3. **No Email Enumeration**: Same response for existing/non-existing emails
4. **Rate Limiting**: Prevents brute force attacks
5. **Secure Storage**: Tokens stored securely in database

## 🛠️ Troubleshooting

### Problem: "Email configuration not available"
**Solution**: Set up EMAIL_USER and EMAIL_PASS in .env file

### Problem: "Invalid or expired reset token"
**Solutions**:
- Check if token has expired (15 minutes)
- Verify email address matches exactly
- Ensure token is entered correctly

### Problem: No email received
**Solutions**:
- Check spam/junk folder
- Verify email configuration
- Check server logs for errors
- Use development mode for testing

### Problem: Gmail authentication failed
**Solutions**:
- Use App Password, not regular password
- Enable 2-Factor Authentication first
- Check EMAIL_USER and EMAIL_PASS values

## 📱 Frontend Routes

- `/forgot-password` - Request reset code
- `/reset-password` - Enter code and new password
- `/reset-password?email=user@example.com&token=123456` - Pre-filled form

## 🔄 Complete Flow

1. **User requests reset** → Enters email on forgot password page
2. **System generates token** → 6-digit code with 15-min expiry
3. **Email sent** → User receives email with code (or sees on page in dev)
4. **User resets password** → Enters code and new password
5. **System validates** → Checks token validity and expiry
6. **Password updated** → Token cleared, user can login with new password

## 🎯 Production Deployment

1. Set up email service (Gmail/SMTP)
2. Configure environment variables
3. Set NODE_ENV=production
4. Test email delivery
5. Monitor logs for issues

## 📞 Support

For issues with password reset:
1. Check server logs
2. Verify email configuration
3. Test with development mode first
4. Use debug endpoint to check user tokens
