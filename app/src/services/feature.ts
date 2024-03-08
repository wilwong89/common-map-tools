import prisma from '../db/dataConnection';
import { feature } from '../db/models';
import { Feature } from '../types/Feature';

const service = {
  getFeatures: async (): Promise<Feature[]> => {
    const response = await prisma.feature.findMany();

    return response
      .map((x) => feature.fromPrismaModel(x))
      .filter((x) => !!x)
      .map((x) => x as Feature);
  },

  createFeature: async (data: any) => {
    const response = await prisma.feature.create({
      data: {
        feature_group_id: data.properties.featureGroupId,
        geo_type: data.geometry.type,
        geo_json: data
      }
    });

    return feature.fromPrismaModel(response);
  },

  deleteFeature: async (featureId: number) => {
    const response = await prisma.feature.delete({
      where: {
        feature_id: featureId
      }
    });

    return feature.fromPrismaModel(response);
  }
};

export default service;
