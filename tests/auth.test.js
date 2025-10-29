const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');

// Mount only auth routes on a fresh express app for testing
const authRoutes = require('../routes/auth');
const { generateJWTToken } = require('../utils/authUtils');
const User = require('../models/User');

// Mock email service to avoid sending real emails in tests
jest.mock('../utils/emailService', () => ({
  sendVerificationCode: jest.fn().mockResolvedValue(true),
  verifyCode: jest.fn().mockResolvedValue(true),
}));

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRoutes);
  return app;
}

describe('Auth routes', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  test('POST /auth/signup should create a user and return token', async () => {
    const res = await request(app)
      .post('/auth/signup')
      .send({
        fullname: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        password_conf: 'password123',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('john@example.com');
  });

  test('POST /auth/login should login and return token', async () => {
    // Arrange: create a user
    const user = new User({
      fullname: 'Jane Tester',
      email: 'jane@example.com',
      password: 'secret123',
    });
    await user.save();

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'jane@example.com', password: 'secret123' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('jane@example.com');
  });

  test('GET /auth/me should return current user when authenticated', async () => {
    const user = new User({
      fullname: 'Alice Current',
      email: 'alice@example.com',
      password: 'secret123',
    });
    await user.save();
    const token = generateJWTToken(user._id.toString(), {
      email: user.email,
      role: 'user',
      fullname: user.fullname,
    });

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('alice@example.com');
  });

  test('PUT /auth/change-password should update password when current is valid', async () => {
    const user = new User({
      fullname: 'Bob Changer',
      email: 'bob@example.com',
      password: 'oldpass1',
    });
    await user.save();
    const token = generateJWTToken(user._id.toString(), {
      email: user.email,
      role: 'user',
      fullname: user.fullname,
    });

    const res = await request(app)
      .put('/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'oldpass1', newPassword: 'newpass123' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/Password changed/i);

    // Verify login works with new password
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'bob@example.com', password: 'newpass123' });

    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body.success).toBe(true);
  });

  test('PUT /auth/change-password should fail with wrong current password', async () => {
    const user = new User({
      fullname: 'Eve Wrong',
      email: 'eve@example.com',
      password: 'corrrect1',
    });
    await user.save();
    const token = generateJWTToken(user._id.toString(), {
      email: user.email,
      role: 'user',
      fullname: user.fullname,
    });

    const res = await request(app)
      .put('/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'wrongpass', newPassword: 'newpass123' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});


