import { prisma } from '../../lib/prisma';
import { NotFoundError, ValidationError } from '../../utils/errors';

export type DimensionName =
    | 'neurological_alignment'
    | 'submodalities_clarity'
    | 'meta_program_drive'
    | 'anchoring_strength'
    | 'internal_alignment'
    | 'strategy_pattern'
    | 'language_filters'
    | 'timeline_orientation'
    | 'ecology_balance'
    | 'emotional_state';

const QUICK_WEIGHTS: Record<DimensionName, number> = {
    neurological_alignment: 0.15,
    submodalities_clarity: 0.10,
    meta_program_drive: 0.10,
    anchoring_strength: 0.10,
    internal_alignment: 0.10,
    strategy_pattern: 0.10,
    language_filters: 0.10,
    timeline_orientation: 0.10,
    ecology_balance: 0.075,
    emotional_state: 0.075,
};

const ADVANCED_WEIGHTS: Record<DimensionName, number> = {
    neurological_alignment: 0.15,
    submodalities_clarity: 0.10,
    meta_program_drive: 0.10,
    anchoring_strength: 0.08,
    internal_alignment: 0.15,
    strategy_pattern: 0.12,
    language_filters: 0.08,
    timeline_orientation: 0.08,
    ecology_balance: 0.07,
    emotional_state: 0.07,
};

// Quick Assessment CTAs
const QUICK_CTAS = [
    "This result reflects your surface alignment. Advanced analysis explores the deeper layers behind it. 👉 Explore Deeper Insights",
    "Sometimes the biggest shifts happen at the identity level — Advanced Assessment reveals what’s happening beneath your answers. 👉 Unlock Advanced Analysis",
    "You’ve taken the first step by checking your alignment. Ready to discover what’s shaping your journey at a deeper level? 👉 Go Deeper",
    "Many users are surprised by what Advanced Assessment reveals… especially the hidden emotional patterns. 👉 Reveal My Hidden Patterns",
    "Your current score is just the beginning. Advanced insights help you understand why your alignment looks this way. 👉 See Advanced Insights",
    "When thoughts, emotions, and identity align, growth feels natural. Advanced Assessment maps this deeper alignment. 👉 Check Advanced Alignment",
    "You’ve already created awareness — this is the perfect moment to explore your deeper alignment. 👉 Continue to Advanced",
    "Surface awareness creates clarity… deep awareness creates transformation. 👉 Unlock My Deep Analysis",
    "There’s more to your alignment story than numbers alone. Advanced Assessment reveals the patterns behind your results. 👉 Reveal My Full Report"
];

// Advanced Assessment CTAs
const ADVANCED_CTAS = [
    "Your results reveal valuable insights — let’s explore them deeper in a personalized consultation.",
    "You’ve seen your alignment score — now let’s work on improving it together.",
    "Ready to turn these insights into real progress? Book your consultation now.",
    "Your assessment shows potential — let’s unlock it with a guided session.",
    "If you’re serious about your goal, the next step is a focused consultation.",
    "Numbers show the pattern — a session reveals the strategy.",
    "Let’s identify what’s truly holding you back and clear it together.",
    "Your alignment can improve faster with expert guidance — schedule your session.",
    "This score is the starting point — transformation begins in consultation.",
    "Want clarity tailored specifically to your goal? Book a personal session.",
    "You’ve built awareness — now let’s build a breakthrough.",
    "Ready to strengthen your weakest alignment area? Let’s work on it live.",
    "A personalized NLP session can accelerate your manifestation readiness.",
    "Your growth deserves focused attention — book your consultation today.",
    "Let’s convert insight into action with a structured guidance session.",
    "If you want faster progress, expert intervention makes the difference.",
    "You’ve seen your gaps — now let’s strategically close them.",
    "This is the perfect moment to move from self-analysis to guided execution.",
    "Your alignment journey can go deeper — schedule your breakthrough session.",
    "Take the next powerful step — book your personalized consultation now."
];

