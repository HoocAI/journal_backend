
import { prisma } from '../lib/prisma';
import { PaymentStatus, PremiumRequest } from '@prisma/client';

export interface CreateRequestData {
    userId: string;
    transactionId?: string;
    amount?: number;
    months?: number;
    details?: string;
}

export const premiumRequestRepository = {
    async create(data: CreateRequestData): Promise<PremiumRequest> {
        return prisma.premiumRequest.create({
            data: {
                userId: data.userId,
                transactionId: data.transactionId,
                amount: data.amount,
                months: data.months ?? 1,
                details: data.details,
                status: 'PENDING',
            },
        });
    },

    async findById(id: string): Promise<PremiumRequest | null> {
        return prisma.premiumRequest.findUnique({
            where: { id },
            include: { user: true },
        });
    },

    async findByUserId(userId: string): Promise<PremiumRequest[]> {
        return prisma.premiumRequest.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    },

    async findPending(): Promise<PremiumRequest[]> {
        return prisma.premiumRequest.findMany({
            where: { status: 'PENDING' },
            include: { user: true },
            orderBy: { createdAt: 'asc' },
        });
    },

    async findAll(): Promise<PremiumRequest[]> {
        return prisma.premiumRequest.findMany({
            include: { user: true },
            orderBy: { createdAt: 'desc' },
        });
    },

    async updateStatus(id: string, status: PaymentStatus, adminNote?: string): Promise<PremiumRequest> {
        return prisma.premiumRequest.update({
            where: { id },
            data: {
                status,
                adminNote,
                processedAt: new Date(),
            },
        });
    },
};
