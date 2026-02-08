import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError } from '../utils/errors';
import { goalService } from '../services/goal';

const router = Router();

const createGoalSchema = z.object({
    type: z.string(),
    content: z.string(),
});

const updateGoalSchema = z.object({
    content: z.string(),
});

router.use(requireAuth());

// POST /api/v1/goals - Create a goal
router.post(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
        const parseResult = createGoalSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const goal = await goalService.createGoal(req.user!.userId, parseResult.data);
        res.status(201).json(goal);
    })
);

// GET /api/v1/goals/me - Get my goals
router.get(
    '/me',
    asyncHandler(async (req: Request, res: Response) => {
        const goals = await goalService.getUserGoals(req.user!.userId);
        res.status(200).json(goals);
    })
);

// PATCH /api/v1/goals/:id - Update a goal
router.patch(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
        const parseResult = updateGoalSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const goal = await goalService.updateGoal(req.params.id as string, req.user!.userId, parseResult.data.content);
        res.status(200).json(goal);
    })
);

// DELETE /api/v1/goals/:id - Delete a goal
router.delete(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
        await goalService.deleteGoal(req.params.id as string, req.user!.userId);
        res.status(204).send();
    })
);

export { router as goalRouter };