function getQuickResultLevels(score: number): { customerLevel: string; adminLevel: string; shortInsight: string } {
    if (score >= 85) {
        return { customerLevel: "🔥 High Alignment", adminLevel: "High Alignment", shortInsight: "You are strongly aligned with your goal." };
    } else if (score >= 65) {
        return { customerLevel: "🙂 Growth Zone", adminLevel: "Progress Zone", shortInsight: "You are making good progress, but there's room for growth." };
    } else if (score >= 45) {
        return { customerLevel: "🌱 Improvement Zone", adminLevel: "Inner Conflict", shortInsight: "You have some inner conflict regarding this goal." };
    } else {
        return { customerLevel: "🚀 Fresh Start Zone", adminLevel: "Identity Mismatch", shortInsight: "There seems to be an identity mismatch. Let's start fresh." };
    }
}

function getAdvancedResultLevels(score: number): { customerLevel: string; adminLevel: string; shortInsight: string } {
    if (score >= 90) {
        return { customerLevel: "🔵 Ready to manifest", adminLevel: "Ready to manifest", shortInsight: "You are fully aligned and ready to manifest your goal." };
    } else if (score >= 75) {
        return { customerLevel: "🟢 Alignment Zone", adminLevel: "Alignment Zone", shortInsight: "High probability of success, strong alignment." };
    } else if (score >= 60) {
        return { customerLevel: "🟡 Activation Zone", adminLevel: "Activation Zone", shortInsight: "Manifestation possible with structure and focus." };
    } else if (score >= 40) {
        return { customerLevel: "🟠 Conflict Zone", adminLevel: "Conflict Zone", shortInsight: "Desire is present but belief or strategy is weak." };
    } else {
        return { customerLevel: "🔴 Internal Block Zone", adminLevel: "Internal Block Zone", shortInsight: "High subconscious resistance. Let's work on clearing blocks." };
    }
}

