import express from 'express';
import { layerController } from '../../controllers';
import { requireSomeAuth } from '../../middleware/requireSomeAuth';

import type { NextFunction, Request, Response } from 'express';

const router = express.Router();
router.use(requireSomeAuth);

router.get('/', (req: Request, res: Response, next: NextFunction): void => {
  layerController.getLayers(req, res, next);
});

router.put('/', (req: Request, res: Response, next: NextFunction): void => {
  layerController.createLayer(req, res, next);
});

router.delete('/:layerId', (req: Request, res: Response, next: NextFunction): void => {
  layerController.deleteLayer(req, res, next);
});

export default router;
