const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const verifyToken = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const eventsFilePath = path.join(__dirname, '../data/events.json');

// Helper function to read events file
async function readEventsFile() {
  const data = await fs.readFile(eventsFilePath, 'utf8');
  return JSON.parse(data);
}

// Helper function to write to events file
async function writeEventsFile(data) {
  await fs.writeFile(eventsFilePath, JSON.stringify(data, null, 2));
}

// Get events by makerspace name
router.get('/by-makerspace/:makerSpace', async (req, res) => {
  try {
    const { makerSpace } = req.params;
    const eventsData = await readEventsFile();

    const filteredEvents = eventsData.events.filter(
      (event) =>
        event.makerSpace &&
        event.makerSpace.toLowerCase() === makerSpace.toLowerCase()
    );

    if (filteredEvents.length === 0) {
      return res
        .status(404)
        .json({ message: 'No events found for this makerspace' });
    }

    res.json(filteredEvents);
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

    const eventsData = await readEventsFile();
    const normalizedMakerSpaces = makerSpaces.map((name) => name.toLowerCase());

    const filteredEvents = eventsData.events.filter(
      (event) =>
        event.makerSpace &&
        normalizedMakerSpaces.includes(event.makerSpace.toLowerCase())
    );

    if (filteredEvents.length === 0) {
      return res
        .status(404)
        .json({ message: 'No events found in these makerspaces' });
    }

    res.json(filteredEvents);
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

    const eventsData = await readEventsFile();

    const newEvent = {
      id: uuidv4(),
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
      status: 'inactive', // Default status as specified
    };


    if (ticketLimit <= 0) {
      return res.status(400).json({ message: 'Ticket limit must be greater than zero' });
    }

    eventsData.events.push(newEvent);
    await writeEventsFile(eventsData);

    res.status(201).json(newEvent);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Error creating event' });
  }
});

// Update event
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const eventsData = await readEventsFile();
    const eventIndex = eventsData.events.findIndex((e) => e.id === id);

    if (eventIndex === -1) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Update event data
    eventsData.events[eventIndex] = {
      ...eventsData.events[eventIndex],
      ...updateData,
      id, // Ensure ID remains unchanged
    };

    await writeEventsFile(eventsData);
    res.json(eventsData.events[eventIndex]);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: 'Error updating event' });
  }
});

module.exports = router;
