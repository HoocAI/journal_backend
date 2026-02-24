import { prisma } from '../lib/prisma';

export const visionBoardRepository = {
    // ── Boards ──────────────────────────────────────────────────────────

    async createBoard(userId: string, name: string) {
        return prisma.visionBoard.create({
            data: { userId, name },
            include: { images: true },
        });
    },

    async findBoardsByUser(userId: string) {
        return prisma.visionBoard.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' },
            include: {
                _count: { select: { images: true } },
            },
        });
    },

    async findBoardByIdAndUser(id: string, userId: string) {
        return prisma.visionBoard.findFirst({
            where: { id, userId },
        });
    },

    async deleteBoard(id: string, userId: string) {
        return prisma.visionBoard.deleteMany({
            where: { id, userId },
        });
    },

    async boardNameExists(userId: string, name: string) {
        const board = await prisma.visionBoard.findUnique({
            where: { userId_name: { userId, name } },
        });
        return !!board;
    },

    // ── Images ───────────────────────────────────────────────────────────

    async getBoardWithImages(boardId: string, userId: string) {
        return prisma.visionBoard.findFirst({
            where: { id: boardId, userId },
            include: {
                images: { orderBy: { createdAt: 'asc' } },
            },
        });
    },

    async addImage(visionBoardId: string, url: string, s3Key: string) {
        return prisma.visionBoardImage.create({
            data: { visionBoardId, url, s3Key },
        });
    },

    async findImageById(imageId: string) {
        return prisma.visionBoardImage.findUnique({
            where: { id: imageId },
            include: { board: true },
        });
    },

    async removeImage(imageId: string) {
        return prisma.visionBoardImage.delete({
            where: { id: imageId },
        });
    },
};
