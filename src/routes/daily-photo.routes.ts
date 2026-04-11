import { Router, Request, Response } from 'express';
import { dailyPhotoService } from '../services/daily-photo';
import { requireAuth } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { journalPhotoUpload, generateFilename } from '../utils/upload';
import { uploadFileToS3, getSignedUrl } from '../utils/s3';
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
        const folder = process.env.AWS_UPLOAD_FOLDER || 'manifest';
        const s3Key = `${folder}/daily-photo/${userId}/${filename}`;
        
        await uploadFileToS3(file.buffer, s3Key, file.mimetype);

        const dailyPhoto = await dailyPhotoService.uploadPhoto(userId, {
            url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`,
            s3Key,
        });

        const signedUrl = await getSignedUrl(s3Key);
        res.status(201).json({ ...dailyPhoto, url: signedUrl });
    })
);

// GET /api/v1/daily-photo/today - Get today's photo
router.get(
    '/today',
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.userId;
        const photo = await dailyPhotoService.getTodayPhoto(userId);
        
        if (photo && photo.s3Key) {
            const signedUrl = await getSignedUrl(photo.s3Key);
            res.status(200).json({ ...photo, url: signedUrl });
        } else {
            res.status(200).json(photo);
        }
    })
);

// GET /api/v1/daily-photo/history - Get all photos of the day
router.get(
    '/history',
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.userId;
        const history = await dailyPhotoService.getHistory(userId);
        
        const historyWithSignedUrls = await Promise.all(
            history.map(async (photo) => ({
                ...photo,
                url: photo.s3Key ? await getSignedUrl(photo.s3Key) : photo.url,
            }))
        );
        
        res.status(200).json(historyWithSignedUrls);
    })
);

export { router as dailyPhotoRouter };
