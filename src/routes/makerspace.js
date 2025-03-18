const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const verifyToken = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

const router = express.Router();
const makerspaceFilePath = path.join(__dirname, '../data/makerspace.json');

// Helper function to read makerspace file
async function readMakerspaceFile() {
  const data = await fs.readFile(makerspaceFilePath, 'utf8');
  return JSON.parse(data);
}

// Helper function to write to makerspace file
async function writeMakerspaceFile(data) {
  await fs.writeFile(makerspaceFilePath, JSON.stringify(data, null, 2));
}

// Check email and create makerspace with JWT onboarding token
router.post('/onboard', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const makerspaceData = await readMakerspaceFile();

    // Check if makerspace with same email already exists
    if (makerspaceData.makerspaces.some((m) => m.email === email)) {
      return res
        .status(400)
        .json({ message: 'Makerspace with this email already exists' });
    }

    // Generate JWT token with email
    const token = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: '24h',
    });

    // Create new makerspace with pending status
    const newMakerspace = {
      token,
      email,
      status: 'pending',
    };

    // Add to makerspaces array
    makerspaceData.makerspaces.push(newMakerspace);
    await writeMakerspaceFile(makerspaceData);

    res.status(201).json({ token });
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({ message: 'Error checking email' });
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
    const tokenEmail = req.user.email;

    const makerspaceData = await readMakerspaceFile();

    // Find pending makerspace with matching email
    const existingMakerspaceIndex = makerspaceData.makerspaces.findIndex(
      (m) => m.email === tokenEmail && m.status === 'pending'
    );

    if (existingMakerspaceIndex === -1) {
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
      id: uuidv4(),
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

    // Replace the existing pending makerspace
    makerspaceData.makerspaces[existingMakerspaceIndex] = newMakerspace;
    await writeMakerspaceFile(makerspaceData);

    res.status(201).json(newMakerspace);
  } catch (error) {
    console.error('Create makerspace error:', error);
    res.status(500).json({ message: 'Error creating makerspace' });
  }
});

// Update makerspace
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const makerspaceData = await readMakerspaceFile();
    const makerspaceIndex = makerspaceData.makerspaces.findIndex(
      (m) => m.id === id
    );

    if (makerspaceIndex === -1) {
      return res.status(404).json({ message: 'Makerspace not found' });
    }

    // Update makerspace data
    makerspaceData.makerspaces[makerspaceIndex] = {
      ...makerspaceData.makerspaces[makerspaceIndex],
      ...updateData,
      id, // Ensure ID remains unchanged
    };

    await writeMakerspaceFile(makerspaceData);
    res.json(makerspaceData.makerspaces[makerspaceIndex]);
  } catch (error) {
    console.error('Update makerspace error:', error);
    res.status(500).json({ message: 'Error updating makerspace' });
  }
});

// Get makerspace by name
router.get('/by-name/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const makerspaceData = await readMakerspaceFile();

    const makerspace = makerspaceData.makerspaces.find(
      (m) => m.name.toLowerCase() === name.toLowerCase()
    );

    if (!makerspace) {
      return res.status(404).json({ message: 'Makerspace not found' });
    }

    res.json(makerspace);
  } catch (error) {
    console.error('Get makerspace by name error:', error);
    res.status(500).json({ message: 'Error retrieving makerspace' });
  }
});

// Get makerspace by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const makerspaceData = await readMakerspaceFile();

    const makerspace = makerspaceData.makerspaces.find((m) => m.id === id);

    if (!makerspace) {
      return res.status(404).json({ message: 'Makerspace not found' });
    }

    res.json(makerspace);
  } catch (error) {
    console.error('Get makerspace by ID error:', error);
    res.status(500).json({ message: 'Error retrieving makerspace' });
  }
});

// Get makerspaces by city
router.get('/by-city/:city', async (req, res) => {
  try {
    const { city } = req.params;
    const makerspaceData = await readMakerspaceFile();

    const makerspaces = makerspaceData.makerspaces
      .filter((m) => m.city.toLowerCase() === city.toLowerCase())
      .map((m) => m.name);

    if (makerspaces.length === 0) {
      return res
        .status(404)
        .json({ message: 'No makerspaces found in this city' });
    }

    res.json(makerspaces);
  } catch (error) {
    console.error('Get makerspaces by city error:', error);
    res.status(500).json({ message: 'Error retrieving makerspaces' });
  }
});

module.exports = router;
