import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authService, adminAuthService } from '../services/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError, AppError } from '../utils/errors';
import { requireProvisionalAuth } from '../middleware/auth.middleware';

const router = Router();

// ─── Validation Schemas ───────────────────────────────────────────────────────

const googleLoginSchema = z.object({
    idToken: z.string().min(1, 'ID Token is required'),
});

const verifyPhoneSchema = z.object({
    phone: z.string().min(10, 'Phone number is required'),
    otp: z.string().length(6, 'OTP must be 6 digits'),
});

const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
});

const logoutSchema = z.object({
    sessionId: z.string().uuid('Invalid session ID'),
});

const adminLoginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
});

// ─── Step 1: Google OAuth ─────────────────────────────────────────────────────

/**
 * POST /auth/google
 * Step 1 of 2-step signup.
 * Verifies Google ID token, creates user if new, returns a provisional token.
 * The provisional token must be used to complete Step 2 (phone verification).
 */
router.post(
    '/google',
    asyncHandler(async (req: Request, res: Response) => {
        const parseResult = googleLoginSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const result = await authService.googleLogin(parseResult.data.idToken);

        res.status(200).json(result);
    })
);

// ─── Step 2: Phone OTP Verification ──────────────────────────────────────────

/**
 * POST /auth/verify-phone
 * Step 2 of 2-step signup.
 * Requires Authorization: Bearer <provisionalToken> from Step 1.
 * Verifies OTP, links phone number, and returns a full access + refresh token pair.
 */
router.post(
    '/verify-phone',
    requireProvisionalAuth(),
    asyncHandler(async (req: Request, res: Response) => {
        const parseResult = verifyPhoneSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const userId = req.user!.userId;
        const { phone, otp } = parseResult.data;

        const tokenPair = await authService.verifyPhone(userId, phone, otp);

        res.status(200).json({
            accessToken: tokenPair.accessToken,
            refreshToken: tokenPair.refreshToken,
            expiresIn: tokenPair.expiresIn,
            tokenType: 'Bearer',
            user: tokenPair.user,
        });
    })
);

// ─── Token Management ─────────────────────────────────────────────────────────

/**
 * POST /auth/refresh
 * Get a new access token using a valid refresh token.
 */
router.post(
    '/refresh',
    asyncHandler(async (req: Request, res: Response) => {
        const parseResult = refreshTokenSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const tokenPair = await authService.refreshToken(parseResult.data.refreshToken);

        res.status(200).json({
            accessToken: tokenPair.accessToken,
            refreshToken: tokenPair.refreshToken,
            expiresIn: tokenPair.expiresIn,
            tokenType: 'Bearer',
        });
    })
);

/**
 * POST /auth/logout
 * Invalidate the current session.
 */
router.post(
    '/logout',
    asyncHandler(async (req: Request, res: Response) => {
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
        const token = authHeader.substring(7);

        try {
            const { validateAccessToken } = await import('../services/auth/token.utils');
            const payload = validateAccessToken(token);
            await authService.logout(payload.userId, sessionId);
        } catch {
            // Return success even on token error to prevent info leakage
        }

        res.status(200).json({ message: 'Logged out successfully' });
    })
);

// ─── Admin ────────────────────────────────────────────────────────────────────

/**
 * POST /auth/admin/login
 * Admin login with email and password.
 */
router.post(
    '/admin/login',
    asyncHandler(async (req: Request, res: Response) => {
        const parseResult = adminLoginSchema.safeParse(req.body);
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

// ─── Error Handler ────────────────────────────────────────────────────────────

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
