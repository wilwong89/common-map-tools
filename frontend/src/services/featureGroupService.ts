import { appAxios } from './interceptors';

export default {
  getFeatureGroups() {
    return appAxios().get('featureGroup');
  },

  createFeatureGroup(name: string) {
    return appAxios().put('featureGroup', { name });
  },

  deleteFeatureGroup(featureGroupId: number) {
    return appAxios().delete(`featureGroup/${featureGroupId}`);
  }
};
