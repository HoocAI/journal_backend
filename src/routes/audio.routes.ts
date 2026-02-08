import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError } from '../utils/errors';
import { adminAudioService } from '../services/admin/admin-audio.service';

const router = Router();

const audioIdParamSchema = z.object({
    id: z.string().uuid('Invalid audio ID format'),
});

// Apply auth middleware to all routes
router.use(requireAuth());

// GET /api/v1/audio - List all available audio for users
router.get(
    '/',
    asyncHandler(async (_req: Request, res: Response) => {
        const audioList = await adminAudioService.getAllAudio();
        res.status(200).json(audioList);
    })
);

// GET /api/v1/audio/:id - Get specific audio details
router.get(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
        const parseResult = audioIdParamSchema.safeParse(req.params);
        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const audio = await adminAudioService.getAudioById(parseResult.data.id);
        res.status(200).json(audio);
    })
);

export { router as audioRouter };
