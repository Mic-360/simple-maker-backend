const express = require('express');
const verifyToken = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const router = express.Router();

// Check email and create makerspace with JWT onboarding token
router.post('/onboard', async (req, res) => {
  try {
    const { vendormail } = req.body;

    if (!vendormail) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if makerspace with same email already exists
    const existingMakerspace = await mongoose.connection.db
      .collection('makerspaces')
      .findOne({ vendormail });

    if (existingMakerspace) {
      return res
        .status(400)
        .json({ message: 'Makerspace with this email already exists' });
    }

    // Generate JWT token with email
    const token = jwt.sign({ vendormail }, process.env.JWT_SECRET, {
      expiresIn: '24h',
    });

    // Create new makerspace with pending status
    const newMakerspace = {
      token,
      vendormail,
      status: 'pending',
    };

    await mongoose.connection.db
      .collection('makerspaces')
      .insertOne(newMakerspace);
    res.status(200).json({ token });
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({ message: 'Error checking email' });
  }
});

// Verify makerspace token
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    // Find makerspace with the provided token
    const makerspace = await mongoose.connection.db
      .collection('makerspaces')
      .findOne({ token });

    if (!makerspace) {
      return res.status(404).json({
        message: 'Invalid token or makerspace not found',
        isValid: false,
      });
    }

    res.json({
      message: 'Token verified successfully',
      isValid: true,
      email: makerspace.vendormail,
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ message: 'Error verifying token' });
  }
});

// Create new makerspace
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      type,
      usage,
      name,
      email,
      number,
      inChargeName,
      websiteLink,
      timings,
      city,
      state,
      address,
      zipcode,
      country,
      organizationName,
      organizationEmail,
      imageLinks,
      logoImageLinks,
    } = req.body;

    // Email from the JWT token (added by verifyToken middleware)
    const tokenEmail = req.user.vendormail;

    // Find pending makerspace with matching email
    const existingMakerspace = await mongoose.connection.db
      .collection('makerspaces')
      .findOne({ vendormail: tokenEmail, status: 'pending' });

    if (!existingMakerspace) {
      return res
        .status(400)
        .json({ message: 'No pending makerspace registration found' });
    }

    // Validate required fields
    const requiredFields = [
      'type',
      'usage',
      'name',
      'email',
      'number',
      'inChargeName',
      'timings',
      'city',
      'state',
      'address',
      'zipcode',
      'country',
    ];

    const missingFields = requiredFields.filter((field) => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(', ')}`,
      });
    }

    // Validate arrays
    if (!Array.isArray(usage)) {
      return res.status(400).json({ message: 'Usage must be an array' });
    }

    if (imageLinks && !Array.isArray(imageLinks)) {
      return res.status(400).json({ message: 'ImageLinks must be an array' });
    }

    if (logoImageLinks && !Array.isArray(logoImageLinks)) {
      return res
        .status(400)
        .json({ message: 'LogoImageLinks must be an array' });
    }

    // Validate timings object
    const requiredTimings = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ];
    if (!timings || typeof timings !== 'object') {
      return res
        .status(400)
        .json({ message: 'Timings must be an object with days of the week' });
    }

    const missingTimings = requiredTimings.filter((day) => !timings[day]);
    if (missingTimings.length > 0) {
      return res.status(400).json({
        message: `Missing timings for: ${missingTimings.join(', ')}`,
      });
    }

    // Create new makerspace object
    const newMakerspace = {
      type,
      usage,
      name,
      email,
      number,
      inChargeName,
      websiteLink,
      timings,
      city,
      state,
      address,
      zipcode,
      country,
      organizationName,
      organizationEmail,
      imageLinks: imageLinks || [],
      logoImageLinks: logoImageLinks || [],
      status: 'inactive',
    };

    const result = await mongoose.connection.db
      .collection('makerspaces')
      .updateOne(
        { vendormail: tokenEmail, status: 'pending' },
        {
          $unset: { token: '' },
          $set: { ...newMakerspace },
        }
      );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Makerspace not found' });
    }

    const updatedMakerspace = await mongoose.connection.db
      .collection('makerspaces')
      .findOne({ vendormail: tokenEmail });

    res.status(200).json(updatedMakerspace);
  } catch (error) {
    console.log('Create makerspace error:', error);
    res.status(500).json({ message: 'Error creating makerspace' });
  }
});

// Get makerspace by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const makerspace = await mongoose.connection.db
      .collection('makerspaces')
      .findOne({ _id: id });

    if (!makerspace) {
      return res.status(404).json({ message: 'Makerspace not found' });
    }

    res.json(makerspace);
  } catch (error) {
    console.error('Get makerspace by ID error:', error);
    res.status(500).json({ message: 'Error retrieving makerspace' });
  }
});

// Update makerspace
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const result = await mongoose.connection.db
      .collection('makerspaces')
      .findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(id) },
        { $set: { ...updateData, _id: new mongoose.Types.ObjectId(id) } },
        { returnDocument: 'after' }
      );

    if (!result) {
      return res.status(404).json({ message: 'Makerspace not found' });
    }

    res.json(result);
  } catch (error) {
    console.error('Update makerspace error:', error);
    res.status(500).json({ message: `Error updating makerspace ${error}` });
  }
});

// Get makerspace by name
router.get('/by-name/:name', async (req, res) => {
  try {
    const { name } = req.params;

    const makerspace = await mongoose.connection.db
      .collection('test')
      .findOne({ name: new RegExp(name, 'i') });

    if (!makerspace) {
      return res.status(404).json({ message: 'Makerspace not found' });
    }

    res.json(makerspace);
  } catch (error) {
    console.error('Get makerspace by name error:', error);
    res.status(500).json({ message: 'Error retrieving makerspace' });
  }
});

// Get makerspaces by city
router.get('/by-city/:city', async (req, res) => {
  try {
    const { city } = req.params;

    const makerspaces = await mongoose.connection.db
      .collection('test')
      .find({ city: new RegExp(city, 'i') })
      .project({ name: 1, _id: 0 })
      .toArray();

    if (makerspaces.length === 0) {
      return res
        .status(404)
        .json({ message: 'No makerspaces found in this city' });
    }

    res.json(makerspaces.map((m) => m.name));
  } catch (error) {
    console.error('Get makerspaces by city error:', error);
    res.status(500).json({ message: 'Error retrieving makerspaces' });
  }
});

module.exports = router;
