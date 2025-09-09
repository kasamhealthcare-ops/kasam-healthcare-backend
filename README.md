# 🏥 Kasam Healthcare - Backend API

A comprehensive healthcare management system backend built with Node.js, Express, and MongoDB.

## 🚀 Features

- **User Authentication** - JWT-based auth with OTP email verification
- **Google OAuth** - Social login integration
- **Appointment Management** - Complete booking and scheduling system
- **Admin Panel** - User and appointment management
- **Email Notifications** - OTP and appointment confirmations
- **Role-based Access** - Patient, Doctor, and Admin roles
- **Automated Slot Management** - Dynamic appointment slot generation
- **Security** - Rate limiting, CORS, helmet protection

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT + Passport.js (Google OAuth)
- **Email:** Nodemailer with Gmail SMTP
- **Security:** Helmet, CORS, Rate Limiting
- **Environment:** dotenv

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB Atlas account
- Gmail account with App Password
- Google Cloud Console project (for OAuth)

## ⚙️ Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd kasam-healthcare-backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Start the server:**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## 🔧 Environment Variables

```env
# Server
PORT=5000
NODE_ENV=production

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/kasam_healthcare

# Security
JWT_SECRET=your-64-character-secret
SESSION_SECRET=your-64-character-secret

# Email (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# CORS
FRONTEND_URL=https://your-frontend-domain.com
```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration with OTP
- `POST /api/auth/login` - User login with OTP
- `POST /api/auth/verify-otp` - OTP verification
- `GET /api/auth/google` - Google OAuth login
- `GET /api/auth/google/callback` - OAuth callback

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users` - Get all users (admin only)

### Appointments
- `GET /api/appointments` - Get user appointments
- `POST /api/appointments` - Book new appointment
- `PUT /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Cancel appointment

### Slots
- `GET /api/slots` - Get available slots
- `POST /api/slots` - Create slots (admin only)
- `PUT /api/slots/:id` - Update slot (admin only)

### Reviews
- `GET /api/reviews` - Get Google reviews
- `GET /api/reviews/place-details` - Get place details

## 🏗️ Project Structure

```
kasam-healthcare-backend/
├── config/
│   ├── database.js      # MongoDB connection
│   └── passport.js      # Passport strategies
├── middleware/
│   └── auth.js          # Authentication middleware
├── models/
│   ├── User.js          # User model
│   ├── Appointment.js   # Appointment model
│   └── Slot.js          # Slot model
├── routes/
│   ├── auth.js          # Auth routes
│   ├── users.js         # User routes
│   ├── appointments.js  # Appointment routes
│   ├── slots.js         # Slot routes
│   └── reviews.js       # Review routes
├── services/
│   ├── emailService.js  # Email functionality
│   ├── slotService.js   # Slot management
│   └── googleReviews.js # Google Reviews API
├── utils/
│   └── helpers.js       # Utility functions
├── .env                 # Environment variables
├── server.js            # Main server file
└── package.json         # Dependencies
```

## 🚀 Deployment

### Vercel Deployment

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel --prod
   ```

3. **Set Environment Variables:**
   - Go to Vercel dashboard
   - Add all environment variables from .env

### Railway Deployment

1. **Connect GitHub repository**
2. **Add environment variables**
3. **Deploy automatically**

## 🔒 Security Features

- **JWT Authentication** with secure secrets
- **Rate Limiting** to prevent abuse
- **CORS Protection** with specific origins
- **Helmet** for security headers
- **Password Hashing** with bcrypt
- **Input Validation** and sanitization

## 📧 Email Configuration

The system uses Gmail SMTP for sending emails:

1. **Enable 2FA** on Gmail account
2. **Generate App Password**
3. **Configure EMAIL_USER and EMAIL_PASS**

## 🔗 Google OAuth Setup

1. **Create Google Cloud Project**
2. **Enable OAuth 2.0 API**
3. **Configure consent screen**
4. **Create OAuth credentials**
5. **Add authorized domains**

## 🏥 Healthcare Features

- **Multi-location Support** - Ghodasar, Vastral, Gandhinagar
- **Automated Slot Generation** - Weekly slot creation
- **Appointment Validation** - Prevent double booking
- **Email Notifications** - OTP and confirmations
- **Admin Management** - User and appointment oversight

## 📞 Support

For technical support or questions:
- Check the documentation
- Review error logs
- Contact the development team

## 📄 License

This project is proprietary software developed for Kasam Healthcare.

---

**🏥 Kasam Healthcare Backend - Powering Digital Healthcare Management**
