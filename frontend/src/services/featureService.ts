import { appAxios } from './interceptors';

export default {
  /**
   * @function helloWorld
   * Returns the secured view page header
   * @returns {Promise} An axios response
   */
  getFeatures() {
    return appAxios().get('layer');
  },

  createFeature() {
    return appAxios().put('layer');
  },

  deleteFeature() {
    return appAxios().delete('layer');
  }
};
