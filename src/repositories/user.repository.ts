import { prisma } from '../lib/prisma';
import { Plan, Role } from '@prisma/client';

export interface UserData {
    id: string;
    email: string;
    phone: string | null;
    passwordHash: string;
    role: Role;
    plan: Plan;
    trialEndsAt: Date | null;
    premiumEndsAt: Date | null;
    isActive: boolean;
    onboardingCompleted: boolean;
    goalsSet: boolean;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    googleId: string | null;
    name: string | null;
    age: number | null;
    language: string | null;
    timezone: string | null;
    gender: string | null;
    focus: string[];
    currentStreak: number;
    longestStreak: number;
    lastEntryDate: Date | null;
    coins: number;
    photoUrl: string | null;
    photoS3Key: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateUserInput {
    email: string;
    googleId?: string;
    phone?: string;
    passwordHash: string;
    role?: Role;
    plan?: Plan;
    trialEndsAt?: Date;
    currentStreak?: number;
    longestStreak?: number;
    lastEntryDate?: Date;
    coins?: number;
}

/**
 * Checks if a role is admin
 */
export function isAdmin(role: Role): boolean {
    return role === 'ADMIN';
}

/**
 * User repository for managing users in the database
 */
export const userRepository = {
    /**
     * Creates a new user
     */
    async create(input: CreateUserInput): Promise<UserData> {
        const user = await prisma.user.create({
            data: {
                email: input.email.toLowerCase(),
                googleId: input.googleId,
                phone: input.phone,
                passwordHash: input.passwordHash,
                role: input.role,
                plan: input.plan,
                trialEndsAt: input.trialEndsAt,
                currentStreak: input.currentStreak || 0,
                longestStreak: input.longestStreak || 0,
                lastEntryDate: input.lastEntryDate || null,
                coins: input.coins || 0,
            },
        });

        return user as unknown as UserData;
    },

    /**
     * Finds a user by ID
     */
    async findById(userId: string): Promise<UserData | null> {
        return prisma.user.findUnique({
            where: { id: userId },
        }) as unknown as Promise<UserData | null>;
    },

    /**
     * Finds a user by email
     */
    async findByEmail(email: string): Promise<UserData | null> {
        return prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        }) as unknown as Promise<UserData | null>;
    },

    /**
     * Finds a user by Google ID
     */
    async findByGoogleId(googleId: string): Promise<UserData | null> {
        return prisma.user.findUnique({
            where: { googleId },
        }) as unknown as Promise<UserData | null>;
    },

    /**
     * Finds a user by phone
     */
    async findByPhone(phone: string): Promise<UserData | null> {
        return prisma.user.findUnique({
            where: { phone },
        }) as unknown as Promise<UserData | null>;
    },

    /**
     * Finds an admin user by email
     */
    async findAdminByEmail(email: string): Promise<UserData | null> {
        return prisma.user.findFirst({
            where: {
                email: email.toLowerCase(),
                role: 'ADMIN',
            },
        }) as unknown as Promise<UserData | null>;
    },

    /**
     * Updates a user
     */
    async update(userId: string, data: Partial<Omit<UserData, 'id' | 'createdAt' | 'updatedAt'>>): Promise<UserData> {
        return prisma.user.update({
            where: { id: userId },
            data,
        }) as unknown as Promise<UserData>;
    },

    /**
     * Checks if a user has premium access (active trial or premium plan)
     */
    async hasPremiumAccess(userId: string): Promise<boolean> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user || !user.isActive) return false;

        // Admins always have premium access
        if (user.role === 'ADMIN') return true;

        // Premium plan always has access
        if (user.plan === 'PREMIUM') return true;

        // Trial plan has access if trial hasn't expired
        if (user.plan === 'TRIAL' && user.trialEndsAt) {
            return user.trialEndsAt > new Date();
        }

        // Check monthwise premium expiry
        if (user.premiumEndsAt) {
            return user.premiumEndsAt > new Date();
        }

        return false;
    },

    /**
     * Gets remaining trial days for a user
     */
    async getRemainingTrialDays(userId: string): Promise<number> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user || !user.trialEndsAt) return 0;

        const now = new Date();
        if (user.trialEndsAt <= now) return 0;

        const diffMs = user.trialEndsAt.getTime() - now.getTime();
        return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    },

    /**
     * Checks if a user exists by email
     */
    async existsByEmail(email: string): Promise<boolean> {
        const count = await prisma.user.count({
            where: { email: email.toLowerCase() },
        });
        return count > 0;
    },

    /**
     * Checks if a user is an admin
     */
    async isUserAdmin(userId: string): Promise<boolean> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });
        return user?.role === 'ADMIN';
    },

    /**
     * Finds all non-admin users
     */
    async findAllNonAdminUsers(): Promise<UserData[]> {
        return prisma.user.findMany({
            where: { role: { not: 'ADMIN' } },
        }) as unknown as Promise<UserData[]>;
    },

    /**
     * Sets the active status of a user
     */
    async setActiveStatus(userId: string, isActive: boolean): Promise<UserData> {
        return prisma.user.update({
            where: { id: userId },
            data: { isActive },
        }) as unknown as Promise<UserData>;
    },

    /**
     * Deletes a user by ID
     */
    async deleteById(userId: string): Promise<UserData> {
        return prisma.user.delete({
            where: { id: userId },
        }) as unknown as Promise<UserData>;
    },
};
