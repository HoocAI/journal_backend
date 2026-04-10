import { Router, Request, Response } from 'express';
import { dailyPhotoService } from '../services/daily-photo';
import { requireAuth } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { journalPhotoUpload, generateFilename } from '../utils/upload';
import { uploadFileToS3 } from '../utils/s3';
import { ValidationError } from '../utils/errors';

const router = Router();

router.use(requireAuth());

// POST /api/v1/daily-photo - Upload today's photo
router.post(
    '/',
    journalPhotoUpload.single('photo'),
    asyncHandler(async (req: Request, res: Response) => {
        if (!req.file) {
            throw new ValidationError('Photo is required');
        }

        const userId = req.user!.userId;
        const file = req.file;
        const filename = generateFilename(userId, file.originalname);
        const s3Key = `daily-photo/${userId}/${filename}`;
        
        const url = await uploadFileToS3(file.buffer, s3Key, file.mimetype);

        const dailyPhoto = await dailyPhotoService.uploadPhoto(userId, {
            url,
            s3Key,
        });

        res.status(201).json(dailyPhoto);
    })
);

// GET /api/v1/daily-photo/today - Get today's photo
router.get(
    '/today',
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.userId;
        const photo = await dailyPhotoService.getTodayPhoto(userId);
        res.status(200).json(photo);
    })
);

// GET /api/v1/daily-photo/history - Get all photos of the day
router.get(
    '/history',
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.userId;
        const history = await dailyPhotoService.getHistory(userId);
        res.status(200).json(history);
    })
);

export { router as dailyPhotoRouter };
