import { Router } from 'express';

const router = Router();

// Placeholder routes - will be implemented in later tasks
router.post('/initiate', (_req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

router.post('/webhook', (_req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

export default router;
