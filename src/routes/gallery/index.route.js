const express = require('express');
const router = express.Router();
const galleryController = require('../../controllers/gallery/index.controller');
const { verifyToken, isAdmin } = require('../../middleware/auth');
const upload = require('../../middleware/upload');

// Public Routes (user biasa / buyer bisa akses)
router.get('/', verifyToken, galleryController.getGalleries);
router.get('/:id', verifyToken, galleryController.getGalleryById);

// Admin Routes (hanya admin bisa akses)
router.post('/', verifyToken, isAdmin, upload.single('image'), galleryController.createGallery);
router.put('/:id', verifyToken, isAdmin, galleryController.updateGallery);
router.delete('/:id', verifyToken, isAdmin, galleryController.deleteGallery);

module.exports = router;
