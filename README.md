# ElProject Server-Side API

A comprehensive Node.js/Express.js REST API with real-time capabilities powered by Socket.IO, featuring JWT authentication, messaging, and audio uploads.

## 🚀 Features

- **JWT-Based Authentication** - Secure user registration, login, and profile management
- **Real-Time Chat** - Live messaging with Socket.IO
- **Audio Messaging** - Upload and share audio messages
- **User Management** - Complete CRUD operations for user accounts
- **MongoDB Integration** - Persistent data storage with Mongoose
- **Error Handling** - Comprehensive error handling middleware
- **File Uploads** - Audio file handling with Multer

## 📁 Project Structure

```
server-side/
├── app.js                      # Main application entry point
├── package.json                # Dependencies and scripts
├── .gitignore                  # Git ignore configuration
├── config/
│   ├── database.js            # MongoDB connection configuration
│   └── audioStorage.js        # Multer configuration for audio uploads
├── controllers/
│   ├── authController.js      # Authentication logic
│   └── userController.js      # User management logic
├── middleware/
│   └── auth.js                # JWT authentication middleware
├── models/
│   ├── User.js                # User Mongoose schema
│   └── Message.js             # Message Mongoose schema
├── routes/
│   ├── auth.js                # Authentication routes
│   ├── users.js               # User management routes
│   ├── chat.js                # Chat and messaging routes
│   └── audio.js               # Audio upload routes
├── utils/
│   └── authUtils.js           # JWT utility functions
└── uploads/
    └── audio/                 # Storage for uploaded audio files
```

## 🛠️ Technologies

- **Express.js** - Web application framework
- **Socket.IO** - Real-time bidirectional communication
- **MongoDB & Mongoose** - Database and ODM
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing
- **Multer** - File upload handling
- **Axios** - HTTP client for external API calls
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
   MONGODB_URI=mongodb://localhost:27017/elproject

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_IN=7d
   ```

4. **Start the server**
   ```bash
   npm start
   # or for development with auto-restart:
   npm run dev
   ```

## 📡 API Endpoints

### Authentication (`/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/signup` | Register a new user | No |
| POST | `/auth/login` | Login and get JWT token | No |
| POST | `/auth/logout` | Logout user | Yes |
| GET | `/auth/me` | Get current user profile | Yes |
| PUT | `/auth/profile` | Update user profile | Yes |

### User Management (`/users`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users` | Get all users | Yes |
| GET | `/users/:id` | Get user by ID | Yes |
| PUT | `/users/:id` | Update user | Yes |
| DELETE | `/users/:id` | Delete user | Yes |

### Chat & Messaging (`/api`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/messages` | Get all messages | Yes |
| POST | `/api/messages` | Send a text message | Yes |
| DELETE | `/api/messages/:id` | Delete a message | Yes |
| GET | `/api/users/online` | Get online users | Yes |

### Audio Upload (`/`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/upload-audio` | Upload audio message | Yes |
| GET | `/uploads/audio/:filename` | Download audio file | No |

### Health Check

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Server health status | No |

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
    "password": "password123"
  }'
```

### Example: Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

## 💬 Real-Time Chat (Socket.IO)

The server implements Socket.IO for real-time messaging. To connect:

```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});

socket.on('receiveMessage', (message) => {
  console.log('New message:', message);
});

socket.emit('sendMessage', {
  content: 'Hello, everyone!'
});
```

## 🎤 Audio Messages

Upload audio files using multipart/form-data:

```bash
curl -X POST http://localhost:3000/upload-audio \
  -H "Authorization: Bearer <your-token>" \
  -F "audio=@audio-file.mp3" \
  -F "duration=5.5"
```

## 📊 Database Models

### User Schema
- `fullname` (String, required)
- `email` (String, required, unique)
- `password` (String, required, hashed)
- `createdAt` (Date)
- `updatedAt` (Date)
- `lastLogin` (Date)
- `isActive` (Boolean)

### Message Schema
- `sender` (ObjectId, references User)
- `senderName` (String)
- `content` (String)
- `messageType` (String: 'text' or 'audio')
- `audioFile` (Object, for audio messages)
- `timestamp` (Date)

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

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `HOST` | Server host | localhost |
| `NODE_ENV` | Environment mode | development |
| `MONGODB_URI` | MongoDB connection string | - |
| `JWT_SECRET` | Secret key for JWT | - |
| `JWT_EXPIRES_IN` | JWT expiration time | 7d |

## 🚨 Important Notes

1. **Never commit `.env` files** - Keep your environment variables secure
2. **Change JWT_SECRET** - Use a strong, unique secret in production
3. **Enable HTTPS** - Always use HTTPS in production environments
4. **Rate Limiting** - Consider implementing rate limiting for production
5. **CORS Configuration** - Update CORS settings for production domains

## 📦 Dependencies

### Production
- `express` - Web framework
- `socket.io` - Real-time communication
- `mongoose` - MongoDB ODM
- `jsonwebtoken` - JWT handling
- `bcryptjs` - Password hashing
- `multer` - File uploads
- `axios` - HTTP client
- `cors` - CORS middleware
- `dotenv` - Environment variables

### Development
- `nodemon` - Auto-restart server
- `webpack` - Module bundling
- `babel` - JavaScript transpiler

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