const express = require('express');
const router = express.Router();
const { createEbook, getEbooks, updateEbook, deleteEbook, likeEbook, getTopEbooks } = require('../controllers/ebookController');
const { protect, admin } = require('../middleware/auth');
const { uploadCoverImage } = require('../middleware/upload');

router.get('/', getEbooks);

// Public endpoint to fetch top liked ebooks
router.get('/top', getTopEbooks);

router.post('/', protect, admin, uploadCoverImage, createEbook);

// Public endpoint to like an ebook (increment count)
router.post('/:id/like', likeEbook);

router.put('/:id', protect, admin, uploadCoverImage, updateEbook);

router.delete('/:id', protect, admin, deleteEbook);

module.exports = router;
