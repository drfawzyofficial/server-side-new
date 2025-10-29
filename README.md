# ElProject Server-Side API

A production-ready Node.js/Express.js REST API with real-time capabilities powered by Socket.IO, featuring JWT authentication, messaging, friend system, and optimized media uploads.

## 🚀 Features

- **JWT-Based Authentication** - Secure user registration, login, and profile management with email/phone support
- **Email Verification** - Email verification system with time-limited codes
- **Password Reset** - Secure password reset flow with verification codes
- **Real-Time Chat** - Live messaging with Socket.IO (general chat and private messaging)
- **Friend System** - Send, accept, reject friend requests and manage friendships
- **Audio & Avatar Uploads** - Optimized media handling with automatic compression
- **User Management** - Complete user account operations
- **MongoDB Integration** - Robust database connection with retry logic and health checks
- **Security Hardened** - Rate limiting, NoSQL injection prevention, HPP protection, secure headers
- **Performance Optimized** - Gzip compression, connection pooling, response time tracking
- **Error Handling** - Comprehensive error handling with detailed logging

## 📁 Project Structure

```
server-side/
├── app.js                          # Main application entry point
├── package.json                    # Dependencies and scripts
├── .env                            # Environment variables (not in git)
├── .gitignore                      # Git ignore configuration
├── config/
│   ├── app.config.js              # Centralized app configuration
│   ├── database.js                # MongoDB connection with retry logic
│   ├── avatarStorage.js           # Avatar upload with Sharp compression
│   └── audioStorage.js            # Audio upload with FFmpeg compression
├── controllers/
│   ├── authController.js          # Authentication & user management
│   ├── friendController.js        # Friend request operations
│   └── privateMessageController.js # Private messaging logic
├── middleware/
│   └── auth.js                    # JWT authentication middleware
├── models/
│   ├── User.js                    # User schema with methods
│   ├── Message.js                 # General chat message schema
│   ├── PrivateMessage.js          # Private message schema
│   ├── Conversation.js            # Conversation schema
│   ├── FriendRequest.js           # Friend request schema
│   └── VerificationCode.js        # Email verification code schema
├── routes/
│   ├── auth.js                    # Auth & user management routes
│   ├── chat.js                    # General chat routes
│   ├── audio.js                   # Audio upload routes
│   ├── friends.js                 # Friend request routes
│   └── privateMessages.js         # Private messaging routes
├── socket/
│   ├── auth.js                    # Socket.IO authentication
│   └── handlers.js                # Socket event handlers
├── utils/
│   ├── authUtils.js               # JWT utility functions
│   ├── emailService.js            # Email sending & verification
│   └── validateEnv.js             # Environment validation
└── uploads/
    ├── audio/                     # Compressed audio files (.webm)
    ├── avatars/                   # Compressed avatar images (.webp)
    └── tmp/                       # Temporary upload directory
```

## 🛠️ Technologies

### Core
- **Express.js** - Web application framework
- **Socket.IO** - Real-time bidirectional communication
- **MongoDB & Mongoose** - Database and ODM
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing

### Security
- **Helmet** - Security headers
- **express-rate-limit** - Rate limiting
- **express-mongo-sanitize** - NoSQL injection prevention
- **hpp** - HTTP Parameter Pollution protection
- **cookie-parser** - Secure cookie handling

### Performance
- **compression** - Gzip compression
- **Sharp** - Image optimization (avatars → WebP)
- **FFmpeg** - Audio compression (audio → WebM/Opus)
- **morgan** - HTTP request logging
- **response-time** - Performance monitoring

### Utilities
- **Multer** - File upload handling
- **Nodemailer** - Email sending service
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or cloud instance)

## ⚙️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/drfawzyofficial/server-side-new.git
   cd server-side
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**

   Create a `.env` file in the root directory with the following variables:
   ```env
   # Server Configuration
   PORT=3000
   HOST=localhost
   NODE_ENV=development

   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/elproject_db

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   JWT_EXPIRES_IN=7d

   # Email Configuration (for verification codes)
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password

   # Security
   COOKIE_SECRET=your-cookie-secret-key
   ```

   **Important:** For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833) instead of your regular password.

4. **Start the server**
   ```bash
   npm start
   # or for development with auto-restart:
   npm run dev
   ```

## 📡 API Endpoints

### Authentication & User Management (`/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/signup` | Register new user (email + phone) | No |
| POST | `/auth/login` | Login with email/phone + password | No |
| POST | `/auth/logout` | Logout user | Yes |
| GET | `/auth/me` | Get current user profile | Yes |
| PUT | `/auth/profile` | Update user profile | Yes |
| PUT | `/auth/change-password` | Change password | Yes |
| POST | `/auth/avatar` | Upload/update avatar | Yes |
| DELETE | `/auth/account` | Delete user account | Yes |
| GET | `/auth/users` | Get all users (except self) | Yes |

