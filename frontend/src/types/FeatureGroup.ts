import { GeoJSON } from 'leaflet';

export type FeatureGroup = {
  featureGroupId: number;
  name: string;
  layer: GeoJSON;
};
