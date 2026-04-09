import { goalRepository, type GoalData, type CreateGoalInput as RepoCreateInput } from '../../repositories/goal.repository';

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
        return goalRepository.create({
            userId,
            ...input,
            deadline: input.deadline ? new Date(input.deadline) : undefined,
        });
    },

    async updateCategoryGoals(userId: string, type: string, goals: Omit<CreateGoalInput, 'type'>[]): Promise<GoalData[]> {
        return goalRepository.overwriteCategoryGoals(
            userId,
            type,
            goals.map(g => ({
                ...g,
                deadline: g.deadline ? new Date(g.deadline) : undefined,
            }))
        );
    },

    async getUserGoals(userId: string): Promise<GoalData[]> {
        return goalRepository.findByUserId(userId);
    },

    async getAllGoals(): Promise<GoalData[]> {
        return goalRepository.findAll();
    },

    async updateGoal(id: string, _userId: string, content: string): Promise<GoalData> {
        // Ownership check should ideally be handled by middleware or repository check
        return goalRepository.update(id, content);
    },

    async deleteGoal(id: string, _userId: string): Promise<GoalData> {
        return goalRepository.delete(id);
    },
};
