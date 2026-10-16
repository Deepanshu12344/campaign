import { Router, Request, Response } from 'express';
import { ESTIMATE_CONFIG } from '@campaigns/shared';

const router = Router();

router.get('/estimates', (_req: Request, res: Response) => {
  res.status(200).json(ESTIMATE_CONFIG);
});

export default router;
