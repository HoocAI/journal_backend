import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError } from '../utils/errors';
import { assessmentService, DimensionName } from '../services/assessment/assessment.service';

const router = Router();

const dimensions = [
    'neurological_alignment',
    'submodalities_clarity',
    'meta_program_drive',
    'anchoring_strength',
    'internal_alignment',
    'strategy_pattern',
    'language_filters',
    'timeline_orientation',
    'ecology_balance',
    'emotional_state'
] as const;

const quickAssessmentSchema = z.object({
    goalId: z.string().uuid(),
    answers: z.object(
        dimensions.reduce((acc, dim) => ({
            ...acc,
            [dim]: z.number().min(1).max(10)
        }), {} as Record<string, z.ZodNumber>)
    )
});

const advancedAssessmentSchema = z.object({
    goalId: z.string().uuid(),
    sectionAnswers: z.object(
        dimensions.reduce((acc, dim) => ({
            ...acc,
            [dim]: z.array(z.number().min(1).max(10)).length(5)
        }), {} as Record<string, z.ZodArray<z.ZodNumber>>)
    )
});

// Apply auth middleware to all routes
router.use(requireAuth());

// POST /api/v1/assessments/quick
router.post(
    '/quick',
    asyncHandler(async (req: Request, res: Response) => {
        const parseResult = quickAssessmentSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const result = await assessmentService.submitQuickAssessment(
            req.user!.userId,
            parseResult.data.goalId,
            parseResult.data.answers as Record<DimensionName, number>
        );

        res.status(201).json(result);
    })
);

// POST /api/v1/assessments/advanced
router.post(
    '/advanced',
    asyncHandler(async (req: Request, res: Response) => {
        const parseResult = advancedAssessmentSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const result = await assessmentService.submitAdvancedAssessment(
            req.user!.userId,
            parseResult.data.goalId,
            parseResult.data.sectionAnswers as Record<DimensionName, number[]>
        );

        res.status(201).json(result);
    })
);

// GET /api/v1/assessments/history
router.get(
    '/history',
    asyncHandler(async (req: Request, res: Response) => {
        const history = await assessmentService.getHistory(req.user!.userId);
        res.status(200).json(history);
    })
);

export { router as assessmentRouter };
