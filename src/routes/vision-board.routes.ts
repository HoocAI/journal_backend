import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { requireAuth } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { uploadFileToS3, getSignedUrl } from '../utils/s3';
import { generateFilename } from '../utils/upload';
import { NotFoundError, ValidationError } from '../utils/errors';
import { visionBoardRepository } from '../repositories/vision-board.repository';

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

const createBoardSchema = z.object({
    name: z.string().min(1).max(100),
});

// POST /api/v1/vision-board/boards — Create a new board
router.post(
    '/boards',
    asyncHandler(async (req: Request, res: Response) => {
        const parseResult = createBoardSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const { name } = parseResult.data;
        const userId = req.user!.userId;

        const nameExists = await visionBoardRepository.boardNameExists(userId, name);
        if (nameExists) {
            throw new ValidationError(`A board named "${name}" already exists.`);
        }

        const board = await visionBoardRepository.createBoard(userId, name);
        res.status(201).json(board);
    })
);

// GET /api/v1/vision-board/boards — List all boards for the user
router.get(
    '/boards',
    asyncHandler(async (req: Request, res: Response) => {
        const boards = await visionBoardRepository.findBoardsByUser(req.user!.userId);
        res.status(200).json(boards);
    })
);

// DELETE /api/v1/vision-board/boards/:boardId — Delete a board (and its images via cascade)
router.delete(
    '/boards/:boardId',
    asyncHandler(async (req: Request, res: Response) => {
        const boardId = req.params['boardId'] as string;
        const userId = req.user!.userId;

        const board = await visionBoardRepository.findBoardByIdAndUser(boardId, userId);
        if (!board) {
            throw new NotFoundError('Board not found');
        }

        await visionBoardRepository.deleteBoard(boardId, userId);
        res.status(204).send();
    })
);

// GET /api/v1/vision-board/boards/:boardId/images — Get all images in a board
router.get(
    '/boards/:boardId/images',
    asyncHandler(async (req: Request, res: Response) => {
        const boardId = req.params['boardId'] as string;
        const userId = req.user!.userId;

        const board = await visionBoardRepository.getBoardWithImages(boardId, userId);
        if (!board) {
            throw new NotFoundError('Board not found');
        }

        // Replace stored URLs with temporary pre-signed URLs
        const imagesWithSignedUrls = await Promise.all(
            (board.images || []).map(async (img: any) => ({
                ...img,
                url: img.s3Key ? await getSignedUrl(img.s3Key) : img.url,
            }))
        );

        res.status(200).json({ ...board, images: imagesWithSignedUrls });
    })
);

// POST /api/v1/vision-board/boards/:boardId/upload — Upload an image to a board
router.post(
    '/boards/:boardId/upload',
    upload.single('file'),
    asyncHandler(async (req: Request, res: Response) => {
        const boardId = req.params['boardId'] as string;
        const userId = req.user!.userId;

        const board = await visionBoardRepository.findBoardByIdAndUser(boardId, userId);
        if (!board) {
            throw new NotFoundError('Board not found');
        }

        if (!req.file) {
            throw new ValidationError('No file uploaded');
        }

        const file = req.file;
        const filename = generateFilename(userId, file.originalname);
        const s3Key = `vision-board/${boardId}/${filename}`;

        const url = await uploadFileToS3(file.buffer, s3Key, file.mimetype);

        const image = await visionBoardRepository.addImage(boardId, url, s3Key);

        // Return the image with a pre-signed URL for immediate viewing
        const signedUrl = await getSignedUrl(s3Key);
        res.status(201).json({ ...image, url: signedUrl });
    })
);

// DELETE /api/v1/vision-board/boards/:boardId/images/:imageId — Remove an image from a board
router.delete(
    '/boards/:boardId/images/:imageId',
    asyncHandler(async (req: Request, res: Response) => {
        const boardId = req.params['boardId'] as string;
        const imageId = req.params['imageId'] as string;
        const userId = req.user!.userId;

        // Verify the board belongs to this user
        const board = await visionBoardRepository.findBoardByIdAndUser(boardId, userId);
        if (!board) {
            throw new NotFoundError('Board not found');
        }

        // Verify the image belongs to this board
        const image = await visionBoardRepository.findImageById(imageId);
        if (!image || image.visionBoardId !== boardId) {
            throw new NotFoundError('Image not found');
        }

        await visionBoardRepository.removeImage(imageId);
        res.status(204).send();
    })
);

export { router as visionBoardRouter };
