import { Router } from 'express';

const router = Router();

// Placeholder routes - will be implemented in later tasks
router.post('/', (_req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

router.post('/:id/bid', (_req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

export default router;
