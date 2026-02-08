import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError } from '../utils/errors';
import { userService } from '../services/auth';

const router = Router();

const updateProfileSchema = z.object({
    name: z.string().optional(),
    age: z.number().optional(),
    language: z.string().optional(),
    timezone: z.string().optional(),
    focus: z.array(z.string()).optional(),
    onboardingCompleted: z.boolean().optional(),
    goalsSet: z.boolean().optional(),
});

router.use(requireAuth());

// GET /api/v1/users/profile - Get profile
router.get(
    '/profile',
    asyncHandler(async (req: Request, res: Response) => {
        const user = await userService.getProfile(req.user!.userId);
        res.status(200).json(user);
    })
);

// PATCH /api/v1/users/profile - Update profile
router.patch(
    '/profile',
    asyncHandler(async (req: Request, res: Response) => {
        const parseResult = updateProfileSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const user = await userService.updateProfile(req.user!.userId, parseResult.data);
        res.status(200).json(user);
    })
);

export { router as userRouter };
