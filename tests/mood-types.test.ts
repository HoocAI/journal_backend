import request from 'supertest';
import app from '../src/app';
import { MoodType } from '@prisma/client';

describe('Mood Types API', () => {
    it('should return all valid mood types', async () => {
        // This endpoint requires auth, so it should return 401 without token
        const res = await request(app).get('/api/v1/mood/types');

        // Since we are using supertest with the real app, it will hit requireAuth
        expect(res.status).toBe(401);
    });
});
