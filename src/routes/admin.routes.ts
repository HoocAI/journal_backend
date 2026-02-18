import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { requireAuth, requireAdmin } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError, UploadError } from '../utils/errors';
import { questionService } from '../services/question';
import { userManagementService } from '../services/admin/user-management.service';
import { adminAudioService } from '../services/admin/admin-audio.service';
import { adminAudioUpload, ALLOWED_AUDIO_TYPES } from '../utils/upload';

const router = Router();

// Validation schemas
const createQuestionSetSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid date format',
    }),
    questions: z
        .array(
            z.object({
                text: z.string().min(1, 'Question text is required'),
                order: z.number().int().min(0).max(6),
            })
        )
        .length(7, 'Exactly 7 questions are required'),
});

const userIdParamSchema = z.object({
    userId: z.string().uuid('Invalid user ID format'),
});

const createAudioSchema = z.object({
    title: z.string().min(1, 'Title is required'),
});

// Apply auth and admin middleware to all routes
router.use(requireAuth());
router.use(requireAdmin());

// POST /api/v1/admin/question - Create new question set
router.post(
    '/question',
    asyncHandler(async (req: Request, res: Response) => {
        const parseResult = createQuestionSetSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const questionSet = await questionService.createQuestionSet(parseResult.data);
        res.status(201).json(questionSet);
    })
);

// GET /api/v1/admin/question/sets - List all question sets
router.get(
    '/question/sets',
    asyncHandler(async (_req: Request, res: Response) => {
        const questionSets = await questionService.getQuestionSets();
        res.status(200).json(questionSets);
    })
);

// GET /api/v1/admin/users - Get all users
router.get(
    '/users',
    asyncHandler(async (_req: Request, res: Response) => {
        const users = await userManagementService.getAllUsers();
        res.status(200).json(users);
    })
);

// GET /api/v1/admin/users/:userId/daily - Get user's daily data
router.get(
    '/users/:userId/daily',
    asyncHandler(async (req: Request, res: Response) => {
        const parseResult = userIdParamSchema.safeParse(req.params);
        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const dailyData = await userManagementService.getUserDailyData(parseResult.data.userId);
        res.status(200).json(dailyData);
    })
);

// PATCH /api/v1/admin/users/:userId/disable - Disable a user
router.patch(
    '/users/:userId/disable',
    asyncHandler(async (req: Request, res: Response) => {
        const parseResult = userIdParamSchema.safeParse(req.params);
        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const user = await userManagementService.disableUser(parseResult.data.userId);
        res.status(200).json(user);
    })
);

// PATCH /api/v1/admin/users/:userId/enable - Enable a user
router.patch(
    '/users/:userId/enable',
    asyncHandler(async (req: Request, res: Response) => {
        const parseResult = userIdParamSchema.safeParse(req.params);
        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const user = await userManagementService.enableUser(parseResult.data.userId);
        res.status(200).json(user);
    })
);

// POST /api/v1/admin/audio - Upload new admin audio
router.post(
    '/audio',
    adminAudioUpload.single('audio'),
    asyncHandler(async (req: Request, res: Response) => {
        const parseResult = createAudioSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        // Check if file was uploaded
        if (!req.file) {
            throw UploadError.invalidFileType(ALLOWED_AUDIO_TYPES);
        }

        const audioUrl = `/uploads/admin/audio/${req.file.filename}`;
        const audio = await adminAudioService.createAudio({
            title: parseResult.data.title,
            audioUrl,
        });

        res.status(201).json(audio);
    })
);

// GET /api/v1/admin/audio - List all admin audio (admin only)
router.get(
    '/audio',
    asyncHandler(async (_req: Request, res: Response) => {
        const audioList = await adminAudioService.getAllAudio();
        res.status(200).json(audioList);
    })
);

// Multer error handling middleware for admin routes
function handleMulterError(err: Error, _req: Request, _res: Response, next: NextFunction): void {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            next(UploadError.fileTooLarge(10 * 1024 * 1024)); // 10MB max
            return;
        }
        next(UploadError.uploadFailed(err.message));
        return;
    }
    next(err);
}

router.use(handleMulterError);

// ─── Quotes ───────────────────────────────────────────────────────────────────

const createQuoteSchema = z.object({
    text: z.string().min(1, 'Quote text is required'),
    author: z.string().optional(),
    mood: z.enum([
        'VERY_BAD', 'BAD', 'NEUTRAL', 'GOOD', 'VERY_GOOD',
        'JOYFUL', 'EXCITED', 'PROUD', 'GRATEFUL', 'PEACEFUL', 'CONTENT', 'PLAYFUL', 'HOPEFUL', 'CURIOUS',
        'SAD', 'DEPRESSED', 'LONELY', 'HURT', 'DISAPPOINTED',
        'ANGRY', 'FRUSTRATED', 'ANNOYED', 'ANXIOUS', 'OVERWHELMED', 'STRESSED', 'NERVOUS', 'INSECURE',
        'TIRED', 'BORED', 'NUMB', 'GUILTY', 'ASHAMED'
    ]),
});

const quoteIdSchema = z.object({
    id: z.string().uuid('Invalid quote ID'),
});

import { quoteService } from '../services/admin/quote.service';

// POST /api/v1/admin/quotes - Create a new quote
router.post(
    '/quotes',
    asyncHandler(async (req: Request, res: Response) => {
        const parseResult = createQuoteSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const quote = await quoteService.createQuote(parseResult.data);
        res.status(201).json(quote);
    })
);

// GET /api/v1/admin/quotes - List all quotes (optional: ?mood=JOYFUL)
router.get(
    '/quotes',
    asyncHandler(async (req: Request, res: Response) => {
        const mood = req.query.mood as any; // Type casting for simplicity, service handles logic
        const quotes = await quoteService.getQuotes(mood);
        res.status(200).json(quotes);
    })
);

// DELETE /api/v1/admin/quotes/:id - Delete a quote
router.delete(
    '/quotes/:id',
    asyncHandler(async (req: Request, res: Response) => {
        const parseResult = quoteIdSchema.safeParse(req.params);
        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        await quoteService.deleteQuote(parseResult.data.id);
        res.status(204).send();
    })
);

export { router as adminRouter };
