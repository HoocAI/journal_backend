
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { uploadFileToS3 } from '../utils/s3';
import { generateFilename } from '../utils/upload';
import { UploadError, ValidationError } from '../utils/errors';

const router = Router();

// Configure multer for memory storage
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

// POST /api/v1/vision-board/upload
router.post(
    '/upload',
    upload.single('file'),
    asyncHandler(async (req: Request, res: Response) => {
        if (!req.file) {
            throw new ValidationError('No file uploaded');
        }

        const file = req.file;
        const filename = generateFilename(req.user!.userId, file.originalname);
        const key = `vision-board/${filename}`; // Organize in a folder

        const url = await uploadFileToS3(file.buffer, key, file.mimetype);

        res.status(200).json({ url });
    })
);

export { router as visionBoardRouter };
