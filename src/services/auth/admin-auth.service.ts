import bcrypt from 'bcrypt';
import {
    generateAccessToken,
    generateRefreshToken,
    validateRefreshToken,
    verifyRefreshTokenHash,
    getRefreshTokenExpiresIn,
    getAccessTokenExpiresIn,
} from './token.utils';
import { sessionRepository } from '../../repositories/session.repository';
import { userRepository } from '../../repositories/user.repository';
import { AuthError } from '../../utils/errors';
import type { TokenPair, AdminCredentials } from '../../types';

/**
 * Admin authentication service for admin login and token management
 * Uses the same User table but filters by role=ADMIN
 */
export const adminAuthService = {
    /**
     * Authenticates an admin with email and password
     * Returns access and refresh token pair
     */
    async login(credentials: AdminCredentials): Promise<TokenPair> {
        const { email, password } = credentials;

        // Find admin by email (must have ADMIN role)
        const admin = await userRepository.findAdminByEmail(email);
        if (!admin) {
            throw AuthError.invalidCredentials();
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, admin.passwordHash);
        if (!isValidPassword) {
            throw AuthError.invalidCredentials();
        }

        // Check if admin is active
        if (!admin.isActive) {
            throw new AuthError('Admin account is deactivated', 'AUTH_ACCOUNT_DEACTIVATED');
        }

        // Generate tokens
        const refreshToken = generateRefreshToken({
            userId: admin.id,
            sessionId: '', // Will be set after session creation
        });

        // Calculate expiration
        const expiresAt = new Date(Date.now() + getRefreshTokenExpiresIn() * 1000);

        // Create session (uses same Session table as users)
        const session = await sessionRepository.create({
            userId: admin.id,
            refreshToken,
            expiresAt,
        });

        // Generate access token with session ID
        // Admins always have premium access
        const accessToken = generateAccessToken({
            userId: admin.id,
            sessionId: session.id,
            isPremium: true,
        });

        // Generate new refresh token with session ID
        const finalRefreshToken = generateRefreshToken({
            userId: admin.id,
            sessionId: session.id,
        });

        // Update session with correct refresh token
        await sessionRepository.updateRefreshToken(session.id, finalRefreshToken, expiresAt);

        return {
            accessToken,
            refreshToken: finalRefreshToken,
            expiresIn: getAccessTokenExpiresIn(),
        };
    },

    /**
     * Refreshes admin tokens using a valid refresh token
     * Implements token rotation - old refresh token is invalidated
     */
    async refreshToken(refreshToken: string): Promise<TokenPair> {
        // Validate the refresh token
        let tokenPayload;
        try {
            tokenPayload = validateRefreshToken(refreshToken);
        } catch {
            throw AuthError.refreshTokenInvalid();
        }

        // Find the session
        const session = await sessionRepository.findById(tokenPayload.sessionId);
        if (!session) {
            throw AuthError.refreshTokenInvalid();
        }

        // Verify the refresh token matches the stored hash
        if (!verifyRefreshTokenHash(refreshToken, session.refreshTokenHash)) {
            // Token doesn't match - possible token reuse attack
            // Invalidate all sessions for this admin as a security measure
            await sessionRepository.deleteAllForUser(session.userId);
            throw AuthError.refreshTokenInvalid();
        }

        // Check if session is expired
        if (session.expiresAt < new Date()) {
            await sessionRepository.delete(session.id);
            throw AuthError.sessionExpired();
        }

        // Get user and verify they're still an admin and active
        const admin = await userRepository.findById(session.userId);
        if (!admin || !admin.isActive || admin.role !== 'ADMIN') {
            await sessionRepository.delete(session.id);
            throw new AuthError('Admin account is deactivated', 'AUTH_ACCOUNT_DEACTIVATED');
        }

        // Generate new tokens (rotation)
        const newRefreshToken = generateRefreshToken({
            userId: session.userId,
            sessionId: session.id,
        });

        const newAccessToken = generateAccessToken({
            userId: session.userId,
            sessionId: session.id,
            isPremium: true,
        });

        // Update session with new refresh token
        const newExpiresAt = new Date(Date.now() + getRefreshTokenExpiresIn() * 1000);
        await sessionRepository.updateRefreshToken(session.id, newRefreshToken, newExpiresAt);

        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            expiresIn: getAccessTokenExpiresIn(),
        };
    },

    /**
     * Logs out an admin by invalidating their session
     */
    async logout(adminId: string, sessionId: string): Promise<void> {
        // Verify the session belongs to the admin
        const session = await sessionRepository.findById(sessionId);
        if (!session || session.userId !== adminId) {
            // Session doesn't exist or doesn't belong to admin
            // Still return success to prevent information leakage
            return;
        }

        await sessionRepository.delete(sessionId);
    },

    /**
     * Logs out an admin from all sessions
     */
    async logoutAll(adminId: string): Promise<number> {
        return sessionRepository.deleteAllForUser(adminId);
    },

    /**
     * Validates if an admin session is still active
     */
    async validateSession(sessionId: string): Promise<boolean> {
        return sessionRepository.isValid(sessionId);
    },

    /**
     * Checks if a user is a valid active admin
     */
    async isValidAdmin(userId: string): Promise<boolean> {
        const user = await userRepository.findById(userId);
        return user !== null && user.isActive && user.role === 'ADMIN';
    },
};
