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
      layer_id: input.layerId,
      geo_type: input.geoType,
      geo_json: input.geoJson
    };
  },

  fromPrismaModel(input: PrismaRelationFeature | null): Feature | null {
    if (!input) return null;

    return {
      featureId: input.feature_id,
      layerId: input.layer_id,
      geoType: input.geo_type,
      geoJson: input.geo_json
    };
  }
};
