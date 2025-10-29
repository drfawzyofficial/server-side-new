const nodemailer = require('nodemailer');
const VerificationCode = require('../models/VerificationCode');

// Create email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Verify email configuration
transporter.verify((error, success) => {
  if (error) {
    console.log('Email service error:', error);
  } else {
    console.log('Email service is ready to send messages');
  }
});

/**
 * Send verification code to email
 */
const sendVerificationCode = async (email, code, type = 'email_verification') => {
  try {
    let subject;
    if (type === 'password_reset') {
      subject = 'Password Reset - ElProject';
    } else if (type === 'email_verification') {
      subject = 'Email Verification - ElProject';
    } else {
      subject = 'Your ElProject Verification Code';
    }

    let message;
    if (type === 'password_reset') {
      message = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Password Reset - ElProject</h2>
          <p>Hi there,</p>
          <p>You've requested to reset your password. Please use the verification code below:</p>
          <div style="background-color: #F3F4F6; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #4F46E5; font-size: 32px; letter-spacing: 5px; margin: 0;">${code}</h1>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
          <p>Best regards,<br/>ElProject Team</p>
        </div>
      `;
    } else if (type === 'email_verification') {
      message = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Email Verification - ElProject</h2>
          <p>Hi there,</p>
          <p>Thank you for signing up! Please verify your email address using the code below:</p>
          <div style="background-color: #F3F4F6; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #4F46E5; font-size: 32px; letter-spacing: 5px; margin: 0;">${code}</h1>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't create an account, please ignore this email.</p>
          <p>Best regards,<br/>ElProject Team</p>
        </div>
      `;
    } else {
      message = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">ElProject - Verification Code</h2>
          <p>Hi there,</p>
          <p>Please use the verification code below:</p>
          <div style="background-color: #F3F4F6; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #4F46E5; font-size: 32px; letter-spacing: 5px; margin: 0;">${code}</h1>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
          <p>Best regards,<br/>ElProject Team</p>
        </div>
      `;
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      html: message
    };

    await transporter.sendMail(mailOptions);
    
    // Save verification code to database
    const verificationCode = new VerificationCode({
      email: email.toLowerCase(),
      code,
      type,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });

    await verificationCode.save();
    
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};

/**
 * Verify code from database and delete it after successful verification
 */
const verifyCode = async (email, code, type, deleteAfterVerify = true) => {
  return VerificationCode.verifyCode(email, code, type, deleteAfterVerify);
};

module.exports = {
  sendVerificationCode,
  verifyCode
};

