import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

import { hashRefreshToken } from '../services/auth/token.utils';

export interface SessionData {
    id: string;
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    createdAt: Date;
}

export interface CreateSessionInput {
    userId: string;
    refreshToken: string;
    expiresAt: Date;
}

/**
 * Session repository for managing user sessions in the database
 */
export const sessionRepository = {
    /**
     * Creates a new session with a hashed refresh token
     */
    async create(input: CreateSessionInput): Promise<SessionData> {
        const refreshTokenHash = hashRefreshToken(input.refreshToken);

        const session = await prisma.session.create({
            data: {
                userId: input.userId,
                refreshToken: refreshTokenHash,
                expiresAt: input.expiresAt,
            },
        });

        return {
            id: session.id,
            userId: session.userId,
            refreshTokenHash: session.refreshToken,
            expiresAt: session.expiresAt,
            createdAt: session.createdAt,
        };
    },

    /**
     * Finds a session by ID
     */
    async findById(sessionId: string): Promise<SessionData | null> {
        const session = await prisma.session.findUnique({
            where: { id: sessionId },
        });

        if (!session) return null;

        return {
            id: session.id,
            userId: session.userId,
            refreshTokenHash: session.refreshToken,
            expiresAt: session.expiresAt,
            createdAt: session.createdAt,
        };
    },

    /**
     * Finds a session by refresh token hash
     */
    async findByRefreshTokenHash(refreshTokenHash: string): Promise<SessionData | null> {
        const session = await prisma.session.findUnique({
            where: { refreshToken: refreshTokenHash },
        });

        if (!session) return null;

        return {
            id: session.id,
            userId: session.userId,
            refreshTokenHash: session.refreshToken,
            expiresAt: session.expiresAt,
            createdAt: session.createdAt,
        };
    },

    /**
     * Updates the refresh token for a session (token rotation)
     */
    async updateRefreshToken(
        sessionId: string,
        newRefreshToken: string,
        newExpiresAt: Date
    ): Promise<SessionData | null> {
        const newRefreshTokenHash = hashRefreshToken(newRefreshToken);

        try {
            const session = await prisma.session.update({
                where: { id: sessionId },
                data: {
                    refreshToken: newRefreshTokenHash,
                    expiresAt: newExpiresAt,
                },
            });

            return {
                id: session.id,
                userId: session.userId,
                refreshTokenHash: session.refreshToken,
                expiresAt: session.expiresAt,
                createdAt: session.createdAt,
            };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                return null;
            }
            throw error;
        }
    },

    /**
     * Deletes a session (logout)
     */
    async delete(sessionId: string): Promise<void> {
        await prisma.session.delete({
            where: { id: sessionId },
        });
    },

    /**
     * Deletes all sessions for a user
     */
    async deleteAllForUser(userId: string): Promise<number> {
        const result = await prisma.session.deleteMany({
            where: { userId },
        });
        return result.count;
    },

    /**
     * Finds all active sessions for a user
     */
    async findAllForUser(userId: string): Promise<SessionData[]> {
        const sessions = await prisma.session.findMany({
            where: {
                userId,
                expiresAt: { gt: new Date() },
            },
        });

        return sessions.map((session) => ({
            id: session.id,
            userId: session.userId,
            refreshTokenHash: session.refreshToken,
            expiresAt: session.expiresAt,
            createdAt: session.createdAt,
        }));
    },

    /**
     * Checks if a session is valid (exists and not expired)
     */
    async isValid(sessionId: string): Promise<boolean> {
        const session = await prisma.session.findUnique({
            where: { id: sessionId },
        });

        if (!session) return false;
        return session.expiresAt > new Date();
    },

    /**
     * Cleans up expired sessions
     */
    async deleteExpired(): Promise<number> {
        const result = await prisma.session.deleteMany({
            where: {
                expiresAt: { lt: new Date() },
            },
        });
        return result.count;
    },
};
