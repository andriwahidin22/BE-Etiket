const express = require('express');
const router = express.Router();
const galleryController = require('../../controllers/gallery/index.controller');
const { isAdmin } = require('../../middleware/auth');
const upload = require('../../middleware/upload');


// Endpoint CREATE Gallery dengan upload foto
router.post('/', upload.single('image'), galleryController.createGallery);

// Route CRUD Gallery
router.post('/', isAdmin, galleryController.createGallery);
router.get('/', galleryController.getGalleries);
router.get('/:id', galleryController.getGalleryById);
router.put('/:id', isAdmin, galleryController.updateGallery);
router.delete('/:id', isAdmin, galleryController.deleteGallery);

module.exports = router;
