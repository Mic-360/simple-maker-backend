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

describe('Makerspace Routes', () => {
  let authToken;

  beforeAll(async () => {
    authToken = generateTestToken();
  });

  describe('GET /api/makerspace/by-name/:name', () => {
    it('should get makerspace by name', async () => {
      const res = await request(app)
        .get('/api/makerspace/by-name/TechHub Makerspace');

      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('TechHub Makerspace');
      expect(res.body).toHaveProperty('mentors');
      expect(res.body).toHaveProperty('timing');
    });

    it('should return 404 for non-existent makerspace name', async () => {
      const res = await request(app)
        .get('/api/makerspace/by-name/NonExistentMakerspace');

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('Makerspace not found');
    });
  });

  describe('GET /api/makerspace/:id', () => {
    it('should get makerspace by ID', async () => {
      const res = await request(app)
        .get('/api/makerspace/1');

      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe('1');
      expect(res.body).toHaveProperty('mentors');
      expect(res.body).toHaveProperty('timing');
    });

    it('should return 404 for non-existent makerspace ID', async () => {
      const res = await request(app)
        .get('/api/makerspace/999');

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('Makerspace not found');
    });
  });

  describe('PUT /api/makerspace/:id', () => {
    it('should update makerspace with valid token', async () => {
      const updateData = {
        description: 'Updated description',
        email: 'newemail@techhub.com',
        status: 'inactive'
      };

      const res = await request(app)
        .put('/api/makerspace/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.description).toBe(updateData.description);
      expect(res.body.email).toBe(updateData.email);
      expect(res.body.status).toBe(updateData.status);
    });

    it('should not update makerspace without token', async () => {
      const res = await request(app)
        .put('/api/makerspace/1')
        .send({ description: 'Test Update' });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('Access denied. No token provided.');
    });

    it('should not update non-existent makerspace', async () => {
      const res = await request(app)
        .put('/api/makerspace/999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'Test Update' });

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('Makerspace not found');
    });

    it('should update complex fields like mentors and timing', async () => {
      const updateData = {
        mentors: [
          {
            name: 'New Mentor',
            designation: 'AI Expert',
            linkedin: 'https://linkedin.com/in/newmentor',
            image: 'https://example.com/images/newmentor.jpg'
          }
        ],
        timing: {
          monday: '8:00 AM - 10:00 PM'
        }
      };

      const res = await request(app)
        .put('/api/makerspace/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.mentors).toEqual(updateData.mentors);
      expect(res.body.timing.monday).toBe(updateData.timing.monday);
    });
  });
}); 