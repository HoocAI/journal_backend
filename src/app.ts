import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { authRouter, journalRouter, moodRouter, questionRouter, adminRouter, audioRouter, goalRouter, userRouter, visionBoardRouter, quoteRouter } from './routes';
import { AppError } from './utils/errors';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check endpoint
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/journal', journalRouter);
app.use('/api/v1/mood', moodRouter);
app.use('/api/v1/questions', questionRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/audio', audioRouter);
app.use('/api/v1/goals', goalRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/vision-board', visionBoardRouter);
app.use('/api/v1/quotes', quoteRouter);

// Global error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    const requestId = req.headers['x-request-id'] ?? crypto.randomUUID();

    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            ...err.toJSON(),
            requestId,
            timestamp: new Date().toISOString(),
        });
        return;
    }

    console.error('Unexpected error:', err);
    res.status(500).json({
        error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
        },
        requestId,
        timestamp: new Date().toISOString(),
    });
});

export default app;
