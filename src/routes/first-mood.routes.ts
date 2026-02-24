import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError } from '../utils/errors';
import { firstMoodService } from '../services/mood/first-mood.service';

const router = Router();

// Mirror the MoodType enum from the main mood routes
const MoodTypeEnum = z.enum([
    'VERY_BAD', 'BAD', 'NEUTRAL', 'GOOD', 'VERY_GOOD',
    'JOYFUL', 'EXCITED', 'PROUD', 'GRATEFUL', 'PEACEFUL', 'CONTENT', 'PLAYFUL', 'HOPEFUL', 'CURIOUS',
    'SAD', 'DEPRESSED', 'LONELY', 'HURT', 'DISAPPOINTED',
    'ANGRY', 'FRUSTRATED', 'ANNOYED', 'ANXIOUS', 'OVERWHELMED', 'STRESSED', 'NERVOUS', 'INSECURE',
    'TIRED', 'BORED', 'NUMB', 'GUILTY', 'ASHAMED'
]);

const createFirstMoodSchema = z.object({
    mood: MoodTypeEnum,
    reason: z.string().optional(),
});

router.use(requireAuth());

// POST /api/v1/first-mood — Record the user's very first mood (once only)
router.post(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
        const parseResult = createFirstMoodSchema.safeParse(req.body);

        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const entry = await firstMoodService.createEntry(req.user!.userId, {
            mood: parseResult.data.mood,
            reason: parseResult.data.reason,
        });

        res.status(201).json(entry);
    })
);

// GET /api/v1/first-mood/me — Get the user's first mood entry
router.get(
    '/me',
    asyncHandler(async (req: Request, res: Response) => {
        const entry = await firstMoodService.getEntry(req.user!.userId);
        res.status(200).json(entry);
    })
);

export { router as firstMoodRouter };
