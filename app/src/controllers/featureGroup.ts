import { featureGroupService } from '../services';

import type { NextFunction, Request, Response } from 'express';

const controller = {
  getFeatureGroups: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const response: unknown = await featureGroupService.getFeatureGroups();
      res.status(200).send(response);
    } catch (e: unknown) {
      next(e);
    }
  },

  createFeatureGroup: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const response: unknown = await featureGroupService.createFeatureGroup(req.body.name);
      res.status(200).send(response);
    } catch (e: unknown) {
      next(e);
    }
  },

  deleteFeatureGroup: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const response: unknown = await featureGroupService.deleteFeatureGroup(parseInt(req.params.featureGroupId));
      res.status(200).send(response);
    } catch (e: unknown) {
      next(e);
    }
  }
};

export default controller;
