import { prisma } from '../lib/prisma';

export interface AdminAudioData {
    id: string;
    title: string;
    audioUrl: string;
    s3Key?: string | null;
    createdAt: Date;
}

export interface CreateAdminAudioInput {
    title: string;
    audioUrl: string;
    s3Key?: string;
}

/**
 * Admin audio repository for managing admin-uploaded audio content
 */
export const adminAudioRepository = {
    /**
     * Creates a new admin audio record
     */
    async create(input: CreateAdminAudioInput): Promise<AdminAudioData> {
        return prisma.adminAudio.create({
            data: {
                title: input.title,
                audioUrl: input.audioUrl,
                s3Key: input.s3Key,
            },
        });
    },

    /**
     * Finds all admin audio records
     */
    async findAll(): Promise<AdminAudioData[]> {
        return prisma.adminAudio.findMany({
            orderBy: { createdAt: 'desc' },
        });
    },

    /**
     * Finds an admin audio record by ID
     */
    async findById(id: string): Promise<AdminAudioData | null> {
        return prisma.adminAudio.findUnique({
            where: { id },
        });
    },
};
