import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authService, adminAuthService } from '../services/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError, AppError } from '../utils/errors';

const router = Router();

// Validation schemas
const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
});

const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
});

const logoutSchema = z.object({
    sessionId: z.string().uuid('Invalid session ID'),
});

const googleLoginSchema = z.object({
    idToken: z.string().min(1, 'ID Token is required'),
});

const phoneLoginSchema = z.object({
    phone: z.string().min(10, 'Phone number is required'),
    otp: z.string().length(6, 'OTP must be 6 digits'),
});

const signupSchema = z.object({
    email: z.string().email('Invalid email format'),
    phone: z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    termsAccepted: z.preprocess(
        (val) => val === true || val === 'true',
        z.boolean().refine((val) => val === true, {
            message: 'Terms of service must be accepted',
        })
    ),
    privacyAccepted: z.preprocess(
        (val) => val === true || val === 'true',
        z.boolean().refine((val) => val === true, {
            message: 'Privacy policy must be accepted',
        })
    ),
    recordingAccepted: z.preprocess(
        (val) => val === true || val === 'true',
        z.boolean().refine((val) => val === true, {
            message: 'Recording policy must be accepted',
        })
    ),
});

router.post(
    '/signup',
    asyncHandler(async (req: Request, res: Response) => {
        const parseResult = signupSchema.safeParse(req.body);
        console.log(req.body);

        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const { email, phone, password, termsAccepted, privacyAccepted, recordingAccepted } = parseResult.data;
        const tokenPair = await authService.signup({
            email,
            phone,
            password,
            termsAccepted,
            privacyAccepted,
            recordingAccepted
        });

        res.status(201).json({
            accessToken: tokenPair.accessToken,
            refreshToken: tokenPair.refreshToken,
            expiresIn: tokenPair.expiresIn,
            tokenType: 'Bearer',
        });
    })
);

router.post(
    '/login',
    asyncHandler(async (req: Request, res: Response) => {
        const parseResult = loginSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const { email, password } = parseResult.data;
        const tokenPair = await authService.login({ email, password });

        res.status(200).json({
            accessToken: tokenPair.accessToken,
            refreshToken: tokenPair.refreshToken,
            expiresIn: tokenPair.expiresIn,
            tokenType: 'Bearer',
        });
    })
);

router.post(
    '/google',
    asyncHandler(async (req: Request, res: Response) => {
        const parseResult = googleLoginSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const { idToken } = parseResult.data;
        const tokenPair = await authService.googleLogin(idToken);

        res.status(200).json({
            accessToken: tokenPair.accessToken,
            refreshToken: tokenPair.refreshToken,
            expiresIn: tokenPair.expiresIn,
            tokenType: 'Bearer',
        });
    })
);

router.post(
    '/phone',
    asyncHandler(async (req: Request, res: Response) => {
        const parseResult = phoneLoginSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const { phone, otp } = parseResult.data;
        const tokenPair = await authService.phoneLogin(phone, otp);

        res.status(200).json({
            accessToken: tokenPair.accessToken,
            refreshToken: tokenPair.refreshToken,
            expiresIn: tokenPair.expiresIn,
            tokenType: 'Bearer',
        });
    })
);

router.post(
    '/refresh',
    asyncHandler(async (req: Request, res: Response) => {
        const parseResult = refreshTokenSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const { refreshToken } = parseResult.data;
        const tokenPair = await authService.refreshToken(refreshToken);

        res.status(200).json({
            accessToken: tokenPair.accessToken,
            refreshToken: tokenPair.refreshToken,
            expiresIn: tokenPair.expiresIn,
            tokenType: 'Bearer',
        });
    })
);

router.post(
    '/logout',
    asyncHandler(async (req: Request, res: Response) => {
        // Get userId from Authorization header token
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            res.status(200).json({ message: 'Logged out successfully' });
            return;
        }

        const parseResult = logoutSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const { sessionId } = parseResult.data;

        // Extract userId from token (we need to decode it)
        const token = authHeader.substring(7);
        try {
            const { validateAccessToken } = await import('../services/auth/token.utils');
            const payload = validateAccessToken(token);
            await authService.logout(payload.userId, sessionId);
        } catch {
            // Even if token validation fails, return success to prevent info leakage
        }

        res.status(200).json({ message: 'Logged out successfully' });
    })
);

router.post(
    '/admin/login',
    asyncHandler(async (req: Request, res: Response) => {
        const parseResult = loginSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const { email, password } = parseResult.data;
        const tokenPair = await adminAuthService.login({ email, password });

        res.status(200).json({
            accessToken: tokenPair.accessToken,
            refreshToken: tokenPair.refreshToken,
            expiresIn: tokenPair.expiresIn,
            tokenType: 'Bearer',
        });
    })
);

// Error handling middleware for this router
router.use((err: Error, _req: Request, res: Response, _next: Function) => {
    if (err instanceof AppError) {
        res.status(err.statusCode).json(err.toJSON());
        return;
    }

    console.error('Unexpected error:', err);
    res.status(500).json({
        error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
        },
    });
});

export { router as authRouter };
