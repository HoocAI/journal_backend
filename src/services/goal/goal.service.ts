import { goalRepository, type GoalData, type CreateGoalInput as RepoCreateInput } from '../../repositories/goal.repository';
import { openaiService } from '../ai/openai.service';
import { NotFoundError } from '../../utils/errors';

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

    async updateGoal(id: string, userId: string, content: string): Promise<GoalData> {
        const goal = await goalRepository.findByIdAndUserId(id, userId);
        if (!goal) {
            throw new NotFoundError('Goal not found');
        }

        const affirmation = await openaiService.generateGoalAffirmation(content, goal?.deadline || undefined);

        return goalRepository.update(id, userId, content, affirmation);
    },

    async deleteGoal(id: string, userId: string): Promise<GoalData> {
        const goal = await goalRepository.findByIdAndUserId(id, userId);
        if (!goal) {
            throw new NotFoundError('Goal not found');
        }

        return goalRepository.delete(id, userId);
    },
};
