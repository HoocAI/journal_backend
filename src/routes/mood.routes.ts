import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError } from '../utils/errors';
import { moodService } from '../services/mood/mood.service';
import { MoodType } from '@prisma/client';

const router = Router();

// Define MoodType enum locally to avoid import issues
const MoodTypeEnum = z.enum([
    'VERY_BAD', 'BAD', 'NEUTRAL', 'GOOD', 'VERY_GOOD',
    'JOYFUL', 'EXCITED', 'PROUD', 'GRATEFUL', 'PEACEFUL', 'CONTENT', 'PLAYFUL', 'HOPEFUL', 'CURIOUS',
    'SAD', 'DEPRESSED', 'LONELY', 'HURT', 'DISAPPOINTED',
    'ANGRY', 'FRUSTRATED', 'ANNOYED', 'ANXIOUS', 'OVERWHELMED', 'STRESSED', 'NERVOUS', 'INSECURE',
    'TIRED', 'BORED', 'NUMB', 'GUILTY', 'ASHAMED'
]);

const createMoodSchema = z.object({
    mood: MoodTypeEnum,
    reason: z.string().optional(),
    whySuchMood: z.string().optional(),
    whyThisMood: z.string().optional(),
});

router.use(requireAuth());

// POST /api/v1/mood - Create today's entry with optional photo and audio
router.post(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
        const parseResult = createMoodSchema.safeParse(req.body);

        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const entry = await moodService.createEntry(req.user!.userId, {
            mood: parseResult.data.mood,
            reason: parseResult.data.reason,
            whySuchMood: parseResult.data.whySuchMood,
            whyThisMood: parseResult.data.whyThisMood,
        });

        res.status(201).json(entry);
    })
);

// GET /api/v1/mood/me - Get all entries
router.get(
    '/me',
    asyncHandler(async (req: Request, res: Response) => {
        const entry = await moodService.getAllEntries(req.user!.userId);
        res.status(200).json(entry);
    })
);

// GET /api/v1/mood/types - Get all valid mood types
router.get(
    '/types',
    asyncHandler(async (_req: Request, res: Response) => {
        const types = Object.values(MoodType);
        res.status(200).json(types);
    })
);

export { router as moodRouter };
