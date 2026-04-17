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

const firebaseLoginSchema = z.object({
    idToken: z.string().min(1, 'Firebase ID Token is required'),
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

// ─── Step 1: Google OAuth (Login or Signup) ───────────────────────────────────

/**
 * POST /auth/google
 * 
 * Scenario A (New or Unverified User):
 *   - Verifies Google ID token.
 *   - Returns a PROVISIONAL token.
 *   - User must proceed to Step 2 (Phone Verification).
 * 
 * Scenario B (Existing Verified User):
 *   - Verifies Google ID token.
 *   - Checks if `isPhoneVerified` is true.
 *   - Returns a FULL ACCESS token (Login complete).
 */
router.post(
    '/google',
    asyncHandler(async (req: Request, res: Response) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [AuthRoute] Incoming Google Login Request. IP: ${req.ip}`);
        
        const parseResult = googleLoginSchema.safeParse(req.body);
        if (!parseResult.success) {
            console.warn(`[${timestamp}] [AuthRoute] Validation failed:`, parseResult.error.flatten().fieldErrors);
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const result = await authService.googleLogin({ idToken: parseResult.data.idToken });
        const resolvedId = 'userId' in result ? result.userId : result.user?.id;
        console.log(`[${timestamp}] [AuthRoute] Success: Issue ${'provisionalToken' in result ? 'Provisional' : 'Full Access'} token for UID: ${resolvedId}`);

        res.status(200).json(result);
    })
);

// ─── Firebase Phone Login ───────────────────────────────────────────────────

/**
 * POST /auth/firebase/phone
 * 
 * Verifies the Firebase ID token (derived from Phone Auth on client).
 * Creates or identifies user, returns full access token pair.
 */
router.post(
    '/firebase/phone',
    asyncHandler(async (req: Request, res: Response) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [AuthRoute] Incoming Firebase Phone Login Request. IP: ${req.ip}`);
        
        const parseResult = firebaseLoginSchema.safeParse(req.body);
        if (!parseResult.success) {
            console.warn(`[${timestamp}] [AuthRoute] Validation failed:`, parseResult.error.flatten().fieldErrors);
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const result = await authService.firebasePhoneLogin(parseResult.data.idToken);
        
        console.log(`[${timestamp}] [AuthRoute] Success: Issue Session for phone user UID: ${result.user?.id}`);

        res.status(200).json(result);
    })
);

/**
 * POST /auth/firebase/verify-phone
 * 
 * Step 2 of Signup flow.
 * Requires Authorization: Bearer <provisionalToken> from Google Step.
 * Verifies Firebase token, links phone, and completes signup.
 */
router.post(
    '/firebase/verify-phone',
    requireProvisionalAuth(),
    asyncHandler(async (req: Request, res: Response) => {
        const timestamp = new Date().toISOString();
        const userId = req.user!.userId;
        console.log(`[${timestamp}] [AuthRoute] Incoming Firebase Phone Verification for UID: ${userId}`);

        const parseResult = firebaseLoginSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const result = await authService.firebasePhoneVerify(userId, parseResult.data.idToken);
        console.log(`[${timestamp}] [AuthRoute] Success: Signup completed for UID: ${userId}`);

        res.status(200).json(result);
    })
);

// ─── Direct Phone Login ───────────────────────────────────────────────────────

/**
 * POST /auth/login/phone/initiate
 * Initiate phone login by requesting an OTP.
 * Assumes user already exists (Login Only).
 */
router.post(
    '/login/phone/initiate',
    asyncHandler(async (req: Request, res: Response) => {
        const schema = z.object({
            phone: z.string().min(10, 'Phone number is required'),
        });

        const parseResult = schema.safeParse(req.body);
        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const result = await authService.requestPhoneLogin(parseResult.data.phone);
        res.status(200).json(result);
    })
);

/**
 * POST /auth/login/phone/verify
 * Verify OTP and login.
 * Returns full access token.
 */
router.post(
    '/login/phone/verify',
    asyncHandler(async (req: Request, res: Response) => {
        const schema = z.object({
            phone: z.string().min(10, 'Phone number is required'),
            otp: z.string().length(6, 'OTP must be 6 digits'),
        });

        const parseResult = schema.safeParse(req.body);
        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const { phone, otp } = parseResult.data;
        const tokenPair = await authService.verifyPhoneLogin(phone, otp);

        res.status(200).json({
            accessToken: tokenPair.accessToken,
            refreshToken: tokenPair.refreshToken,
            expiresIn: tokenPair.expiresIn,
            tokenType: 'Bearer',
            user: tokenPair.user,
        });
    })
);

// ─── Step 2: Phone OTP Verification (Signup Completion) ───────────────────────

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
        const timestamp = new Date().toISOString();
        const userId = req.user!.userId;
        console.log(`[${timestamp}] [AuthRoute] Incoming Phone Verification Request for UID: ${userId}. IP: ${req.ip}`);

        const parseResult = verifyPhoneSchema.safeParse(req.body);
        if (!parseResult.success) {
            console.warn(`[${timestamp}] [AuthRoute] Validation failed:`, parseResult.error.flatten().fieldErrors);
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const { phone, otp } = parseResult.data;
        const tokenPair = await authService.verifyPhone(userId, phone, otp);
        console.log(`[${timestamp}] [AuthRoute] Success: Full Session established for UID: ${userId} (${phone})`);

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

/**
 * POST /auth/fallback
 * Bypass OTP/Google Auth by providing a phone number.
 * ONLY FOR TESTING.
 */
router.post(
    '/fallback',
    asyncHandler(async (req: Request, res: Response) => {
        const schema = z.object({
            phone: z.string().min(10, 'Phone number is required'),
        });

        const parseResult = schema.safeParse(req.body);
        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const tokenPair = await authService.loginFallback(parseResult.data.phone);

        res.status(200).json({
            accessToken: tokenPair.accessToken,
            refreshToken: tokenPair.refreshToken,
            expiresIn: tokenPair.expiresIn,
            tokenType: 'Bearer',
            user: tokenPair.user,
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
