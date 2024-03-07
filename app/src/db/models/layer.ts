import { Prisma } from '@prisma/client';

import type { Stamps } from '../stamps';
import type { Layer } from '../../types/Layer';

// Define types
const _layer = Prisma.validator<Prisma.layerDefaultArgs>()({});

type PrismaRelationLayer = Omit<Prisma.layerGetPayload<typeof _layer>, keyof Stamps>;

export default {
  toPrismaModel(input: Layer): PrismaRelationLayer {
    return {
      layer_id: input.layerId,
      name: input.name
    };
  },

  fromPrismaModel(input: PrismaRelationLayer | null): Layer | null {
    if (!input) return null;

    return {
      layerId: input.layer_id,
      name: input.name
    };
  }
};
