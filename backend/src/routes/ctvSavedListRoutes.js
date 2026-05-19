import express from 'express';
import { savedListController } from '../controllers/collaborator/savedListController.js';
import { authenticateCTV } from '../middleware/ctvAuth.js';

const router = express.Router();

// Playlist CRUD
router.get('/', authenticateCTV, savedListController.getList);
router.post('/', authenticateCTV, savedListController.create);
// Jobs trong list (nested — đặt trước /:listId để match đúng)
router.get('/:listId/jobs', authenticateCTV, savedListController.getJobs);
router.post('/:listId/jobs', authenticateCTV, savedListController.addJob);
router.delete('/:listId/jobs/:jobId', authenticateCTV, savedListController.removeJob);
router.put('/:listId/jobs/reorder', authenticateCTV, savedListController.reorderJobs);
router.get('/:listId', authenticateCTV, savedListController.getById);
router.put('/:listId', authenticateCTV, savedListController.update);
router.delete('/:listId', authenticateCTV, savedListController.remove);

export default router;
