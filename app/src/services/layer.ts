import prisma from '../db/dataConnection';
import { layer } from '../db/models';

const service = {
  getLayers: async () => {
    const response = await prisma.layer.findMany();

    return response.map((x) => layer.fromPrismaModel(x));
  },

  createLayer: async (name: string) => {
    const response = await prisma.layer.create({
      data: {
        name: name
      }
    });

    return layer.fromPrismaModel(response);
  },

  deleteLayer: async (layerId: number) => {
    const response = await prisma.layer.delete({
      where: {
        layer_id: layerId
      }
    });

    return layer.fromPrismaModel(response);
  }
};

export default service;
