
import { Router } from 'express';
import { adminPaymentService } from '../services/admin/admin-payment.service';
import { requireAuth, requireAdmin } from '../middleware';
import { z } from 'zod';
import { ValidationError } from '../utils/errors';

const router = Router();

// Apply admin protection to all routes in this router
router.use(requireAuth());
router.use(requireAdmin());

// Get all pending requests
router.get('/pending', async (req, res, next) => {
    try {
        const requests = await adminPaymentService.getPendingRequests();
        res.json(requests);
    } catch (error) {
        next(error);
    }
});

// Get all requests (including approved/rejected)
router.get('/all', async (req, res, next) => {
    try {
        const requests = await adminPaymentService.getAllRequests();
        res.json(requests);
    } catch (error) {
        next(error);
    }
});

const processRequestSchema = z.object({
    requestId: z.string().uuid(),
    status: z.enum(['APPROVED', 'REJECTED']),
    adminNote: z.string().optional(),
});

// Process a request (Approve/Reject)
router.post('/process', async (req, res, next) => {
    try {
        const parseResult = processRequestSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw ValidationError.invalidInput(parseResult.error.flatten().fieldErrors);
        }

        const { requestId, status, adminNote } = parseResult.data;
        const result = await adminPaymentService.processRequest(requestId, status, adminNote);
        
        res.json(result);
    } catch (error) {
        next(error);
    }
});

export default router;