### Email Verification (`/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/send-email-verification` | Send verification code | Yes |
| POST | `/auth/verify-email` | Verify email with code | Yes |

### Password Reset (`/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/forgot-password` | Request password reset | No |
| POST | `/auth/verify-reset-code` | Verify reset code | No |
| POST | `/auth/reset-password` | Reset password with code | No |

### General Chat (`/api`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/messages` | Get all general chat messages | Yes |
| POST | `/api/messages` | Send a text message to general chat | Yes |
| DELETE | `/api/messages/:id` | Delete a message | Yes |
| GET | `/api/users/online` | Get online users | Yes |

### Friend Management (`/friends`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/friends/request` | Send friend request | Yes |
| GET | `/friends/requests` | Get pending friend requests | Yes |
| PUT | `/friends/accept/:id` | Accept friend request | Yes |
| PUT | `/friends/reject/:id` | Reject friend request | Yes |
| GET | `/friends` | Get all friends | Yes |
| DELETE | `/friends/:id` | Remove friend | Yes |

### Private Messaging (`/private-messages`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/private-messages/conversations` | Get all conversations | Yes |
| GET | `/private-messages/:conversationId` | Get messages in conversation | Yes |
| POST | `/private-messages` | Send private message | Yes |
| PUT | `/private-messages/:messageId/read` | Mark message as read | Yes |

### Audio Upload (`/`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/upload-audio` | Upload audio (auto-compressed to WebM) | Yes |
| GET | `/uploads/audio/:filename` | Stream/download audio file | Yes |

### Avatar Files (`/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/auth/uploads/avatars/:filename` | Get avatar image (WebP) | Yes |

### Health Check

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Server & database health status | No |

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Example: User Registration

```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "fullname": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "password": "password123",
    "password_conf": "password123"
  }'
```

### Example: Login (Email or Phone)

```bash
# Login with email
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrPhone": "john@example.com",
    "password": "password123"
  }'

# Login with phone
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrPhone": "+1234567890",
    "password": "password123"
  }'
```

## 💬 Real-Time Chat (Socket.IO)

The server implements Socket.IO for real-time messaging with two types: general chat and private messaging.

### Connection

```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### General Chat

```javascript
// Send message to general chat
socket.emit('sendMessage', {
  content: 'Hello, everyone!'
});

// Receive general chat messages
socket.on('receiveMessage', (message) => {
  console.log('New message:', message);
  // message: { id, sender, senderName, content, messageType, timestamp }
});
```

### Private Messaging

```javascript
// Send private message
socket.emit('sendPrivateMessage', {
  receiverId: 'user-id',
  content: 'Hello, friend!'
});

// Receive private messages
socket.on('receivePrivateMessage', (message) => {
  console.log('Private message:', message);
  // message: { id, conversation, sender, senderName, receiver, content, timestamp }
});
```

## 🎤 Audio & Avatar Uploads

### Audio Upload (Auto-compressed to WebM/Opus)

```bash
curl -X POST http://localhost:3000/upload-audio \
  -H "Authorization: Bearer <your-token>" \
  -F "audio=@audio-file.mp3" \
  -F "duration=5.5"
```

**Note:** Audio files are automatically compressed to WebM format with Opus codec (64 kbps, mono) using FFmpeg.

### Avatar Upload (Auto-compressed to WebP)

```bash
curl -X POST http://localhost:3000/auth/avatar \
  -H "Authorization: Bearer <your-token>" \
  -F "avatar=@profile-pic.jpg"
