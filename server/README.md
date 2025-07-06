# Nexus AI Server

A secure backend server for the Nexus AI application with enhanced password security and validation.

## 🚀 Features

### Enhanced Password Security
- **Password Hashing**: All passwords are securely hashed using bcrypt with 12 salt rounds
- **Password Validation**: Comprehensive client-side and server-side password validation
- **Password Requirements**:
  - Minimum 6 characters, maximum 128 characters
  - At least one lowercase letter
  - At least one uppercase letter
  - At least one number
  - At least one special character (!@#$%^&*(),.?":{}|<>)

### Security Features
- **Rate Limiting**: Protection against brute force attacks on authentication endpoints
- **Input Validation**: Joi-based validation for all user inputs
- **CORS Protection**: Configured CORS with credentials support
- **Error Handling**: Comprehensive error handling and logging
- **Request Logging**: Detailed request logging for security monitoring

### Authentication
- **User Registration**: Secure user registration with validation
- **User Login**: Secure login with password comparison
- **Session Management**: User session tracking with last login timestamps

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SD-app/server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/nexus-ai
   CLIENT_URL=http://localhost:3000
   GOOGLE_API_KEY=your_google_api_key_here
   ```

4. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 🔧 API Endpoints

### Authentication Endpoints

#### POST `/api/users/register`
Register a new user with enhanced password validation.

**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Password Requirements:**
- 6-128 characters
- At least one lowercase letter
- At least one uppercase letter
- At least one number
- At least one special character

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "user_id",
    "username": "john_doe",
    "email": "john@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### POST `/api/users/login`
Login with email and password.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": "user_id",
    "username": "john_doe",
    "email": "john@example.com",
    "lastLogin": "2024-01-01T00:00:00.000Z"
  }
}
```

### AI Endpoints

#### POST `/api/chain`
Chain request with Scira + DeepSeek integration.

#### POST `/api/scira`
Scira AI model request.

#### POST `/api/deepseek`
DeepSeek AI model request.

#### POST `/api/gemini`
Google Gemini AI model request.

### Chat History Endpoints

#### POST `/api/chat/save`
Save chat history for a user.

#### GET `/api/chat/:userId`
Retrieve chat history for a user.

## 🔒 Security Features

### Password Security
- **Hashing**: Passwords are hashed using bcrypt with 12 salt rounds
- **Validation**: Multi-layer validation (client-side + server-side)
- **Requirements**: Strong password requirements enforced

### Rate Limiting
- **Authentication**: 5 attempts per 15 minutes for login/register
- **AI Endpoints**: Configurable rate limits for AI model requests
- **General**: Configurable rate limits for general endpoints

### Input Validation
- **Joi Schemas**: Comprehensive validation for all inputs
- **Sanitization**: Input sanitization and validation
- **Error Handling**: Detailed error messages for validation failures

## 📊 Logging

The server uses Winston for comprehensive logging:

- **Request Logging**: All requests are logged with IP and user agent
- **Error Logging**: Detailed error logging with stack traces
- **Security Logging**: Authentication attempts and failures
- **Performance Logging**: Request processing times

## 🚨 Error Handling

### Validation Errors
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "password",
      "message": "Password must contain at least one special character"
    }
  ]
}
```

### Authentication Errors
```json
{
  "error": "Invalid email or password",
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment mode | development |
| `MONGODB_URI` | MongoDB connection string | - |
| `CLIENT_URL` | Frontend URL for CORS | http://localhost:3000 |
| `GOOGLE_API_KEY` | Google Gemini API key | - |
| `LOG_LEVEL` | Logging level | info |

### Rate Limiting Configuration

```env
# Rate limiting (optional)
RATE_LIMIT_GENERAL_MAX=100
RATE_LIMIT_AI_MAX=30
RATE_LIMIT_CHAIN_MAX=10
RATE_LIMIT_WINDOW_MS=900000
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## 📝 Development

### Project Structure
```
server/
├── config/
│   └── database.js          # Database configuration
├── middleware/
│   ├── rateLimit.js         # Rate limiting middleware
│   └── validation.js        # Input validation schemas
├── models/
│   ├── User.js             # User model
│   └── ChatHistory.js      # Chat history model
├── routes/
│   └── api.js              # API routes
├── services/
│   └── gemini.js           # AI service integrations
├── utils/
│   └── logger.js           # Logging utility
├── index.js                # Main server file
└── package.json
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the error logs

## 🔄 Changelog

### v1.1.0 - Enhanced Password Security
- Added bcrypt password hashing
- Implemented comprehensive password validation
- Added client-side password requirements display
- Enhanced error handling for password validation
- Added rate limiting for authentication endpoints
- Improved security logging

### v1.0.0 - Initial Release
- Basic authentication system
- AI model integrations
- Chat history functionality
- Basic security features 