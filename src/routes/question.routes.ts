import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError } from '../utils/errors';
import { questionService } from '../services/question';

const router = Router();

// Validation schemas
const submitAnswerSchema = z.object({
    answer: z.string().min(1, 'Answer is required'),
});

const historyQuerySchema = z.object({
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().nonnegative().optional(),
});

// Apply auth middleware to all routes
router.use(requireAuth());

// GET /api/v1/questions/today - Get today's question
router.get(
    '/today',
    asyncHandler(async (req: Request, res: Response) => {
        const dailyQuestion = await questionService.getDailyQuestion(req.user!.userId);
        res.status(200).json(dailyQuestion);
    })
);

// POST /api/v1/questions/today - Submit answer to today's question
router.post(
    '/today',
    asyncHandler(async (req: Request, res: Response) => {
        const parseResult = submitAnswerSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const answer = await questionService.submitAnswer(
            req.user!.userId,
            parseResult.data.answer
        );
        res.status(201).json(answer);
    })
);

// GET /api/v1/questions/history - Get user's answer history
router.get(
    '/history',
    asyncHandler(async (req: Request, res: Response) => {
        const parseResult = historyQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const history = await questionService.getAnswerHistory(
            req.user!.userId,
            parseResult.data
        );
        res.status(200).json(history);
    })
);

export { router as questionRouter };
