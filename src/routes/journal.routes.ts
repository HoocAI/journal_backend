import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { journalService } from '../services/journal';
import { requireAuth } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError, UploadError } from '../utils/errors';
import { journalUpload } from '../utils/upload';

const router = Router();

const createJournalSchema = z.object({
    content: z.string().min(1, 'Content is required'),
});

router.use(requireAuth());

// POST /api/v1/journal - Create today's entry with optional photo and audio
router.post(
    '/',
    journalUpload.fields([
        { name: 'photo', maxCount: 1 },
        { name: 'audio', maxCount: 1 }
    ]),
    asyncHandler(async (req: Request, res: Response) => {
        const parseResult = createJournalSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const files = req.files as { photo?: Express.Multer.File[], audio?: Express.Multer.File[] } | undefined;

        const photoUrl = files?.photo?.[0]
            ? `/uploads/journal/photo/${files.photo[0].filename}`
            : undefined;
        const audioUrl = files?.audio?.[0]
            ? `/uploads/journal/audio/${files.audio[0].filename}`
            : undefined;

        const entry = await journalService.createEntry(req.user!.userId, {
            content: parseResult.data.content,
            photoUrl,
            audioUrl
        });

        res.status(201).json(entry);
    })
);

// GET /api/v1/journal/date/:date - Get entry for a specific date
router.get(
    '/date/:date',
    asyncHandler(async (req: Request, res: Response) => {
        const dateStr = req.params.date as string;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            throw new ValidationError('Invalid date format');
        }

        const entry = await journalService.getEntryByDate(req.user!.userId, date);
        res.status(200).json(entry);
    })
);

// GET /api/v1/journal/me - Get all entries
router.get(
    '/me',
    asyncHandler(async (req: Request, res: Response) => {
        const entries = await journalService.getAllEntries(req.user!.userId);
        res.status(200).json(entries);
    })
);

// PATCH /api/v1/journal/:id - Update today's entry
router.patch(
    '/:id',
    journalUpload.fields([
        { name: 'photo', maxCount: 1 },
        { name: 'audio', maxCount: 1 }
    ]),
    asyncHandler(async (req: Request, res: Response) => {
        const parseResult = createJournalSchema.partial().safeParse(req.body);
        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const files = req.files as { photo?: Express.Multer.File[], audio?: Express.Multer.File[] } | undefined;

        const photoUrl = files?.photo?.[0]
            ? `/uploads/journal/photo/${files.photo[0].filename}`
            : undefined;
        const audioUrl = files?.audio?.[0]
            ? `/uploads/journal/audio/${files.audio[0].filename}`
            : undefined;

        const entry = await journalService.updateEntry(req.params.id as string, req.user!.userId, {
            ...parseResult.data,
            photoUrl,
            audioUrl
        });

        res.status(200).json(entry);
    })
);

// Multer error handling middleware
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

export { router as journalRouter };