const formatDimensionKey = (key: DimensionName) => {
    return key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

export const assessmentService = {

    async submitQuickAssessment(userId: string, goalId: string, answers: Record<DimensionName, number>) {
        // Validate Goal
        const goal = await prisma.goal.findUnique({ where: { id: goalId } });
        if (!goal || goal.userId !== userId) {
            throw new NotFoundError("Goal not found or does not belong to user");
        }

        let finalScore = 0;
        const dimensionPercents: Record<string, number> = {};
        
        let topStrength = { key: '', val: -1 };
        let mainGap = { key: '', val: 101 };

        // Process answers
        for (const [key, answer] of Object.entries(answers)) {
            const dimKey = key as DimensionName;
            const percent = (answer / 10) * 100;
            dimensionPercents[`${dimKey}_percent`] = percent;

            const weighted = percent * QUICK_WEIGHTS[dimKey];
            finalScore += weighted;

            if (percent > topStrength.val) topStrength = { key: dimKey, val: percent };
            if (percent < mainGap.val) mainGap = { key: dimKey, val: percent };
        }

        const levels = getQuickResultLevels(finalScore);

        // Optional Admin NLP Metrics
        const identityCongruencyIndex = ((dimensionPercents['neurological_alignment_percent'] || 0) + (dimensionPercents['internal_alignment_percent'] || 0)) / 2;
        const statePowerIndex = ((dimensionPercents['anchoring_strength_percent'] || 0) + (dimensionPercents['emotional_state_percent'] || 0)) / 2;
        const clarityIndex = ((dimensionPercents['submodalities_clarity_percent'] || 0) + (dimensionPercents['timeline_orientation_percent'] || 0) + (dimensionPercents['strategy_pattern_percent'] || 0)) / 3;

        const adminMetrics = {
            identity_congruency_index: identityCongruencyIndex,
            state_power_index: statePowerIndex,
            clarity_index: clarityIndex
        };

        const dimensionScores = {
            ...dimensionPercents,
            admin_metrics: adminMetrics
        };

        const result = await prisma.assessmentResult.create({
            data: {
                userId,
                goalId,
                type: 'QUICK_MANIFESTATION',
                finalScore,
                customerLevel: levels.customerLevel,
                adminLevel: levels.adminLevel,
                dimensionScores: dimensionScores as any
            }
        });

        // Pick a random CTA
        const cta = QUICK_CTAS[Math.floor(Math.random() * QUICK_CTAS.length)];

        return {
            id: result.id,
            goalName: goal.content,
            finalScore,
            manifestationReadinessPercent: finalScore,
            resultLevel: levels.customerLevel,
            topStrength: formatDimensionKey(topStrength.key as DimensionName),
            improvementArea: formatDimensionKey(mainGap.key as DimensionName),
            shortInsight: levels.shortInsight,
            cta,
            secondaryButton: "Maybe Later",
            adminMetrics
        };
    },

    async submitAdvancedAssessment(userId: string, goalId: string, sectionAnswers: Record<DimensionName, number[]>) {
        const goal = await prisma.goal.findUnique({ where: { id: goalId } });
        if (!goal || goal.userId !== userId) {
            throw new NotFoundError("Goal not found or does not belong to user");
        }

        let finalScore = 0;
        const dimensionPercents: Record<string, number> = {};
        
        let topStrength = { key: '', val: -1 };
        let mainGap = { key: '', val: 101 };

        for (const [key, answers] of Object.entries(sectionAnswers)) {
            if (!Array.isArray(answers) || answers.length !== 5) {
                throw new ValidationError(`Each section must have exactly 5 answers. Invalid length for ${key}`);
            }

            const totalScore = answers.reduce((sum, val) => sum + val, 0);
            if (totalScore < 5 || totalScore > 50) {
                 throw new ValidationError(`Answers out of bounds for section ${key}`);
            }

            const dimKey = key as DimensionName;
            const percent = ((totalScore - 5) / 45) * 100;
            dimensionPercents[`${dimKey}_percent`] = percent;

            const weighted = percent * ADVANCED_WEIGHTS[dimKey];
            finalScore += weighted;

            if (percent > topStrength.val) topStrength = { key: dimKey, val: percent };
            if (percent < mainGap.val) mainGap = { key: dimKey, val: percent };
        }

        const levels = getAdvancedResultLevels(finalScore);

        const identityCongruencyIndex = ((dimensionPercents['neurological_alignment_percent'] || 0) + (dimensionPercents['internal_alignment_percent'] || 0)) / 2;
        const statePowerIndex = ((dimensionPercents['anchoring_strength_percent'] || 0) + (dimensionPercents['emotional_state_percent'] || 0)) / 2;
        const clarityIndex = ((dimensionPercents['submodalities_clarity_percent'] || 0) + (dimensionPercents['timeline_orientation_percent'] || 0) + (dimensionPercents['strategy_pattern_percent'] || 0)) / 3;

        const adminMetrics = {
            identity_congruency_index: identityCongruencyIndex,
            state_power_index: statePowerIndex,
            clarity_index: clarityIndex
        };

        const dimensionScores = {
            ...dimensionPercents,
            admin_metrics: adminMetrics
        };

        const result = await prisma.assessmentResult.create({
            data: {
                userId,
                goalId,
                type: 'ADVANCED_MANIFESTATION',
                finalScore,
                customerLevel: levels.customerLevel,
                adminLevel: levels.adminLevel,
                dimensionScores: dimensionScores as any
            }
        });

        const cta = ADVANCED_CTAS[Math.floor(Math.random() * ADVANCED_CTAS.length)];

        return {
            id: result.id,
            goalName: goal.content,
            finalScore,
            manifestationReadinessPercent: finalScore,
            resultLevel: levels.customerLevel,
            topStrength: formatDimensionKey(topStrength.key as DimensionName),
            improvementArea: formatDimensionKey(mainGap.key as DimensionName),
            shortInsight: levels.shortInsight,
            cta,
            adminMetrics
        };
    },

    async getHistory(userId: string) {
        return prisma.assessmentResult.findMany({
            where: { userId },
            include: {
                 Goal: {
                     select: { content: true }
                 }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

};
