import { Prisma } from '@prisma/client';

import type { Stamps } from '../stamps';
import type { Feature } from '../../types/Feature';

// Define types
const _feature = Prisma.validator<Prisma.featureDefaultArgs>()({});

type PrismaRelationFeature = Omit<Prisma.featureGetPayload<typeof _feature>, keyof Stamps>;

export default {
  toPrismaModel(input: Feature): PrismaRelationFeature {
    return {
      feature_id: input.featureId,
      feature_group_id: input.featureGroupId,
      geo_type: input.geoType,
      geo_json: input.geoJson
    };
  },

  fromPrismaModel(input: PrismaRelationFeature | null): Feature | null {
    if (!input) return null;

    return {
      featureId: input.feature_id,
      featureGroupId: input.feature_group_id,
      geoType: input.geo_type,
      geoJson: input.geo_json as object
    };
  }
};
