const request = require('supertest');
const app = require('../index');
const { backupData, restoreData } = require('./setup');
const { startServer, stopServer, generateTestToken } = require('./testServer');

beforeAll(async () => {
  await backupData();
  await startServer();
});

afterAll(async () => {
  await stopServer();
  await restoreData();
});

describe('Event Routes', () => {
  let authToken;

  beforeAll(async () => {
    authToken = generateTestToken();
  });

  describe('GET /api/events/by-location/:location', () => {
    it('should get events by location', async () => {
      const res = await request(app)
        .get('/api/events/by-location/New York');

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBeTruthy();
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].location).toBe('New York');
    });

    it('should return 404 for non-existent location', async () => {
      const res = await request(app)
        .get('/api/events/by-location/NonExistentCity');

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('No events found in this location');
    });
  });

  describe('GET /api/events/by-makerspace/:makerspaceName', () => {
    it('should get events by makerspace name', async () => {
      const res = await request(app)
        .get('/api/events/by-makerspace/TechHub Makerspace');

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBeTruthy();
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].makerspacename).toBe('TechHub Makerspace');
    });

    it('should return 404 for non-existent makerspace', async () => {
      const res = await request(app)
        .get('/api/events/by-makerspace/NonExistentMakerspace');

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('No events found for this makerspace');
    });
  });

  describe('PUT /api/events/:id', () => {
    it('should update event with valid token', async () => {
      const updateData = {
        name: 'Updated Event Name',
        description: 'Updated description',
        price: 150,
        status: 'inactive'
      };

      const res = await request(app)
        .put('/api/events/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe(updateData.name);
      expect(res.body.description).toBe(updateData.description);
      expect(res.body.price).toBe(updateData.price);
      expect(res.body.status).toBe(updateData.status);
    });

    it('should not update event without token', async () => {
      const res = await request(app)
        .put('/api/events/1')
        .send({ name: 'Test Update' });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('Access denied. No token provided.');
    });

    it('should not update non-existent event', async () => {
      const res = await request(app)
        .put('/api/events/999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Update' });

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('Event not found');
    });
  });
}); 