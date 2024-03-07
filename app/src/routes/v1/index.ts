import { currentUser } from '../../middleware/authentication';
import express from 'express';
import feature from './feature';
import layer from './layer';

const router = express.Router();
router.use(currentUser);

// Base v1 Responder
router.get('/', (_req, res) => {
  res.status(200).json({
    endpoints: ['/feature', '/layer']
  });
});

/** Config Router */
router.use('/feature', feature);
router.use('/layer', layer);

export default router;
