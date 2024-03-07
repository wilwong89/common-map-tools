import express from 'express';
import { featureController } from '../../controllers';
import { requireSomeAuth } from '../../middleware/requireSomeAuth';

import type { NextFunction, Request, Response } from 'express';

const router = express.Router();
router.use(requireSomeAuth);

router.get('/', (req: Request, res: Response, next: NextFunction): void => {
  featureController.getFeatures(req, res, next);
});

router.put('/', (req: Request, res: Response, next: NextFunction): void => {
  featureController.createFeature(req, res, next);
});

router.delete('/', (req: Request, res: Response, next: NextFunction): void => {
  featureController.deleteFeature(req, res, next);
});

export default router;
