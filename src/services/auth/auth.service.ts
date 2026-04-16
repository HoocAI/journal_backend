import bcrypt from 'bcrypt';
import {
    generateAccessToken,
    generateRefreshToken,
    generateProvisionalToken,
    validateRefreshToken,
    hashRefreshToken,
    verifyRefreshTokenHash,
    getRefreshTokenExpiresIn,
    getAccessTokenExpiresIn,
} from './token.utils';
import { sessionRepository } from '../../repositories/session.repository';
import { userRepository } from '../../repositories/user.repository';
import { AuthError, ConflictError } from '../../utils/errors';
import { prisma } from '../../lib/prisma';
import { OAuth2Client } from 'google-auth-library';
import type { TokenPair, LoginCredentials, PremiumStatus, TrialInfo } from '../../types';

const SALT_ROUNDS = 10;
const TRIAL_DURATION_DAYS = parseInt(process.env.TRIAL_DURATION_DAYS ?? '21', 10);
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);

export interface ProvisionalResponse {
    provisionalToken: string;
    requiresPhoneVerification: true;
    userId: string;
}

/**
 * Authentication service — 2-step signup only:
 *   Step 1: googleLogin()  → returns provisionalToken
 *   Step 2: verifyPhone()  → returns full TokenPair
 */
export const authService = {
    /**
     * STEP 1 — Google OAuth
     * Verifies the Google ID token, creates the user account if new,
     * and returns a short-lived provisional token.
     * No session is created yet.
     */
    async googleLogin(params: { idToken?: string; code?: string; redirectUri?: string }): Promise<ProvisionalResponse | TokenPair> {
        const { idToken, code, redirectUri } = params;
        console.log(`[AuthService] Initiating Google login. Type: ${code ? 'Auth Code' : 'ID Token'}`);

        if (!GOOGLE_CLIENT_ID) {
            console.error('[AuthService] CRITICAL: Google Client ID not configured');
            throw new AuthError('Google Client ID not configured', 'AUTH_CONFIG_ERROR', 500);
        }

        let payload;
        try {
            if (code) {
                // Scenario A: Authorization Code Flow
                const { tokens } = await googleClient.getToken({
                    code,
                    redirect_uri: redirectUri || 'postmessage' // 'postmessage' is standard for Flutter/Web direct exchange
                });
                const ticket = await googleClient.verifyIdToken({
                    idToken: tokens.id_token!,
                    audience: GOOGLE_CLIENT_ID,
                });
                payload = ticket.getPayload();
            } else if (idToken) {
                // Scenario B: Direct ID Token Flow
                const ticket = await googleClient.verifyIdToken({
                    idToken,
                    audience: GOOGLE_CLIENT_ID,
                });
                payload = ticket.getPayload();
            } else {
                throw new AuthError('Missing authentication token/code', 'AUTH_INVALID_TOKEN');
            }
            console.log(`[AuthService] Token verified for email: ${payload?.email}`);
        } catch (err: any) {
            console.error('[AuthService] Google verification failed:', err.message);
            throw new AuthError('Invalid Google token', 'AUTH_INVALID_TOKEN');
        }

        if (!payload || !payload.email || !payload.sub) {
            throw new AuthError('Google token missing email or ID', 'AUTH_INVALID_TOKEN');
        }

        const email = payload.email.toLowerCase();
        const googleId = payload.sub;

        // Try finding by Google ID first
        let user = await userRepository.findByGoogleId(googleId);

        // Fallback to email for older accounts not yet linked
        if (!user) {
            user = await userRepository.findByEmail(email);
            if (user) {
                console.log(`[AuthService] Linking Google ID to existing user: ${email}`);
                user = await userRepository.update(user.id, { googleId });
            }
        }

        if (!user) {
            console.log(`[AuthService] New user detected: ${email}. Creating account...`);
            // New user — create account (no session yet)
            const trialEndsAt = new Date();
            trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DURATION_DAYS);

            user = await prisma.$transaction(async (tx) => {
                const newUser = await tx.user.create({
                    data: {
                        email,
                        googleId,
                        passwordHash: await bcrypt.hash(Math.random().toString(36), SALT_ROUNDS),
                        role: 'USER',
                        plan: 'TRIAL',
                        trialEndsAt,
                        name: payload?.name || null,
                        isEmailVerified: true,
                    },
                });

                await tx.consent.create({
                    data: {
                        userId: newUser.id,
                        termsAccepted: true,
                        privacyAccepted: true,
                        recordingAccepted: true,
                    },
                });

                return newUser;
            });
        } else {
            // Existing user — mark email as verified if not already
            if (!user.isEmailVerified) {
                console.log(`[AuthService] Mark existing user ${email} as email verified`);
                user = await userRepository.update(user.id, { isEmailVerified: true });
            }

            if (!user.isActive) {
                console.warn(`[AuthService] Deactivated user attempted login: ${email}`);
                throw new AuthError('Account is deactivated', 'AUTH_ACCOUNT_DEACTIVATED');
            }
            console.log(`[AuthService] User found: ${email}`);
        }

        if (!user) {
            throw new AuthError('Failed to identify or create user', 'AUTH_INTERNAL_ERROR', 500);
        }

        // If user is already phone verified, log them in directly
        if (user.isPhoneVerified) {
            console.log(`[AuthService] User ${email} (ID: ${user.id}) is already phone verified. Proceeding to create session.`);
            return this.createSession(user.id);
        }

        console.log(`[AuthService] User ${email} (ID: ${user.id}) requires phone verification. Generating short-lived provisional token.`);
        const provisionalToken = generateProvisionalToken({ userId: user.id });

        console.log(`[AuthService] Provisional flow completed for ${email}. Returning token.`);
        return {
            provisionalToken,
            requiresPhoneVerification: true,
            userId: user.id,
        };
    },

    /**
     * Request OTP for Phone Login
     */
    async requestPhoneLogin(phone: string): Promise<{ message: string; requiresSignup: boolean }> {
        const user = await userRepository.findByPhone(phone);

        // Ensure user exists for login
        // If you want to support phone-only SIGNUP, this logic needs to change.
        // For now, assuming "Login" implies existing user.
        if (!user) {
            throw new AuthError('User not found with this phone number', 'AUTH_USER_NOT_FOUND');
        }

        // Generate OTP (Mock for now)
        // In real app: generate random 6-digit, store in Redis/DB with expiry, send via SMS
        console.log(`[DEV] OTP for ${phone}: 123456`);

        return {
            message: 'OTP sent successfully',
            requiresSignup: false,
        };
    },

    /**
     * Verify OTP and Login with Phone
     */
    async verifyPhoneLogin(phone: string, otp: string): Promise<TokenPair> {
        // Dev: mock OTP
        if (otp !== '123456') {
            throw new AuthError('Invalid OTP', 'AUTH_INVALID_OTP');
        }

        const user = await userRepository.findByPhone(phone);
        if (!user) {
            throw new AuthError('User not found', 'AUTH_USER_NOT_FOUND');
        }

        if (!user.isActive) {
            throw new AuthError('Account is deactivated', 'AUTH_ACCOUNT_DEACTIVATED');
        }

        return this.createSession(user.id);
    },

    /**
     * STEP 2 — Phone OTP Verification (Signup Flow)
     * Requires a valid provisional token (enforced by requireProvisionalAuth middleware).
     * Verifies the OTP, links the phone number, and creates a full session.
     */
    async verifyPhone(userId: string, phone: string, otp: string): Promise<TokenPair> {
        // Dev: mock OTP is 123456
        if (otp !== '123456') {
            throw new AuthError('Invalid OTP', 'AUTH_INVALID_OTP');
        }

        const user = await userRepository.findById(userId);
        if (!user) {
            throw new AuthError('User not found', 'AUTH_USER_NOT_FOUND');
        }

        // Check if phone is already used by ANOTHER user
        const existingPhoneUser = await userRepository.findByPhone(phone);
        if (existingPhoneUser && existingPhoneUser.id !== userId) {
            throw new ConflictError('Phone number already in use', 'AUTH_PHONE_IN_USE');
        }

        // Link phone and mark as verified
        await userRepository.update(userId, {
            phone,
            isPhoneVerified: true,
        });

        // Create full session — user is now fully authenticated
        return this.createSession(userId);
    },

    /**
     * Refreshes tokens using a valid refresh token (token rotation)
     */
    async refreshToken(refreshToken: string): Promise<TokenPair> {
        let tokenPayload;
        try {
            tokenPayload = validateRefreshToken(refreshToken);
        } catch {
            throw AuthError.refreshTokenInvalid();
        }

        const session = await sessionRepository.findById(tokenPayload.sessionId);
        if (!session) {
            throw AuthError.refreshTokenInvalid();
        }

        if (!verifyRefreshTokenHash(refreshToken, session.refreshTokenHash)) {
            await sessionRepository.deleteAllForUser(session.userId);
            throw AuthError.refreshTokenInvalid();
        }

        if (session.expiresAt < new Date()) {
            await sessionRepository.delete(session.id);
            throw AuthError.sessionExpired();
        }

        const user = await userRepository.findById(session.userId);
        if (!user || !user.isActive) {
            await sessionRepository.delete(session.id);
            throw new AuthError('Account is deactivated', 'AUTH_ACCOUNT_DEACTIVATED');
        }

        const isPremium = await userRepository.hasPremiumAccess(user.id);

        const newRefreshToken = generateRefreshToken({
            userId: session.userId,
            sessionId: session.id,
        });

        const newAccessToken = generateAccessToken({
            userId: session.userId,
            sessionId: session.id,
            isPremium,
        });

        const newExpiresAt = new Date(Date.now() + getRefreshTokenExpiresIn() * 1000);
        const updatedSession = await sessionRepository.updateRefreshToken(session.id, newRefreshToken, newExpiresAt);
        if (!updatedSession) {
            throw AuthError.refreshTokenInvalid();
        }


        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            expiresIn: getAccessTokenExpiresIn(),
            user: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                name: user.name,
                onboardingCompleted: user.onboardingCompleted,
                goalsSet: user.goalsSet,
                isEmailVerified: user.isEmailVerified,
                isPhoneVerified: user.isPhoneVerified,
            },
        };
    },

    /**
     * Logs out a user by invalidating their session
     */
    async logout(userId: string, sessionId: string): Promise<void> {
        const session = await sessionRepository.findById(sessionId);
        if (!session || session.userId !== userId) {
            return;
        }
        await sessionRepository.delete(sessionId);
    },

    /**
     * Logs out a user from all sessions
     */
    async logoutAll(userId: string): Promise<number> {
        return sessionRepository.deleteAllForUser(userId);
    },

    /**
     * Validates if a session is still active
     */
    async validateSession(sessionId: string): Promise<boolean> {
        return sessionRepository.isValid(sessionId);
    },

    /**
     * Checks premium access status for a user
     */
    async checkPremiumAccess(userId: string): Promise<PremiumStatus> {
        const user = await userRepository.findById(userId);
        if (!user) {
            return { isPremium: false, source: 'none', expiresAt: null };
        }

        if (user.plan === 'PREMIUM') {
            return { isPremium: true, source: 'subscription', expiresAt: null };
        }

        if (user.plan === 'TRIAL' && user.trialEndsAt && user.trialEndsAt > new Date()) {
            return { isPremium: true, source: 'trial', expiresAt: user.trialEndsAt };
        }

        return { isPremium: false, source: 'none', expiresAt: null };
    },

    /**
     * Gets remaining trial days for a user
     */
    async getRemainingTrialDays(userId: string): Promise<number> {
        return userRepository.getRemainingTrialDays(userId);
    },

    /**
     * Initializes a trial for a new user
     */
    async initializeTrial(userId: string): Promise<TrialInfo> {
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new AuthError('User not found', 'AUTH_USER_NOT_FOUND');
        }

        const trialStartDate = new Date();
        const trialEndDate = new Date(trialStartDate);
        trialEndDate.setDate(trialEndDate.getDate() + TRIAL_DURATION_DAYS);

        await userRepository.update(userId, {
            plan: 'TRIAL',
            trialEndsAt: trialEndDate,
        });

        return {
            userId,
            trialStartDate,
            trialEndDate,
            remainingDays: TRIAL_DURATION_DAYS,
        };
    },

    /**
     * Helper to create a session and return tokens
     */
    async createSession(userId: string): Promise<TokenPair> {
        const user = await userRepository.findById(userId);
        if (!user || !user.isActive) {
            throw new AuthError('Account is deactivated or not found', 'AUTH_ACCOUNT_DISABLED');
        }

        const isPremium = await userRepository.hasPremiumAccess(user.id);

        const refreshToken = generateRefreshToken({
            userId: user.id,
            sessionId: '',
        });

        const expiresAt = new Date(Date.now() + getRefreshTokenExpiresIn() * 1000);

        const session = await sessionRepository.create({
            userId: user.id,
            refreshToken,
            expiresAt,
        });

        const accessToken = generateAccessToken({
            userId: user.id,
            sessionId: session.id,
            isPremium,
        });

        console.log(`[AuthService] Session created successfully. SessionID: ${session.id}, UserID: ${user.id}`);

        const finalRefreshToken = generateRefreshToken({
            userId: user.id,
            sessionId: session.id,
        });

        const updatedSession = await sessionRepository.updateRefreshToken(session.id, finalRefreshToken, expiresAt);
        if (!updatedSession) {
            throw new AuthError('Session synchronization error', 'AUTH_SESSION_ERROR', 500);
        }


        return {
            accessToken,
            refreshToken: finalRefreshToken,
            expiresIn: getAccessTokenExpiresIn(),
            user: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                name: user.name,
                onboardingCompleted: user.onboardingCompleted,
                goalsSet: user.goalsSet,
                isEmailVerified: user.isEmailVerified,
                isPhoneVerified: user.isPhoneVerified,
            },
        };
    },

    /**
     * Admin-only: login with email and password (kept for admin panel access)
     * This is NOT part of the user signup flow.
     */
    async login(credentials: LoginCredentials): Promise<TokenPair> {
        const { email, password } = credentials;

        const user = await userRepository.findByEmail(email);
        if (!user) {
            throw AuthError.invalidCredentials();
        }

        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
            throw AuthError.invalidCredentials();
        }

        if (!user.isActive) {
            throw new AuthError('Account is deactivated', 'AUTH_ACCOUNT_DEACTIVATED');
        }

        return this.createSession(user.id);
    },

    /**
     * Fallback login — directly issue tokens for a phone number for testing.
     * ONLY FOR DEV/TEST ENVIRONMENTS.
     */
    async loginFallback(phone: string): Promise<TokenPair> {
        const user = await userRepository.findByPhone(phone);
        if (!user) {
            throw new AuthError('User not found with this phone number', 'AUTH_USER_NOT_FOUND');
        }

        if (!user.isActive) {
            throw new AuthError('Account is deactivated', 'AUTH_ACCOUNT_DEACTIVATED');
        }

        return this.createSession(user.id);
    },
};


