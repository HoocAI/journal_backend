
import { Router } from 'express';
import { paymentService } from '../services/payment/payment.service';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Submit a premium request
router.post('/request', requireAuth(), async (req, res, next) => {
    try {
        const userId = req.user!.userId;
        const { transactionId, amount, months, details } = req.body;
        
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
