const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const verifyToken = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const machinesFilePath = path.join(__dirname, '../data/machines.json');

// Helper function to read machines file
async function readMachinesFile() {
  const data = await fs.readFile(machinesFilePath, 'utf8');
  return JSON.parse(data);
}

// Helper function to write to machines file
async function writeMachinesFile(data) {
  await fs.writeFile(machinesFilePath, JSON.stringify(data, null, 2));
}

// Get machines by makerspace name
router.get('/by-makerspace/:makerSpace', async (req, res) => {
  try {
    const { makerSpace } = req.params;
    const machinesData = await readMachinesFile();

    const filteredMachines = machinesData.machines.filter(
      (machine) => machine.makerSpace.toLowerCase() === makerSpace.toLowerCase()
    );

    if (filteredMachines.length === 0) {
      return res
        .status(404)
        .json({ message: 'No machines found in this makerspace' });
    }

    res.json(filteredMachines);
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

    const machinesData = await readMachinesFile();
    const normalizedMakerSpaces = makerSpaces.map((name) => name.toLowerCase());

    const filteredMachines = machinesData.machines.filter((machine) =>
      normalizedMakerSpaces.includes(machine.makerSpace.toLowerCase())
    );

    if (filteredMachines.length === 0) {
      return res
        .status(404)
        .json({ message: 'No machines found in these makerspaces' });
    }

    res.json(filteredMachines);
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

    const machinesData = await readMachinesFile();

    const newMachine = {
      id: uuidv4(),
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
      status: 'inactive', // Default status as specified
      rating: 4.5, // Initial rating
    };

    machinesData.machines.push(newMachine);
    await writeMachinesFile(machinesData);

    res.status(201).json(newMachine);
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

    const machinesData = await readMachinesFile();
    const machineIndex = machinesData.machines.findIndex((m) => m.id === id);

    if (machineIndex === -1) {
      return res.status(404).json({ message: 'Machine not found' });
    }

    // Update machine data
    machinesData.machines[machineIndex] = {
      ...machinesData.machines[machineIndex],
      ...updateData,
      id, // Ensure ID remains unchanged
    };

    await writeMachinesFile(machinesData);
    res.json(machinesData.machines[machineIndex]);
  } catch (error) {
    console.error('Update machine error:', error);
    res.status(500).json({ message: 'Error updating machine' });
  }
});

module.exports = router;
