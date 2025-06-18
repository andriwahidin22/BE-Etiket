const express = require('express');
const router = express.Router();
const galleryController = require('../../controllers/gallery/index.controller');
const { verifyToken, isAdmin } = require('../../middleware/auth');
const upload = require('../../middleware/upload');

// Public Routes (user biasa / buyer bisa akses)
router.get('/', galleryController.getGalleries);
router.get('/:id', galleryController.getGalleryById);

// Admin Routes (hanya admin bisa akses)
router.post(
  '/',
  verifyToken,
  isAdmin,
  upload.single('image'), // 'image' harus sesuai field upload di form
  galleryController.createGallery
);

router.put(
  '/:id',
  verifyToken,
  isAdmin,
  upload.single('image'), // tambahkan upload agar admin bisa update gambar
  galleryController.updateGallery
);

router.delete('/:id', verifyToken, isAdmin, galleryController.deleteGallery);

module.exports = router;
