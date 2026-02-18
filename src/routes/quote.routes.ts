import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { quoteService } from '../services/admin/quote.service';
import { requireAuth } from '../middleware';

const router = Router();

// Apply auth middleware to all routes
router.use(requireAuth());

// GET /api/v1/quotes/random - Get a random quote (optional: ?mood=JOYFUL)
router.get(
    '/random',
    asyncHandler(async (req: Request, res: Response) => {
        const mood = req.query.mood as any;

        if (mood) {
            const quote = await quoteService.getRandomQuote(mood);
            res.status(200).json(quote);
            return;
        }

        // If no mood specified, we might want to return a random quote from any mood, 
        // but the service currently requires a mood. 
        // For now, let's default to 'JOYFUL' or handle it if the service supports optional mood.
        // Looking at service: getRandomQuote(mood: MoodType) -> required.
        // Let's fallback to search all if no mood? No, service doesn't support random across all.
        // We will return 400 if mood is missing for now, or pick a random mood.
        // Let's picking a random 'NEUTRAL' mood or just return null/error if strictly required.
        // Check service definition again.

        // Actually, looking at the service definition in previous turn:
        // async getRandomQuote(mood: MoodType)

        if (!mood) {
            // If mood is mandatory for the service, we must provide it.
            // Let's pick a default reasonable mood or ask user to provide it.
            // For "this too quote feature", likely context is the user's current mood.
            // Let's return 400 Bad Request if mood is missing.
            res.status(400).json({ error: 'Mood query parameter is required' });
            return;
        }

        const quote = await quoteService.getRandomQuote(mood);
        res.status(200).json(quote);
    })
);

export { router as quoteRouter };
