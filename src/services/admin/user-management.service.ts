
import { userRepository, type UserData } from '../../repositories/user.repository';
import { journalRepository } from '../../repositories/journal.repository';
import { moodRepository } from '../../repositories/mood.repository';
import { questionRepository } from '../../repositories/question.repository';
import { NotFoundError, ForbiddenError } from '../../utils/errors';
import type { MoodType, Plan } from '../../../generated/prisma';
import { Role } from '../../../generated/prisma';

export interface MoodAggregation {
    VERY_BAD: number;
    BAD: number;
    NEUTRAL: number;
    GOOD: number;
    VERY_GOOD: number;
    total: number;
}

export interface UserWithMoodAggregation {
    id: string;
    email: string;
    isActive: boolean;
    plan: Plan;
    createdAt: Date;
    moodAggregation: MoodAggregation;
}

export interface QuestionAnswerWithText {
    id: string;
    questionId: string;
    questionText: string;
    answer: string;
    answerDate: Date;
}

export interface JournalEntryData {
    id: string;
    content: string;
    photoUrl: string | null;
    audioUrl: string | null;
    createdAt: Date;
}

export interface MoodEntryData {
    id: string;
    mood: MoodType;
    reason: string | null;
    createdAt: Date;
}

export interface DailyUserData {
    date: string;
    journalEntry: JournalEntryData | null;
    moodEntry: MoodEntryData | null;
    questionAnswers: QuestionAnswerWithText[];
}

export const userManagementService = {

    async getAllUsers(): Promise<UserData[]> {
        return userRepository.findAllNonAdminUsers();
    },

    async getUserDailyData(userId: string): Promise<DailyUserData[]> {
        // Check if user exists
        const user = await userRepository.findById(userId);
        if (!user) {
            throw NotFoundError.resource('User', userId);
        }

        // Fetch all data for the user
        const [journalEntries, moodEntries, questionAnswers] = await Promise.all([
            journalRepository.findByUserId(userId),
            moodRepository.findByUserId(userId),
            questionRepository.findAnswersByUserIdWithQuestionText(userId),
        ]);

        // Collect all unique dates from all data sources
        const dateSet = new Set<string>();

        for (const entry of journalEntries) {
            dateSet.add(formatDateKey(entry.entryDate));
        }

        for (const entry of moodEntries) {
            dateSet.add(formatDateKey(entry.entryDate));
        }

        for (const answer of questionAnswers) {
            dateSet.add(formatDateKey(answer.answerDate));
        }

        // Sort dates in descending order (most recent first)
        const sortedDates = Array.from(dateSet).sort((a, b) => b.localeCompare(a));

        // Build daily data for each date
        const dailyData: DailyUserData[] = sortedDates.map((dateKey) => {
            const journalEntry = journalEntries.find(
                (entry) => formatDateKey(entry.entryDate) === dateKey
            );

            const moodEntry = moodEntries.find(
                (entry) => formatDateKey(entry.entryDate) === dateKey
            );

            const dayAnswers = questionAnswers.filter(
                (answer) => formatDateKey(answer.answerDate) === dateKey
            );

            return {
                date: dateKey,
                journalEntry: journalEntry
                    ? {
                        id: journalEntry.id,
                        content: journalEntry.content,
                        photoUrl: journalEntry.photoUrl,
                        audioUrl: journalEntry.audioUrl,
                        createdAt: journalEntry.createdAt,
                    }
                    : null,
                moodEntry: moodEntry
                    ? {
                        id: moodEntry.id,
                        mood: moodEntry.mood,
                        reason: moodEntry.reason,
                        createdAt: moodEntry.createdAt,
                    }
                    : null,
                questionAnswers: dayAnswers,
            };
        });

        return dailyData;
    },

    async disableUser(userId: string): Promise<UserData> {
        const user = await userRepository.findById(userId);
        if (!user) {
            throw NotFoundError.resource('User', userId);
        }

        if (user.role === 'ADMIN') {
            throw ForbiddenError.cannotDisableAdmin();
        }

        return userRepository.setActiveStatus(userId, false);
    },

    async enableUser(userId: string): Promise<UserData> {
        const user = await userRepository.findById(userId);
        if (!user) {
            throw NotFoundError.resource('User', userId);
        }

        return userRepository.setActiveStatus(userId, true);
    },
};

/**
 * Formats a date to YYYY-MM-DD string for grouping
 */
function formatDateKey(date: Date): string {
    const isoString = date.toISOString();
    return isoString.substring(0, 10);
}
