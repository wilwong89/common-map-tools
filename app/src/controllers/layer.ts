import { layerService } from '../services';

import type { NextFunction, Request, Response } from 'express';

const controller = {
  getLayers: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const response: unknown = await layerService.getLayers();
      res.status(200).send(response);
    } catch (e: unknown) {
      next(e);
    }
  },

  createLayer: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const response: unknown = await layerService.createLayer(req.body.name);
      res.status(200).send(response);
    } catch (e: unknown) {
      next(e);
    }
  },

  deleteLayer: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const response: unknown = await layerService.deleteLayer(parseInt(req.params.layerId));
      res.status(200).send(response);
    } catch (e: unknown) {
      next(e);
    }
  }
};

export default controller;
