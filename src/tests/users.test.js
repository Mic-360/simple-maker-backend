const request = require('supertest');
const app = require('../index');
const { backupData, restoreData } = require('./setup');
const { startServer, stopServer } = require('./testServer');

beforeAll(async () => {
  await backupData();
  await startServer();
});

afterAll(async () => {
  await stopServer();
  await restoreData();
});

describe('User Routes', () => {
  let authToken;
  const testUser = {
    email: 'test@example.com',
    password: 'testpass123',
    name: 'Test User',
    number: '+1234567899',
    usertype: 'maker',
    industry: 'Technology',
    purpose: 'Learning',
    role: 'Individual'
  };

  describe('POST /api/users/signup', () => {
    it('should create a new user', async () => {
      const res = await request(app)
        .post('/api/users/signup')
        .send(testUser);

      expect(res.statusCode).toBe(201);
      expect(res.body.user).toHaveProperty('id');
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('should not create user with existing email', async () => {
      const res = await request(app)
        .post('/api/users/signup')
        .send(testUser);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('User already exists');
    });

    it('should not create user with missing required fields', async () => {
      const res = await request(app)
        .post('/api/users/signup')
        .send({
          email: 'test2@example.com',
          password: 'test123'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Missing required fields');
    });
  });

  describe('POST /api/users/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe(testUser.email);
      authToken = res.body.token;
    });

    it('should not login with invalid password', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: testUser.email,
          password: 'wrongpass'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should not login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'test123'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('Invalid credentials');
    });
  });

  describe('GET /api/users/reauth', () => {
    it('should reauthorize with valid token', async () => {
      const res = await request(app)
        .get('/api/users/reauth')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe(testUser.email);
    });

    it('should not reauthorize without token', async () => {
      const res = await request(app)
        .get('/api/users/reauth');

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('Access denied. No token provided.');
    });

    it('should not reauthorize with invalid token', async () => {
      const res = await request(app)
        .get('/api/users/reauth')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Invalid token');
    });
  });

  describe('GET /api/users/by-number/:number', () => {
    it('should find user by phone number', async () => {
      const res = await request(app)
        .get(`/api/users/by-number/${testUser.number}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.email).toBe(testUser.email);
    });

    it('should not find user with non-existent number', async () => {
      const res = await request(app)
        .get('/api/users/by-number/+9999999999');

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('User not found');
    });
  });
}); 