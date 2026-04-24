import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { authRouter, journalRouter, moodRouter, questionRouter, adminRouter, audioRouter, goalRouter, userRouter, visionBoardRouter, quoteRouter, affirmationRouter, assessmentRouter, dailyPhotoRouter, paymentRouter, adminPaymentRouter } from './routes';
import { AppError } from './utils/errors';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
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
app.use('/api/v1/affirmations', affirmationRouter);
app.use('/api/v1/assessments', assessmentRouter);
app.use('/api/v1/daily-photo', dailyPhotoRouter);
app.use('/api/v1/payments', paymentRouter);
app.use('/api/v1/admin/payments', adminPaymentRouter);

// Global error handler
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const requestId = req.headers['x-request-id'] ?? crypto.randomUUID();

    // Handle JSON parsing errors (from body-parser)
    if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            error: {
                code: 'BAD_REQUEST',
                message: 'Invalid JSON payload received',
            },
            requestId,
            timestamp: new Date().toISOString(),
        });
    }

    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            ...err.toJSON(),
            requestId,
            timestamp: new Date().toISOString(),
        });
        return;
    }

    console.error(`[${requestId}] Unexpected error at ${req.method} ${req.url}:`, err);
    
    // Use error status if available (e.g. from other middlewares)
    const statusCode = err.status || err.statusCode || 500;
    
    return res.status(statusCode).json({
        error: {
            code: statusCode === 400 ? 'BAD_REQUEST' : 'INTERNAL_ERROR',
            message: statusCode === 500 ? 'An unexpected error occurred' : err.message,
        },
        requestId,
        timestamp: new Date().toISOString(),
    });

});


export default app;
