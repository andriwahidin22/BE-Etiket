const request = require('supertest');
const app = require('../server'); // Ensure this path is correct

describe('Authentication API', () => {
  it('should return 400 if username or password is missing', async () => {
    const res = await request(app).post('/api/login').send({});
    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('message', 'Username dan password harus diisi!');
  });

  it('should return 401 if username not found', async () => {
    const res = await request(app).post('/api/login').send({
      username: 'nonexistent',
      password: 'password123'
    });
    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('message', 'Username tidak ditemukan!');
  });

  it('should return 401 if password is incorrect', async () => {
    const res = await request(app).post('/api/login').send({
      username: 'existingUser',
      password: 'wrongPassword'
    });
    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('message', 'Password salah!');
  });

  it('should return 200 and a token if login is successful', async () => {
    const res = await request(app).post('/api/login').send({
      username: 'existingUser',
      password: 'correctPassword'
    });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('message', 'Login berhasil!');
    expect(res.body).toHaveProperty('token');
  });
});
