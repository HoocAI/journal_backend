import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { requireAuth } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError, NotFoundError } from '../utils/errors';
import { userService } from '../services/auth';
import { notificationService } from '../services/notification.service';
import { uploadFileToS3, getSignedUrl } from '../utils/s3';
import { generateFilename } from '../utils/upload';

const router = Router();

const updateProfileSchema = z.object({
    name: z.string().optional(),
    age: z.number().optional(),
    language: z.string().optional(),
    timezone: z.string().optional(),
    gender: z.string().optional(),
    focus: z.array(z.string()).optional(),
    onboardingCompleted: z.boolean().optional(),
    goalsSet: z.boolean().optional(),
});
 
// Configure multer for profile image upload (memory storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(null, false);
        }
    },
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
 
// PATCH /api/v1/users/profile/image - Update profile image
router.patch(
    '/profile/image',
    upload.single('file'),
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.userId;
 
        if (!req.file) {
            throw new ValidationError('No image file uploaded');
        }
 
        const file = req.file;
        const filename = generateFilename(userId, file.originalname);
        const s3Key = `manifest/profile/${userId}/${filename}`; // Use manifest/ prefix as it is allowed in IAM policy
 
        // Upload to S3
        const publicUrl = await uploadFileToS3(file.buffer, s3Key, file.mimetype);
 
        // Update user profile with the S3 key
        const user = await userService.updateProfile(userId, {
            photoS3Key: s3Key,
            photoUrl: publicUrl, // This will be overwritten by a signed URL in the service if needed
        });
 
        res.status(200).json({
            message: 'Profile image updated successfully',
            photoUrl: user.photoUrl,
        });
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
