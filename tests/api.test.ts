import request from 'supertest';
import app from '../src/app'; // Importing app from src/app.ts

describe('API Health Check', () => {
    it('should return 200 OK', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('status', 'ok');
    });
});

describe('Authentication API', () => {
    // This is a basic test example. Real tests should use a test database or mock the service.
    it('should fail to login with invalid credentials', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: 'nonexistent@example.com',
            });

        // precise status depends on implementation (401 or 404 or 400)
        expect([400, 401, 404]).toContain(res.status);
    });
});
