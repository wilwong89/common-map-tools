import { GeoJSON } from 'leaflet';

import type { Geometry } from 'geojson';

export type Layer = {
  layerId?: number;
  name: string;
  layer: GeoJSON;
};
