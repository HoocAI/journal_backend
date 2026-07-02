import { goalRepository, type GoalData, type CreateGoalInput as RepoCreateInput } from '../../repositories/goal.repository';
import { openaiService } from '../ai/openai.service';
import { RateLimitError } from '../../utils/errors';

export interface CreateGoalInput {
    type: string;
    content: string;
    deadline?: string;
    isAutomated?: boolean;
    targetValue?: string;
    templateKey?: string;
}

// In-memory rate limiting map: userId -> array of timestamps to prevent concurrency race conditions
const userCreationTimes = new Map<string, number[]>();

function checkInMemoryLimit(userId: string, incomingCount: number = 1): void {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    let timestamps = userCreationTimes.get(userId) || [];
    timestamps = timestamps.filter(t => t >= oneHourAgo);
    
    if (timestamps.length + incomingCount > 5) {
        throw RateLimitError.tooManyRequests(3600);
    }
}

function registerInMemoryCreation(userId: string, incomingCount: number = 1): void {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    let timestamps = userCreationTimes.get(userId) || [];
    timestamps = timestamps.filter(t => t >= oneHourAgo);
    
    for (let i = 0; i < incomingCount; i++) {
        timestamps.push(now);
    }
    userCreationTimes.set(userId, timestamps);
}

export const goalService = {
    async createGoal(userId: string, input: CreateGoalInput): Promise<GoalData> {
        // 1. Synchronously check in-memory limit to prevent concurrent loop race conditions
        checkInMemoryLimit(userId, 1);

        // 2. Check persistent database count
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const count = await goalRepository.countByUserAndSince(userId, oneHourAgo);
        if (count >= 5) {
            throw RateLimitError.tooManyRequests(3600);
        }

        // 3. Register the creation in memory synchronously
        registerInMemoryCreation(userId, 1);

        const deadline = input.deadline ? new Date(input.deadline) : undefined;
        const affirmation = await openaiService.generateGoalAffirmation(input.content, deadline);

        return goalRepository.create({
            userId,
            ...input,
            deadline,
            affirmation,
        });
    },

    async updateCategoryGoals(userId: string, type: string, goals: Omit<CreateGoalInput, 'type'>[]): Promise<GoalData[]> {
        // 1. Synchronously check in-memory limit
        checkInMemoryLimit(userId, goals.length);

        // 2. Check persistent database count
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const count = await goalRepository.countByUserAndSince(userId, oneHourAgo);
        if (count + goals.length > 5) {
            throw RateLimitError.tooManyRequests(3600);
        }

        // 3. Register creation in memory
        registerInMemoryCreation(userId, goals.length);

        const goalsWithAffirmations = await Promise.all(
            goals.map(async (g) => {
                const deadline = g.deadline ? new Date(g.deadline) : undefined;
                const affirmation = await openaiService.generateGoalAffirmation(g.content, deadline);
                return {
                    ...g,
                    deadline,
                    affirmation,
                };
            })
        );

        return goalRepository.overwriteCategoryGoals(
            userId,
            type,
            goalsWithAffirmations
        );
    },

    async getUserGoals(userId: string): Promise<GoalData[]> {
        console.log(`[GoalService] Finding goals in repo for user: ${userId}`);
        const result = await goalRepository.findByUserId(userId);
        console.log(`[GoalService] Repo returned ${result.length} goals.`);
        return result;
    },

    async getAllGoals(): Promise<GoalData[]> {
        return goalRepository.findAll();
    },

    async updateGoal(id: string, _userId: string, content: string): Promise<GoalData> {
        // Since content changed, we should regenerate the affirmation
        // Note: Repository update currently only updates content. We need to update it to support affirmation.
        const existingGoals = await goalRepository.findAll(); // This is inefficient but keep it simple for now
        const goal = existingGoals.find(g => g.id === id);

        const affirmation = await openaiService.generateGoalAffirmation(content, goal?.deadline || undefined);

        return goalRepository.update(id, content, affirmation);
    },

    async deleteGoal(id: string, _userId: string): Promise<GoalData> {
        return goalRepository.delete(id);
    },
};
