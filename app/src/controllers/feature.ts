import { featureService } from '../services';

import type { NextFunction, Request, Response } from 'express';

const controller = {
  getFeatures: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const response = await featureService.getFeatures();
      /* @ts-expect-error Property 'properties' does not exist on type 'object'. ts(2339)*/
      response.forEach((x) => (x.geoJson.properties.featureId = x.featureId));
      res.status(200).send(response);
    } catch (e: unknown) {
      next(e);
    }
  },

  createFeature: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const response = await featureService.createFeature(req.body);
      /* @ts-expect-error Property 'properties' does not exist on type 'object'. ts(2339)*/
      response.geoJson.properties.featureId = response.featureId;
      res.status(200).send(response);
    } catch (e: unknown) {
      next(e);
    }
  },

  deleteFeature: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const response = await featureService.deleteFeature(parseInt(req.params.featureId));
      res.status(200).send(response);
    } catch (e: unknown) {
      next(e);
    }
  }
};

export default controller;
