# Express.js Error Handling with Try-Catch

This project demonstrates comprehensive error handling in Express.js using try-catch blocks, custom error classes, and middleware.

## Key Error Handling Concepts

### 1. Try-Catch Blocks
Every route handler is wrapped in try-catch blocks to handle synchronous and asynchronous errors:

```javascript
app.get('/users/:id', async (req, res) => {
  try {
    // Your code here
    const result = await someAsyncOperation();
    res.json(result);
  } catch (error) {
    // Handle the error
    console.error('Error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});
```

### 2. Custom Error Classes
We define custom error classes for different types of errors:

```javascript
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.statusCode = 400;
  }
}

class NotFoundError extends Error {
  constructor(resource) {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

class DatabaseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DatabaseError';
    this.statusCode = 500;
  }
}
```

### 3. Error Type Checking
Use `instanceof` to check error types and respond appropriately:

```javascript
catch (error) {
  if (error instanceof ValidationError) {
    res.status(error.statusCode).json({
      success: false,
      error: 'Validation Error',
      message: error.message,
      field: error.field
    });
  } else if (error instanceof NotFoundError) {
    res.status(error.statusCode).json({
      success: false,
      error: 'Not Found',
      message: error.message
    });
  } else {
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Something went wrong'
    });
  }
}
```

### 4. Global Error Handling Middleware
A global error handler catches any unhandled errors:

```javascript
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    success: false,
    error: error.name || 'Error',
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});
```

### 5. 404 Handler
Handle routes that don't exist:

```javascript
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});
```

## API Endpoints

### Users
- `GET /users` - Get all users
- `POST /users` - Create new user
- `GET /users/:id` - Get user by ID
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

### Posts
- `GET /posts` - Get all posts
- `POST /posts` - Create new post

### Error Testing
- `GET /error` - Test synchronous error handling
- `GET /async-error` - Test asynchronous error handling

## Error Response Format

All error responses follow a consistent format:

```json
{
  "success": false,
  "error": "Error Type",
  "message": "Human-readable error message",
  "field": "fieldName" // Only for validation errors
}
```

## Running the Application

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
# or for development with auto-restart:
npm run dev
```

3. Visit `http://localhost:3000` to see the API documentation

## Testing Error Handling

### Test Validation Errors
```bash
# Invalid user data
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "A", "email": "invalid-email"}'
```

### Test Not Found Errors
```bash
# Non-existent user
curl http://localhost:3000/users/999
```

### Test Database Errors
The application simulates random database errors (10% chance) to demonstrate error handling.

## Best Practices Demonstrated

1. **Always use try-catch** in async route handlers
2. **Create custom error classes** for different error types
3. **Use consistent error response format**
4. **Log errors** for debugging
5. **Handle different error types** appropriately
6. **Provide meaningful error messages** to clients
7. **Use global error handling middleware** as a safety net
8. **Validate input data** before processing
9. **Check for resource existence** before operations
10. **Use appropriate HTTP status codes**

## Error Types Handled

- **ValidationError** (400) - Invalid input data
- **NotFoundError** (404) - Resource not found
- **DatabaseError** (500) - Database operation failures
- **Generic Error** (500) - Unexpected errors

This implementation provides a robust foundation for error handling in Express.js applications.

