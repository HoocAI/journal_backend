import { Request, Response, NextFunction } from 'express';
import { validateAccessToken, validateProvisionalToken } from '../services/auth/token.utils';
import { AuthError, ForbiddenError } from '../utils/errors';
import { prisma } from '../lib/prisma';
import type { TokenPayload } from '../types';

// Extend Express Request to include user info
declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload & { isPremiumActive?: boolean };
        }
    }
}

/**
 * Middleware that requires a valid access token
 */
export function requireAuth() {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader?.startsWith('Bearer ')) {
                throw AuthError.tokenInvalid();
            }

            const token = authHeader.substring(7);
            const payload = validateAccessToken(token);

            // Verify session is still active
            const session = await prisma.session.findUnique({
                where: { id: payload.sessionId },
            });

            if (!session || session.expiresAt < new Date()) {
                throw AuthError.sessionExpired();
            }

            req.user = payload;
            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Middleware that requires premium access (active trial or subscription)
 */
export function requirePremium() {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!req.user) {
                throw AuthError.tokenInvalid();
            }

            const user = await prisma.user.findUnique({
                where: { id: req.user.userId },
                select: { plan: true, trialEndsAt: true },
            });

            if (!user) {
                throw AuthError.tokenInvalid();
            }

            const isPremiumActive =
                user.plan === 'PREMIUM' ||
                (user.plan === 'TRIAL' && user.trialEndsAt && user.trialEndsAt > new Date());

            if (!isPremiumActive) {
                throw ForbiddenError.premiumRequired();
            }

            req.user.isPremiumActive = true;
            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Middleware that requires a valid provisional token (Step 1 of 2-step signup)
 * Only accepts tokens of type 'provisional' — full access tokens are rejected.
 * Used exclusively by the verify-phone route.
 */
export function requireProvisionalAuth() {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader?.startsWith('Bearer ')) {
                throw new AuthError('Provisional token required', 'AUTH_TOKEN_REQUIRED');
            }

            const token = authHeader.substring(7);
            const payload = validateProvisionalToken(token);

            // Attach userId so the route handler can use it
            req.user = { userId: payload.userId, sessionId: '', isPremium: false, exp: 0 };
            next();
        } catch (error) {
            next(error);
        }
    };
}
