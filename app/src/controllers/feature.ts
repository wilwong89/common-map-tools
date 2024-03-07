import { featureService } from '../services';

import type { NextFunction, Request, Response } from 'express';

const controller = {
  getFeatures: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const response: unknown = await featureService.getFeatures();
      res.status(200).send(response);
    } catch (e: unknown) {
      next(e);
    }
  },

  createFeature: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const response: unknown = await featureService.createFeature();
      res.status(200).send(response);
    } catch (e: unknown) {
      next(e);
    }
  },

  deleteFeature: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const response: unknown = await featureService.deleteFeature();
      res.status(200).send(response);
    } catch (e: unknown) {
      next(e);
    }
  }
};

export default controller;
