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

export const goalService = {
    async createGoal(userId: string, input: CreateGoalInput): Promise<GoalData> {
        // Enforce hourly limit of max 5 goals per user
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const count = await goalRepository.countByUserAndSince(userId, oneHourAgo);
        if (count >= 5) {
            throw RateLimitError.tooManyRequests(3600);
        }

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
        // Enforce hourly limit of max 5 goals per user
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const count = await goalRepository.countByUserAndSince(userId, oneHourAgo);
        if (count + goals.length > 5) {
            throw RateLimitError.tooManyRequests(3600);
        }

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
