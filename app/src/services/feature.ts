/* eslint-disable no-useless-catch */

const service = {
  getFeatures: async () => {
    try {
      const response = 'Hello world!';
      return response;
    } catch (e: unknown) {
      throw e;
    }
  },

  createFeature: async () => {
    try {
      const response = 'Hello world!';
      return response;
    } catch (e: unknown) {
      throw e;
    }
  },

  deleteFeature: async () => {
    try {
      const response = 'Hello world!';
      return response;
    } catch (e: unknown) {
      throw e;
    }
  }
};

export default service;
