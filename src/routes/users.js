const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const verifyToken = require('../middleware/auth');
const mongoose = require('mongoose');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-specific-password',
  },
});

// Signup route
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, number, usertype, industry, purpose, role } =
      req.body;

    // Validate required fields
    if (!email || !password || !name || !number) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if user already exists
    const existingUser = await mongoose.connection.db
      .collection('user')
      .findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = {
      id: uuidv4(),
      email,
      password: hashedPassword,
      name,
      number,
      usertype: usertype || [],
      industry: industry || [],
      purpose: purpose || [],
      role: 'Individual', // default role
    };

    await mongoose.connection.db.collection('user').insertOne(newUser);

    // Generate token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user data without password and include token
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email and password are required' });
    }

    const user = await mongoose.connection.db
      .collection('user')
      .findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '24h',
    });

    // Return user data without password and include token
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error during login' });
  }
});

// Get user by contact
router.get('/by-contact', async (req, res) => {
  try {
    const { email, number } = req.query;
    let user;

    if (email) {
      user = await mongoose.connection.db.collection('user').findOne({ email });
    } else if (number) {
      user = await mongoose.connection.db
        .collection('user')
        .findOne({ number });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ email: user.email });
  } catch (error) {
    console.error('Get user by contact error:', error);
    res.status(500).json({ message: 'Error finding user' });
  }
});

// Reauth route
router.get('/reauth', verifyToken, async (req, res) => {
  try {
    const user = await mongoose.connection.db
      .collection('user')
      .findOne({ id: req.user.id });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate new token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '24h',
    });

    // Return user data without password and include new token
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error('Reauth error:', error);
    res.status(500).json({ message: 'Error during reauthorization' });
  }
});

// Forgot Password route
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await mongoose.connection.db
      .collection('user')
      .findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate reset token valid for 1 hour
    const resetToken = jwt.sign(
      { id: user.id, email: user.email, purpose: 'reset' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create reset password link
    const resetLink = `${
      process.env.FRONTEND_URL || 'http://localhost:3000'
    }/reset/password?token=${resetToken}`;

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USER || 'your-email@gmail.com',
      to: email,
      subject: 'Password Reset Request',
      html: `
        <h1>Password Reset Request</h1>
        <p>You requested to reset your password. Click the link below to reset it:</p>
        <a href="${resetLink}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    res.json({ message: 'Password reset link sent to your email' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res
      .status(500)
      .json({ message: 'Error processing forgot password request' });
  }
});

// Reset Password route
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ message: 'Token and new password are required' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if token is for password reset
    if (decoded.purpose !== 'reset') {
      return res.status(400).json({ message: 'Invalid reset token' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    const result = await mongoose.connection.db
      .collection('user')
      .updateOne({ id: decoded.id }, { $set: { password: hashedPassword } });

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError'
    ) {
      return res
        .status(400)
        .json({ message: 'Invalid or expired reset token' });
    }
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
});

module.exports = router;