```

**Note:** Avatar images are automatically compressed to WebP format (max 512×512px, 80% quality) using Sharp.

## 📊 Database Models

### User Schema
- `fullname` (String, required, min 2 chars)
- `email` (String, required, unique, lowercase)
- `phone` (String, required, unique)
- `password` (String, required, hashed with bcrypt)
- `avatar` (String, filename)
- `emailVerified` (Boolean, default: false)
- `isActive` (Boolean, default: true)
- `createdAt` (Date)
- `updatedAt` (Date)
- `lastLogin` (Date)

### Message Schema (General Chat)
- `sender` (ObjectId, references User)
- `senderName` (String)
- `content` (String, required for text)
- `messageType` (String: 'text' or 'audio')
- `audioFile` (Object: filename, size, duration, etc.)
- `timestamp` (Date)

### PrivateMessage Schema
- `sender` (ObjectId, references User)
- `conversation` (ObjectId, references Conversation)
- `content` (String, required for text)
- `messageType` (String: 'text' or 'audio')
- `audioFile` (Object)
- `read` (Boolean, default: false)
- `readAt` (Date)
- `timestamp` (Date)

### Conversation Schema
- `participants` ([ObjectId], exactly 2 users)
- `lastMessage` (ObjectId, references PrivateMessage)
- `lastMessageAt` (Date)
- `createdAt` (Date)
- `updatedAt` (Date)

### FriendRequest Schema
- `sender` (ObjectId, references User)
- `receiver` (ObjectId, references User)
- `status` (String: 'pending', 'accepted', 'rejected')
- `createdAt` (Date)
- `updatedAt` (Date)

### VerificationCode Schema
- `email` (String, lowercase)
- `code` (String, 6 digits)
- `type` (String: 'email_verification' or 'password_reset')
- `expiresAt` (Date, TTL 10 minutes)
- `createdAt` (Date)

## 🛡️ Error Handling

The API provides comprehensive error handling with consistent error responses:

```json
{
  "success": false,
  "error": "Error Type",
  "message": "Human-readable error message"
}
```

### Error Types

- **ValidationError** (400) - Invalid input data
- **AuthenticationError** (401) - Invalid or missing token
- **AuthorizationError** (403) - Insufficient permissions
- **NotFoundError** (404) - Resource not found
- **ServerError** (500) - Internal server error

## 🧪 Testing with Postman

Import the provided Postman collection:
```
ElProject_JWT_API.postman_collection.json
```

## 🧪 Automated Testing (Jest)

This project includes Jest tests with Supertest and an in-memory MongoDB.

### Install dev dependencies

Run in `server-side/`:

```
npm install --save-dev jest supertest mongodb-memory-server
```

### Run tests

```
npm test            # run tests once
npm run test:watch  # watch mode
npm run test:coverage  # coverage report
```

Test files are under `server-side/tests/` and use `mongodb-memory-server` so no external DB is required.

## 📝 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | 3000 |
| `HOST` | Server host | No | localhost |
| `NODE_ENV` | Environment mode | No | development |
| `MONGODB_URI` | MongoDB connection string | **Yes** | - |
| `JWT_SECRET` | Secret key for JWT | **Yes** | - |
| `JWT_EXPIRES_IN` | JWT expiration time | No | 7d |
| `EMAIL_USER` | Email service username (Gmail) | Recommended | - |
| `EMAIL_PASSWORD` | Email app password | Recommended | - |
| `COOKIE_SECRET` | Cookie signing secret | Recommended | - |

## 🚨 Important Notes

1. **Never commit `.env` files** - Keep your environment variables secure
2. **Change JWT_SECRET** - Use a strong, unique secret in production
3. **Use Gmail App Password** - Enable 2FA and generate an app password for email service
4. **Enable HTTPS** - Always use HTTPS in production environments
5. **CORS Configuration** - Update CORS settings for production domains
6. **Rate Limiting** - Already implemented (100 req/15min general, 20 req/15min auth)
7. **Media Compression** - Audio and avatars are auto-compressed, saving bandwidth
8. **Database Backup** - Regularly backup your MongoDB database
9. **Monitor Performance** - Use the `/health` endpoint for monitoring

## 📦 Dependencies

### Production - Core
- `express` - Web framework
- `socket.io` - Real-time communication
- `mongoose` - MongoDB ODM
- `jsonwebtoken` - JWT handling
- `bcryptjs` - Password hashing
- `cors` - CORS middleware
- `dotenv` - Environment variables

### Production - Security
- `helmet` - Security headers
- `express-rate-limit` - Rate limiting
- `express-mongo-sanitize` - NoSQL injection prevention
- `hpp` - HTTP Parameter Pollution protection
- `cookie-parser` - Secure cookie handling

### Production - Performance & Media
- `compression` - Gzip compression
- `sharp` - Image optimization
- `fluent-ffmpeg` & `ffmpeg-static` - Audio compression
- `morgan` - HTTP logging
- `response-time` - Performance tracking

### Production - Utilities
- `multer` - File uploads
- `nodemailer` - Email service

### Development
- `nodemon` - Auto-restart server
- `jest` - Testing framework
- `supertest` - API testing
- `mongodb-memory-server` - In-memory MongoDB for tests

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is part of the ElProject application suite.

## 👤 Author

**Abdulrahman Fawzy**
- Email: abdulrahmanfawzy999@gmail.com
- GitHub: [@drfawzyofficial](https://github.com/drfawzyofficial)

## 🙏 Acknowledgments

- Express.js community
- Socket.IO documentation
- MongoDB and Mongoose teams