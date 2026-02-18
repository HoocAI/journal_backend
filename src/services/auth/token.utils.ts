import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import { AuthError } from '../../utils/errors';
import type { TokenPayload, AdminTokenPayload, AdminRole } from '../../types';

export interface ProvisionalTokenPayload {
    userId: string;
}

// Configuration - these will be loaded from env in production
const ACCESS_TOKEN_SECRET: string = process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-key-min-32-chars!!';
const REFRESH_TOKEN_SECRET: string = process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-key-min-32-chars!';
const ACCESS_TOKEN_EXPIRES_IN_STR = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
const REFRESH_TOKEN_EXPIRES_IN_STR = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';

/**
 * Parses a duration string (e.g., '15m', '7d', '1h') to seconds
 */
export function parseDurationToSeconds(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match || !match[1] || !match[2]) {
        throw new Error(`Invalid duration format: ${duration}`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
        case 's':
            return value;
        case 'm':
            return value * 60;
        case 'h':
            return value * 60 * 60;
        case 'd':
            return value * 60 * 60 * 24;
        default:
            throw new Error(`Unknown duration unit: ${unit}`);
    }
}

/**
 * Generates an access token for a user
 */
export function generateAccessToken(payload: {
    userId: string;
    sessionId: string;
    isPremium: boolean;
}): string {
    const expiresInSeconds = parseDurationToSeconds(ACCESS_TOKEN_EXPIRES_IN_STR);
    const options: SignOptions = {
        expiresIn: expiresInSeconds,
        algorithm: 'HS256',
    };

    return jwt.sign(
        {
            userId: payload.userId,
            sessionId: payload.sessionId,
            isPremium: payload.isPremium,
            type: 'access',
        },
        ACCESS_TOKEN_SECRET,
        options
    );
}

/**
 * Generates an admin access token with role information
 */
export function generateAdminAccessToken(payload: {
    userId: string;
    sessionId: string;
    isPremium: boolean;
    role: AdminRole;
    permissions: string[];
}): string {
    const expiresInSeconds = parseDurationToSeconds(ACCESS_TOKEN_EXPIRES_IN_STR);
    const options: SignOptions = {
        expiresIn: expiresInSeconds,
        algorithm: 'HS256',
    };

    return jwt.sign(
        {
            userId: payload.userId,
            sessionId: payload.sessionId,
            isPremium: payload.isPremium,
            role: payload.role,
            permissions: payload.permissions,
            type: 'admin_access',
        },
        ACCESS_TOKEN_SECRET,
        options
    );
}

/**
 * Generates a refresh token
 */
export function generateRefreshToken(payload: {
    userId: string;
    sessionId: string;
}): string {
    const expiresInSeconds = parseDurationToSeconds(REFRESH_TOKEN_EXPIRES_IN_STR);
    const options: SignOptions = {
        expiresIn: expiresInSeconds,
        algorithm: 'HS256',
    };

    return jwt.sign(
        {
            userId: payload.userId,
            sessionId: payload.sessionId,
            type: 'refresh',
        },
        REFRESH_TOKEN_SECRET,
        options
    );
}

/**
 * Generates a provisional token after Google OAuth (Step 1 of 2-step signup)
 * This token is only valid for the verify-phone endpoint.
 */
export function generateProvisionalToken(payload: { userId: string }): string {
    const options: SignOptions = {
        expiresIn: 600, // 10 minutes
        algorithm: 'HS256',
    };

    return jwt.sign(
        {
            userId: payload.userId,
            type: 'provisional',
        },
        ACCESS_TOKEN_SECRET,
        options
    );
}

/**
 * Validates and decodes a provisional token
 */
export function validateProvisionalToken(token: string): ProvisionalTokenPayload {
    try {
        const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtPayload & {
            userId: string;
            type: string;
        };

        if (decoded.type !== 'provisional') {
            throw new AuthError('Invalid provisional token', 'AUTH_INVALID_TOKEN');
        }

        return { userId: decoded.userId };
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new AuthError('Provisional token expired. Please restart signup.', 'AUTH_TOKEN_EXPIRED');
        }
        if (error instanceof jwt.JsonWebTokenError) {
            throw AuthError.tokenInvalid();
        }
        throw error;
    }
}

/**
 * Validates and decodes an access token
 */
export function validateAccessToken(token: string): TokenPayload {
    try {
        const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtPayload & {
            userId: string;
            sessionId: string;
            isPremium: boolean;
            type: string;
        };

        // Explicitly reject provisional tokens — they cannot access protected routes
        if (decoded.type !== 'access' && decoded.type !== 'admin_access') {
            throw AuthError.tokenInvalid();
        }

        return {
            userId: decoded.userId,
            sessionId: decoded.sessionId,
            isPremium: decoded.isPremium,
            exp: decoded.exp!,
        };
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw AuthError.tokenExpired();
        }
        if (error instanceof jwt.JsonWebTokenError) {
            throw AuthError.tokenInvalid();
        }
        throw error;
    }
}

/**
 * Validates and decodes an admin access token
 */
export function validateAdminAccessToken(token: string): AdminTokenPayload {
    try {
        const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtPayload & {
            userId: string;
            sessionId: string;
            isPremium: boolean;
            role: AdminRole;
            permissions: string[];
            type: string;
        };

        if (decoded.type !== 'admin_access') {
            throw AuthError.tokenInvalid();
        }

        return {
            userId: decoded.userId,
            sessionId: decoded.sessionId,
            isPremium: decoded.isPremium,
            role: decoded.role,
            permissions: decoded.permissions,
            exp: decoded.exp!,
        };
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw AuthError.tokenExpired();
        }
        if (error instanceof jwt.JsonWebTokenError) {
            throw AuthError.tokenInvalid();
        }
        throw error;
    }
}

/**
 * Validates and decodes a refresh token
 */
export function validateRefreshToken(token: string): { userId: string; sessionId: string; exp: number } {
    try {
        const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET) as JwtPayload & {
            userId: string;
            sessionId: string;
            type: string;
        };

        if (decoded.type !== 'refresh') {
            throw AuthError.refreshTokenInvalid();
        }

        return {
            userId: decoded.userId,
            sessionId: decoded.sessionId,
            exp: decoded.exp!,
        };
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw AuthError.refreshTokenInvalid();
        }
        if (error instanceof jwt.JsonWebTokenError) {
            throw AuthError.refreshTokenInvalid();
        }
        throw error;
    }
}

/**
 * Hashes a refresh token for secure storage
 */
export function hashRefreshToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verifies a refresh token against its hash
 */
export function verifyRefreshTokenHash(token: string, hash: string): boolean {
    const tokenHash = hashRefreshToken(token);
    return crypto.timingSafeEqual(Buffer.from(tokenHash), Buffer.from(hash));
}

/**
 * Gets the expiration time in seconds for access tokens
 */
export function getAccessTokenExpiresIn(): number {
    return parseDurationToSeconds(ACCESS_TOKEN_EXPIRES_IN_STR);
}

/**
 * Gets the expiration time in seconds for refresh tokens
 */
export function getRefreshTokenExpiresIn(): number {
    return parseDurationToSeconds(REFRESH_TOKEN_EXPIRES_IN_STR);
}

/**
 * Decodes a token without verification (for debugging/logging)
 */
export function decodeToken(token: string): JwtPayload | null {
    return jwt.decode(token) as JwtPayload | null;
}
