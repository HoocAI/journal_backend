import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError } from '../utils/errors';
import { userService } from '../services/auth';
import { notificationService } from '../services/notification.service';

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

const fcmTokenSchema = z.object({
    token: z.string().min(1, 'Token is required'),
});

// POST /api/v1/users/fcm-token - Register FCM token
router.post(
    '/fcm-token',
    asyncHandler(async (req: Request, res: Response) => {
        const parseResult = fcmTokenSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const userId = req.user!.userId; // Authenticated user
        await notificationService.updateFcmToken(userId, parseResult.data.token);

        res.status(200).json({ message: 'FCM token updated successfully' });
    })
);

export { router as userRouter };
