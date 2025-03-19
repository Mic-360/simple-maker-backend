require('dotenv').config();
const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/users');
const machineRoutes = require('./routes/machines');
const makerspaceRoutes = require('./routes/makerspace');
const eventRoutes = require('./routes/events');
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log('Connected to MongoDB');

    // Create collections if they don't exist
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((col) => col.name);

    if (!collectionNames.includes('user')) {
      await db.createCollection('user');
    }
    if (!collectionNames.includes('mac')) {
      await db.createCollection('mac');
    }
    if (!collectionNames.includes('even')) {
      await db.createCollection('even');
    }
    if (!collectionNames.includes('test')) {
      await db.createCollection('test');
    }
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  });

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

app.get('/collections', async (req, res) => {
  try {
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    const collectionNames = collections.map((collection) => collection.name);

    res.status(200).json({
      message: 'List of collections retrieved successfully',
      collections: collectionNames,
    });
  } catch (error) {
    console.error('Error retrieving collections:', error);
    res.status(500).json({
      message: 'Error retrieving collections',
      error: error.message,
    });
  }
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/makerspace', makerspaceRoutes);
app.use('/api/events', eventRoutes);

// Basic error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Error handling for MongoDB connection errors
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

// Only start the server if this file is run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(
      `Server is running on port ${PORT} in ${process.env.NODE_ENV} mode`
    );
  });
}

module.exports = app;
