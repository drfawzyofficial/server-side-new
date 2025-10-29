const express = require('express');
const request = require('supertest');

// Mount only auth routes on a fresh express app for testing
const authRoutes = require('../routes/auth');
const User = require('../models/User');

// Mock email service so we don't send real emails
const emailService = require('../utils/emailService');
jest.mock('../utils/emailService');
emailService.sendVerificationCode.mockResolvedValue(true);
emailService.verifyCode.mockResolvedValue(true);

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRoutes);
  return app;
}

describe('Password reset flow', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  test('POST /auth/forgot-password should send code', async () => {
    // Arrange: create user
    const user = new User({ fullname: 'Reset User', email: 'reset@example.com', password: 'secret12' });
    await user.save();

    const res = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'reset@example.com' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /auth/verify-reset-code should accept valid code', async () => {
    const res = await request(app)
      .post('/auth/verify-reset-code')
      .send({ email: 'reset@example.com', code: '123456' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /auth/reset-password should reset with valid code', async () => {
    // Given existing user
    const user = new User({ fullname: 'Reset User2', email: 'reset2@example.com', password: 'secret12' });
    await user.save();

    // Mock verifyCode to return true
    emailService.verifyCode.mockResolvedValue(true);

    const res = await request(app)
      .post('/auth/reset-password')
      .send({
        email: 'reset2@example.com',
        code: '123456',
        newPassword: 'newpass123',
        password_conf: 'newpass123',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});


