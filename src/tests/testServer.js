const app = require('../index');
const jwt = require('jsonwebtoken');

let server;

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const startServer = () => {
  return new Promise((resolve) => {
    server = app.listen(0, () => {  // Use port 0 to get a random available port
      resolve(server);
    });
  });
};

const stopServer = () => {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        resolve();
      });
    } else {
      resolve();
    }
  });
};

const generateTestToken = (userId = '1', email = 'john.doe@example.com') => {
  return jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '1h' });
};

module.exports = {
  startServer,
  stopServer,
  generateTestToken
}; 