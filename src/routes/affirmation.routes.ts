import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { affirmationService } from '../services/admin/affirmation.service';
import { requireAuth } from '../middleware';

const router = Router();

// Apply auth middleware to all routes
router.use(requireAuth());

// GET /api/v1/affirmations/random - Get a random affirmation (optional: ?mood=JOYFUL)
router.get(
    '/random',
    asyncHandler(async (req: Request, res: Response) => {
        const mood = req.query.mood as any;

        if (!mood) {
            res.status(400).json({ error: 'Mood query parameter is required' });
            return;
        }

        const affirmation = await affirmationService.getRandomAffirmation(mood);
        res.status(200).json(affirmation);
    })
);

export { router as affirmationRouter };
