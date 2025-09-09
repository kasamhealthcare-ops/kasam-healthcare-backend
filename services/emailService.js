import nodemailer from 'nodemailer'
import dotenv from 'dotenv'

dotenv.config()

// Email configuration
const createTransporter = () => {
  // For Gmail (you can change this to other providers)
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // Your Gmail address
        pass: process.env.EMAIL_PASS  // Your Gmail app password
      }
    })
  }

  // For SMTP services (including Gmail SMTP)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  })
}

// Send password reset email
export const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    // Check if email configuration is available
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('Email configuration not found. Skipping email send.')
      console.log(`Password reset token for ${email}: ${resetToken}`)
      return { success: false, message: 'Email configuration not available' }
    }

    const transporter = createTransporter()
    
    const mailOptions = {
      from: {
        name: 'Kasam Healthcare',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: 'Password Reset Request - Kasam Healthcare',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4175FC; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .reset-code { background: #fff; border: 2px solid #4175FC; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
            .code { font-size: 32px; font-weight: bold; color: #4175FC; letter-spacing: 5px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏥 Kasam Healthcare</h1>
              <h2>Password Reset Request</h2>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>We received a request to reset your password for your Kasam Healthcare account.</p>
              
              <div class="reset-code">
                <p><strong>Your Password Reset Code:</strong></p>
                <div class="code">${resetToken}</div>
                <p><small>This code will expire in 15 minutes</small></p>
              </div>
              
              <p>To reset your password:</p>
              <ol>
                <li>Go to the password reset page</li>
                <li>Enter your email address</li>
                <li>Enter the 6-digit code above</li>
                <li>Create your new password</li>
              </ol>
              
              <div class="warning">
                <p><strong>⚠️ Security Notice:</strong></p>
                <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
              </div>
              
              <p>For security reasons, this code will expire in 15 minutes.</p>
              
              <p>Best regards,<br>
              The Kasam Healthcare Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>© 2024 Kasam Healthcare. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Kasam Healthcare - Password Reset Request
        
        Hello,
        
        We received a request to reset your password for your Kasam Healthcare account.
        
        Your Password Reset Code: ${resetToken}
        
        This code will expire in 15 minutes.
        
        To reset your password:
        1. Go to the password reset page
        2. Enter your email address
        3. Enter the 6-digit code: ${resetToken}
        4. Create your new password
        
        If you didn't request this password reset, please ignore this email.
        
        Best regards,
        The Kasam Healthcare Team
      `
    }

    const result = await transporter.sendMail(mailOptions)
    console.log(`Password reset email sent to ${email}`)
    return { success: true, messageId: result.messageId }
    
  } catch (error) {
    console.error('Email sending failed:', error)
    // Fallback: log to console for development
    console.log(`Password reset token for ${email}: ${resetToken}`)
    return { success: false, error: error.message }
  }
}

// Send OTP email for authentication
export const sendOTPEmail = async (email, otp, userName = 'User') => {
  try {
    // Check if email configuration is available
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('Email configuration not found. Skipping email send.')
      console.log(`OTP for ${email}: ${otp}`)
      return { success: false, message: 'Email configuration not available' }
    }

    const transporter = createTransporter()

    const mailOptions = {
      from: {
        name: 'Kasam Healthcare',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: 'Your Login OTP - Kasam Healthcare',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Login OTP - Kasam Healthcare</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { text-align: center; background-color: #2c5aa0; color: white; padding: 20px; border-radius: 10px 10px 0 0; margin: -20px -20px 20px -20px; }
            .otp-code { background-color: #f8f9fa; border: 2px dashed #2c5aa0; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
            .otp-number { font-size: 32px; font-weight: bold; color: #2c5aa0; letter-spacing: 5px; font-family: 'Courier New', monospace; }
            .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
            .btn { display: inline-block; background-color: #2c5aa0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏥 Kasam Healthcare</h1>
              <p>Your Login Verification Code</p>
            </div>
            <div class="content">
              <p>Hello ${userName},</p>

              <p>You requested to log in to your Kasam Healthcare account. Please use the following One-Time Password (OTP) to complete your login:</p>

              <div class="otp-code">
                <p style="margin: 0; font-size: 16px; color: #666;">Your OTP Code:</p>
                <div class="otp-number">${otp}</div>
                <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">This code will expire in 10 minutes</p>
              </div>

              <div class="warning">
                <p><strong>⚠️ Security Notice:</strong></p>
                <p>If you didn't request this login, please ignore this email and consider changing your password.</p>
              </div>

              <p>For security reasons, this code will expire in 10 minutes.</p>

              <p>Best regards,<br>
              The Kasam Healthcare Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>© 2024 Kasam Healthcare. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Kasam Healthcare - Login OTP

        Hello ${userName},

        You requested to log in to your Kasam Healthcare account.

        Your OTP Code: ${otp}

        This code will expire in 10 minutes.

        If you didn't request this login, please ignore this email.

        Best regards,
        The Kasam Healthcare Team
      `
    }

    const result = await transporter.sendMail(mailOptions)
    console.log(`OTP email sent to ${email}`)
    return { success: true, messageId: result.messageId }

  } catch (error) {
    console.error('OTP email sending failed:', error)
    // Fallback: log to console for development
    console.log(`OTP for ${email}: ${otp}`)
    return { success: false, error: error.message }
  }
}

// Test email configuration
export const testEmailConfig = async () => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return { success: false, message: 'Email credentials not configured' }
    }

    const transporter = createTransporter()
    await transporter.verify()
    return { success: true, message: 'Email configuration is valid' }
  } catch (error) {
    return { success: false, message: error.message }
  }
}
