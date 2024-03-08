import * as geojson from 'geojson';

export type Feature = {
  featureId: number;
  featureGroupId: number;
  geoType: string;
  geoJson: geojson.GeoJSON;
};
