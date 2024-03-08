import { appAxios } from './interceptors';

export default {
  getFeatures() {
    return appAxios().get('feature');
  },

  createFeature(data: any) {
    return appAxios().put('feature', data);
  },

  deleteFeature(featureId: number) {
    return appAxios().delete(`feature/${featureId}`);
  }
};
