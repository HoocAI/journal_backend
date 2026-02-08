import { questionRepository } from '../../repositories/question.repository';
import { ConflictError, NotFoundError, ValidationError } from '../../utils/errors';
import { startOfDay } from '../../utils/date';

export interface DailyQuestionResponse {
    id: string;
    text: string;
    hasAnswered: boolean;
    answer?: {
        id: string;
        text: string;
        answeredAt: string;
    };
}

export interface QuestionAnswerResponse {
    id: string;
    answer: string;
    answeredAt: string;
}

export interface AnswerHistoryItem {
    id: string;
    answer: string;
    answerDate: string;
    question: {
        id: string;
        text: string;
    };
}

export interface PaginatedAnswerHistory {
    items: AnswerHistoryItem[];
    total: number;
    limit: number;
    offset: number;
}

export interface PaginationOptions {
    limit?: number;
    offset?: number;
}

export interface CreateQuestionSetInput {
    title: string;
    startDate: string;
    questions: Array<{
        text: string;
        order: number;
    }>;
}

export interface QuestionSetResponse {
    id: string;
    title: string;
    startDate: string;
    createdAt: string;
    questions: Array<{
        id: string;
        text: string;
        order: number;
    }>;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function getDayOfWeekOrder(date: Date): number {
    return date.getDay();
}

function normalizePaginationOptions(options?: PaginationOptions): { limit: number; offset: number } {
    const limit = Math.min(options?.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const offset = options?.offset ?? 0;
    return { limit: Math.max(1, limit), offset: Math.max(0, offset) };
}

export const questionService = {
    async getDailyQuestion(userId: string): Promise<DailyQuestionResponse> {
        const today = new Date();

        // Find the active question set
        const activeSet = await questionRepository.findActiveQuestionSet();

        if (!activeSet) {
            throw new NotFoundError(
                'No active question set available',
                'NO_ACTIVE_QUESTION_SET'
            );
        }

        // Get the question order based on day of week
        const questionOrder = getDayOfWeekOrder(today);

        // Find the question for today
        const question = await questionRepository.findQuestionBySetAndOrder(
            activeSet.id,
            questionOrder
        );

        if (!question) {
            throw new NotFoundError(
                'Question not found for today',
                'NO_ACTIVE_QUESTION_SET'
            );
        }

        // Check if user has already answered today
        const existingAnswer = await questionRepository.findAnswerByUserAndDate(userId, today);

        const response: DailyQuestionResponse = {
            id: question.id,
            text: question.text,
            hasAnswered: !!existingAnswer,
        };

        // Include answer if user has already answered
        if (existingAnswer) {
            response.answer = {
                id: existingAnswer.id,
                text: existingAnswer.answer,
                answeredAt: existingAnswer.createdAt.toISOString(),
            };
        }

        return response;
    },

    async submitAnswer(userId: string, answer: string): Promise<QuestionAnswerResponse> {
        // Validate answer is not empty or whitespace-only
        if (!answer || answer.trim().length === 0) {
            throw new ValidationError(
                'Answer cannot be empty or whitespace-only',
                'INVALID_ANSWER'
            );
        }

        const today = new Date();
        const todayStart = startOfDay(today);

        // Check if user already answered today
        const existingAnswer = await questionRepository.findAnswerByUserAndDate(userId, today);
        if (existingAnswer) {
            throw new ConflictError(
                'You have already answered today\'s question',
                'ALREADY_ANSWERED_TODAY',
                { date: todayStart.toISOString() }
            );
        }

        // Get the active question set and today's question
        const activeSet = await questionRepository.findActiveQuestionSet();
        if (!activeSet) {
            throw new NotFoundError(
                'No active question set available',
                'NO_ACTIVE_QUESTION_SET'
            );
        }

        const questionOrder = getDayOfWeekOrder(today);
        const question = await questionRepository.findQuestionBySetAndOrder(
            activeSet.id,
            questionOrder
        );

        if (!question) {
            throw new NotFoundError(
                'Question not found for today',
                'NO_ACTIVE_QUESTION_SET'
            );
        }

        // Create the answer
        const createdAnswer = await questionRepository.createAnswer({
            userId,
            questionId: question.id,
            answer: answer.trim(),
            answerDate: todayStart,
        });

        return {
            id: createdAnswer.id,
            answer: createdAnswer.answer,
            answeredAt: createdAnswer.createdAt.toISOString(),
        };
    },

    async getAnswerHistory(
        userId: string,
        options?: PaginationOptions
    ): Promise<PaginatedAnswerHistory> {
        const { limit, offset } = normalizePaginationOptions(options);

        const [answers, total] = await Promise.all([
            questionRepository.findAnswersByUser(userId, { limit, offset }),
            questionRepository.countAnswersByUser(userId),
        ]);

        const items: AnswerHistoryItem[] = answers.map((answer: { id: string; answer: string; answerDate: Date; question: { id: string; text: string } }) => ({
            id: answer.id,
            answer: answer.answer,
            answerDate: answer.answerDate.toISOString(),
            question: {
                id: answer.question.id,
                text: answer.question.text,
            },
        }));

        return {
            items,
            total,
            limit,
            offset,
        };
    },

    /**
     * Admin: Create a new question set
     * Requirements: 4.1, 4.2, 4.3
     */
    async createQuestionSet(input: CreateQuestionSetInput): Promise<QuestionSetResponse> {
        // Validate exactly 7 questions with orders 0-6
        if (input.questions.length !== 7) {
            throw new ValidationError(
                'Question set must contain exactly 7 questions',
                'INVALID_QUESTION_SET',
                { expected: 7, received: input.questions.length }
            );
        }

        const orders = input.questions.map((q: { text: string; order: number }) => q.order).sort((a: number, b: number) => a - b);
        const expectedOrders = [0, 1, 2, 3, 4, 5, 6];
        if (JSON.stringify(orders) !== JSON.stringify(expectedOrders)) {
            throw new ValidationError(
                'Questions must have order values 0-6 (each appearing exactly once)',
                'INVALID_QUESTION_SET',
                { expected: expectedOrders, received: orders }
            );
        }

        // Check for duplicate startDate
        const parsedStartDate = startOfDay(new Date(input.startDate));
        const existingSet = await questionRepository.findQuestionSetByStartDate(parsedStartDate);
        if (existingSet) {
            throw new ConflictError(
                'A question set with this start date already exists',
                'DUPLICATE_START_DATE',
                { startDate: parsedStartDate.toISOString() }
            );
        }

        // Create the question set
        const questionSet = await questionRepository.createQuestionSet({
            title: input.title,
            startDate: parsedStartDate,
            questions: input.questions,
        });

        return {
            id: questionSet.id,
            title: questionSet.title,
            startDate: questionSet.startDate.toISOString(),
            createdAt: questionSet.createdAt.toISOString(),
            questions: questionSet.questions.map((q: any) => ({
                id: q.id,
                text: q.text,
                order: q.order,
            })),
        };
    },

    /**
     * Admin: Get all question sets
     * Requirements: 4.4, 4.5
     */
    async getQuestionSets(): Promise<QuestionSetResponse[]> {
        const questionSets = await questionRepository.findAllQuestionSets();

        return questionSets.map((set: { id: string; title: string; startDate: Date; createdAt: Date; questions: Array<{ id: string; text: string; order: number }> }) => ({
            id: set.id,
            title: set.title,
            startDate: set.startDate.toISOString(),
            createdAt: set.createdAt.toISOString(),
            questions: set.questions.map((q: { id: string; text: string; order: number }) => ({
                id: q.id,
                text: q.text,
                order: q.order,
            })),
        }));
    },
};
