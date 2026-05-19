import express from 'express';
import { savedSearchCriteriaController } from '../controllers/collaborator/savedSearchCriteriaController.js';
import { authenticateCTV } from '../middleware/ctvAuth.js';

const router = express.Router();

router.get('/', authenticateCTV, savedSearchCriteriaController.getList);
router.get('/:id', authenticateCTV, savedSearchCriteriaController.getById);
router.post('/', authenticateCTV, savedSearchCriteriaController.create);
router.put('/:id', authenticateCTV, savedSearchCriteriaController.update);
router.delete('/:id', authenticateCTV, savedSearchCriteriaController.remove);

export default router;
