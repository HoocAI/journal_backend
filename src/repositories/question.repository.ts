import { prisma } from '../lib/prisma';

export interface PaginationOptions {
    limit: number;
    offset: number;
}

export interface CreateAnswerData {
    userId: string;
    questionId: string;
    answer: string;
    answerDate: Date;
}

export interface CreateQuestionSetData {
    title: string;
    startDate: Date;
    questions: Array<{
        text: string;
        order: number;
    }>;
}

export const questionRepository = {
    async findActiveQuestionSet() {
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        return prisma.questionSet.findFirst({
            where: {
                startDate: { lte: today },
            },
            orderBy: {
                startDate: 'desc',
            },
            include: {
                questions: {
                    orderBy: { order: 'asc' },
                },
            },
        });
    },

    async findQuestionBySetAndOrder(questionSetId: string, order: number) {
        return prisma.question.findUnique({
            where: {
                questionSetId_order: {
                    questionSetId,
                    order,
                },
            },
        });
    },

    async findAnswerByUserAndDate(userId: string, date: Date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return prisma.questionAnswer.findFirst({
            where: {
                userId,
                answerDate: { gte: startOfDay, lte: endOfDay },
            },
            include: {
                question: true,
            },
        });
    },

    async createAnswer(data: CreateAnswerData) {
        return prisma.questionAnswer.create({
            data,
            include: {
                question: true,
            },
        });
    },

    async findAnswersByUser(userId: string, options: PaginationOptions) {
        return prisma.questionAnswer.findMany({
            where: { userId },
            orderBy: { answerDate: 'desc' },
            skip: options.offset,
            take: options.limit,
            include: {
                question: true,
            },
        });
    },

    async countAnswersByUser(userId: string) {
        return prisma.questionAnswer.count({
            where: { userId },
        });
    },

    async createQuestionSet(data: CreateQuestionSetData) {
        return prisma.questionSet.create({
            data: {
                title: data.title,
                startDate: data.startDate,
                questions: {
                    create: data.questions.map((q) => ({
                        text: q.text,
                        order: q.order,
                    })),
                },
            },
            include: {
                questions: {
                    orderBy: { order: 'asc' },
                },
            },
        });
    },

    async findQuestionSetByStartDate(startDate: Date) {
        const startOfDay = new Date(startDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(startDate);
        endOfDay.setHours(23, 59, 59, 999);

        return prisma.questionSet.findFirst({
            where: {
                startDate: { gte: startOfDay, lte: endOfDay },
            },
        });
    },

    async findAllQuestionSets() {
        return prisma.questionSet.findMany({
            orderBy: { startDate: 'desc' },
            include: {
                questions: {
                    orderBy: { order: 'asc' },
                },
            },
        });
    },

    /**
     * Finds all answers for a user with the associated question text
     */
    async findAnswersByUserIdWithQuestionText(userId: string) {
        const answers = await prisma.questionAnswer.findMany({
            where: { userId },
            orderBy: { answerDate: 'desc' },
            include: {
                question: {
                    select: { text: true },
                },
            },
        });

        return answers.map((answer) => ({
            id: answer.id,
            questionId: answer.questionId,
            questionText: answer.question.text,
            answer: answer.answer,
            answerDate: answer.answerDate,
        }));
    },
};
