import { currentUser } from '../../middleware/authentication';
import express from 'express';
import feature from './feature';
import featureGroup from './featureGroup';

const router = express.Router();
router.use(currentUser);

// Base v1 Responder
router.get('/', (_req, res) => {
  res.status(200).json({
    endpoints: ['/feature', '/featureGroup']
  });
});

/** Config Router */
router.use('/feature', feature);
router.use('/featureGroup', featureGroup);

export default router;
