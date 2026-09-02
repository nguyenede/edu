const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');
const { protect } = require('../middlewares/auth.middleware');
const { uploadDocument } = require('../middlewares/upload.middleware');
const validation = require('../middlewares/validation.middleware');

router.use(protect);

router.post('/document', uploadDocument.single('document'), validation.uploadOwner, uploadController.uploadDocument);
router.get('/files', uploadController.getFiles);
router.get('/files/:id/download', ...validation.idParam(), uploadController.downloadFile);
router.delete('/files/:id', ...validation.idParam(), uploadController.deleteFile);

module.exports = router;
