import { goalRepository, type GoalData } from '../../repositories/goal.repository';

export interface CreateGoalInput {
    type: string;
    content: string;
}

export const goalService = {
    async createGoal(userId: string, input: CreateGoalInput): Promise<GoalData> {
        return goalRepository.create({
            userId,
            ...input
        });
    },

    async getUserGoals(userId: string): Promise<GoalData[]> {
        return goalRepository.findByUserId(userId);
    },

    async updateGoal(id: string, userId: string, content: string): Promise<GoalData> {
        // Basic ownership check can be added here or in middleware
        return goalRepository.update(id, content);
    },

    async deleteGoal(id: string, userId: string): Promise<GoalData> {
        return goalRepository.delete(id);
    },
};
