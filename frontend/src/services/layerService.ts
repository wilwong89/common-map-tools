import { appAxios } from './interceptors';

export default {
  /**
   * @function helloWorld
   * Returns the secured view page header
   * @returns {Promise} An axios response
   */
  getLayers() {
    return appAxios().get('layer');
  },

  createLayer(name: string) {
    return appAxios().put('layer', { name });
  },

  deleteLayer() {
    return appAxios().delete('layer');
  }
};
