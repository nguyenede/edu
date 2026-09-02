const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parent.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { requireStudentAccess } = require('../middlewares/access.middleware');
const validation = require('../middlewares/validation.middleware');

router.use(protect);

router.get('/', authorize('admin', 'teacher'), parentController.getParents);
router.get('/student/:id', ...validation.idParam(), requireStudentAccess(), parentController.getStudentParents);
router.post('/', authorize('admin'), validation.parent, parentController.createParent);
router.put('/:id', authorize('admin'), ...validation.idParam(), validation.parent, parentController.updateParent);
router.delete('/:id', authorize('admin'), ...validation.idParam(), parentController.deleteParent);
router.post('/link', authorize('admin'), validation.parentLinkRequest, parentController.linkParent);
router.delete('/unlink/:student_id/:parent_id', authorize('admin'), ...validation.idParam('student_id'), ...validation.idParam('parent_id'), parentController.unlinkParent);

module.exports = router;
