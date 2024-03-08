import { Prisma } from '@prisma/client';

import type { Stamps } from '../stamps';
import type { FeatureGroup } from '../../types/FeatureGroup';

// Define types
const _featureGroup = Prisma.validator<Prisma.feature_groupDefaultArgs>()({});

type PrismaRelationFeatureGroup = Omit<Prisma.feature_groupGetPayload<typeof _featureGroup>, keyof Stamps>;

export default {
  toPrismaModel(input: FeatureGroup): PrismaRelationFeatureGroup {
    return {
      feature_group_id: input.featureGroupId,
      name: input.name
    };
  },

  fromPrismaModel(input: PrismaRelationFeatureGroup | null): FeatureGroup | null {
    if (!input) return null;

    return {
      featureGroupId: input.feature_group_id,
      name: input.name
    };
  }
};
