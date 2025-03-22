const express = require('express');
const verifyToken = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

const router = express.Router();

// Get machines by makerspace name
router.get('/by-makerspace/:makerSpace', async (req, res) => {
  try {
    const { makerSpace } = req.params;

    const machines = await mongoose.connection.db.collection('mac')
      .find({ makerSpace: new RegExp(makerSpace, 'i') })
      .toArray();

    if (machines.length === 0) {
      return res.status(404).json({ message: 'No machines found in this makerspace' });
    }

    res.json(machines);
  } catch (error) {
    console.error('Get machines by makerspace error:', error);
    res.status(500).json({ message: 'Error finding machines' });
  }
});

// Get machines by multiple makerspace names
router.post('/by-makerspaces', async (req, res) => {
  try {
    const { makerSpaces } = req.body;

    if (!Array.isArray(makerSpaces)) {
      return res.status(400).json({ message: 'makerSpaces must be an array' });
    }

    const machines = await mongoose.connection.db.collection('mac')
      .find({
        makerSpace: {
          $in: makerSpaces.map(name => new RegExp(name, 'i'))
        }
      })
      .toArray();

    if (machines.length === 0) {
      return res.status(404).json({ message: 'No machines found in these makerspaces' });
    }

    res.json(machines);
  } catch (error) {
    console.error('Get machines by makerspaces error:', error);
    res.status(500).json({ message: 'Error finding machines' });
  }
});

// Create new machine
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      category,
      brand,
      model,
      price,
      time,
      imageLinks,
      description,
      location,
      instruction,
      inCharge,
      makerSpace,
      status,
    } = req.body;

    // Validate required fields
    const requiredFields = [
      'category',
      'brand',
      'model',
      'price',
      'time',
      'description',
      'location',
      'makerSpace',
    ];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(', ')}`,
      });
    }

    const newMachine = {
      category,
      brand,
      model,
      price,
      time,
      imageLinks: imageLinks || [],
      description,
      location,
      instruction: instruction || null,
      inCharge: inCharge || [],
      makerSpace,
      status: status ||'inactive',
      rating: 4.5,
    };

    await mongoose.connection.db.collection('mac').insertOne(newMachine);
    res.status(200).json(newMachine);
  } catch (error) {
    console.error('Create machine error:', error);
    res.status(500).json({ message: 'Error creating machine' });
  }
});

// Update machine
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const result = await mongoose.connection.db.collection('mac')
      .findOneAndUpdate(
        { id },
        { $set: { ...updateData, id } },
        { returnDocument: 'after' }
      );

    if (!result.value) {
      return res.status(404).json({ message: 'Machine not found' });
    }

    res.json(result.value);
  } catch (error) {
    console.error('Update machine error:', error);
    res.status(500).json({ message: 'Error updating machine' });
  }
});

module.exports = router;
