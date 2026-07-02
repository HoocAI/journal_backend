import { prisma } from '../lib/prisma';

export interface GoalData {
    id: string;
    userId: string;
    type: string;
    content: string;
    deadline?: Date | null;
    isAutomated: boolean;
    targetValue?: string | null;
    templateKey?: string | null;
    affirmation?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateGoalInput {
    userId: string;
    type: string;
    content: string;
    deadline?: Date;
    isAutomated?: boolean;
    targetValue?: string;
    templateKey?: string;
    affirmation?: string;
}

function cleanAffirmation(affirmation: string | null | undefined, deadline?: Date | null): string | null {
    if (!affirmation) return null;
    
    let text = affirmation;
    // Check if it is a JSON-stringified array from old format
    if (text.startsWith('[') && text.endsWith(']')) {
        try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed) && parsed.length > 0) {
                text = parsed[0] || '';
            }
        } catch (e) {
            // Ignore parse errors
        }
    }

    // Ensure the date is included if a deadline is present
    if (deadline) {
        const dateStr = deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        const lowerText = text.toLowerCase();
        const lowerDateStr = dateStr.toLowerCase();
        const yearStr = deadline.getFullYear().toString();
        
        if (!lowerText.includes(lowerDateStr) && !lowerText.includes(yearStr)) {
            if (text.endsWith('.')) {
                text = text.slice(0, -1);
            }
            text = `${text} by ${dateStr}`;
        }
    }
    
    return text;
}

function mapGoal(goal: any): GoalData {
    return {
        ...goal,
        affirmation: cleanAffirmation(goal.affirmation, goal.deadline),
    };
}

export const goalRepository = {
    async create(data: CreateGoalInput): Promise<GoalData> {
        const goal = await prisma.goal.create({ data });
        return mapGoal(goal);
    },

    /**
     * Replaces all goals of a specific type for a user with a new set of goals.
     * Uses a transaction to ensure atomicity.
     */
    async overwriteCategoryGoals(userId: string, type: string, goals: Omit<CreateGoalInput, 'userId' | 'type'>[]): Promise<GoalData[]> {
        return prisma.$transaction(async (tx) => {
            // 1. Delete all existing goals for this category
            await tx.goal.deleteMany({
                where: { userId, type },
            });

            // 2. Create the new goals
            const createdGoals = await Promise.all(
                goals.map((goal) =>
                    tx.goal.create({
                        data: {
                            ...goal,
                            userId,
                            type,
                        },
                    })
                )
            );

            return createdGoals.map(mapGoal);
        });
    },

    async findByUserId(userId: string): Promise<GoalData[]> {
        const goals = await prisma.goal.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        return goals.map(mapGoal);
    },

    async findAll(): Promise<GoalData[]> {
        const goals = await prisma.goal.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return goals.map(mapGoal);
    },

    async update(id: string, content: string, affirmation?: string): Promise<GoalData> {
        const goal = await prisma.goal.update({
            where: { id },
            data: { content, affirmation },
        });
        return mapGoal(goal);
    },

    async delete(id: string): Promise<GoalData> {
        const goal = await prisma.goal.delete({
            where: { id },
        });
        return mapGoal(goal);
    },

    async countByUserAndSince(userId: string, since: Date): Promise<number> {
        return prisma.goal.count({
            where: {
                userId,
                createdAt: {
                    gte: since,
                },
            },
        });
    },
};