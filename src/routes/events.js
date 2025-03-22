const express = require('express');
const verifyToken = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

const router = express.Router();

// Get events by makerspace name
router.get('/by-makerspace/:makerSpace', async (req, res) => {
  try {
    const { makerSpace } = req.params;

    const events = await mongoose.connection.db
      .collection('even')
      .find({ makerSpace: new RegExp(makerSpace, 'i') })
      .toArray();

    if (events.length === 0) {
      return res
        .status(404)
        .json({ message: 'No events found for this makerspace' });
    }

    res.json(events);
  } catch (error) {
    console.error('Get events by makerspace error:', error);
    res.status(500).json({ message: 'Error finding events' });
  }
});

// Get events by multiple makerspace names
router.post('/by-makerspaces', async (req, res) => {
  try {
    const { makerSpaces } = req.body;

    if (!Array.isArray(makerSpaces)) {
      return res.status(400).json({ message: 'makerSpaces must be an array' });
    }

    const events = await mongoose.connection.db
      .collection('even')
      .find({
        makerSpace: {
          $in: makerSpaces.map((name) => new RegExp(name, 'i')),
        },
      })
      .toArray();

    if (events.length === 0) {
      return res
        .status(404)
        .json({ message: 'No events found in these makerspaces' });
    }

    res.json(events);
  } catch (error) {
    console.error('Get events by makerspaces error:', error);
    res.status(500).json({ message: 'Error finding events' });
  }
});

// Create new event
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      category,
      name,
      date,
      time,
      ticket,
      ticketLimit,
      imageLinks,
      description,
      agenda,
      terms,
      location,
      experts,
      makerSpace,
      status,
    } = req.body;

    // Validate required fields
    if (
      !name ||
      !category ||
      !date ||
      !time ||
      !ticket ||
      !description ||
      !location
    ) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (ticketLimit <= 0) {
      return res
        .status(400)
        .json({ message: 'Ticket limit must be greater than zero' });
    }

    const newEvent = {
      name,
      category,
      date: {
        start: date.start,
        end: date.end,
      },
      time: {
        start: time.start,
        end: time.end,
      },
      ticket: {
        type: ticket.type,
        price: ticket.price,
      },
      ticketLimit,
      imageLinks: imageLinks || [],
      description,
      agenda,
      terms,
      location,
      experts,
      makerSpace,
      status: status ||'inactive',
    };

    await mongoose.connection.db.collection('even').insertOne(newEvent);
    res.status(200).json(newEvent);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Error creating event' });
  }
});

// Update event
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const result = await mongoose.connection.db
      .collection('even')
      .findOneAndUpdate(
        { id },
        { $set: { ...updateData, id } },
        { returnDocument: 'after' }
      );

    if (!result.value) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(result.value);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: 'Error updating event' });
  }
});

module.exports = router;
