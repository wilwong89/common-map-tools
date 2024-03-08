import prisma from '../db/dataConnection';
import { feature_group } from '../db/models';

const service = {
  getFeatureGroups: async () => {
    const response = await prisma.feature_group.findMany();

    return response.map((x) => feature_group.fromPrismaModel(x));
  },

  createFeatureGroup: async (name: string) => {
    const response = await prisma.feature_group.create({
      data: {
        name: name
      }
    });

    return feature_group.fromPrismaModel(response);
  },

  deleteFeatureGroup: async (featureGroupId: number) => {
    const response = await prisma.feature_group.delete({
      where: {
        feature_group_id: featureGroupId
      }
    });

    return feature_group.fromPrismaModel(response);
  }
};

export default service;
