
import { Router } from 'express';
import { z } from 'zod';
import { paymentService } from '../services/payment/payment.service';
import { requireAuth } from '../middleware/auth.middleware';
import { ValidationError } from '../utils/errors';

const router = Router();

const requestPremiumSchema = z.object({
    transactionId: z.string().min(1).optional(),
    amount: z.number().positive().finite().optional(),
    months: z.number().int().min(1).max(60).optional(),
    details: z.string().max(1000).optional(),
});

// Submit a premium request
router.post('/request', requireAuth(), async (req, res, next) => {
    try {
        const userId = req.user!.userId;
        const parseResult = requestPremiumSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const { transactionId, amount, months, details } = parseResult.data;
        
        const request = await paymentService.requestPremium({
            userId,
            transactionId,
            amount,
            months,
            details,
        });
        
        res.status(201).json(request);
    } catch (error) {
        next(error);
    }
});

// View own requests
router.get('/my-requests', requireAuth(), async (req, res, next) => {
    try {
        const userId = req.user!.userId;
        const requests = await paymentService.getMyRequests(userId);
        res.json(requests);
    } catch (error) {
        next(error);
    }
});

export default router;
