import express from 'express';
import { featureGroupController } from '../../controllers';
import { requireSomeAuth } from '../../middleware/requireSomeAuth';

import type { NextFunction, Request, Response } from 'express';

const router = express.Router();
// router.use(requireSomeAuth);

router.get('/', (req: Request, res: Response, next: NextFunction): void => {
  featureGroupController.getFeatureGroups(req, res, next);
});

router.put('/', (req: Request, res: Response, next: NextFunction): void => {
  featureGroupController.createFeatureGroup(req, res, next);
});

router.delete('/:featureGroupId', (req: Request, res: Response, next: NextFunction): void => {
  featureGroupController.deleteFeatureGroup(req, res, next);
});

export default router;
