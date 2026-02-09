const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Joi = require('joi');
const cloudinary = require('../config/cloudinary');
const Ebook = require('../models/Ebook');

const DEFAULT_CURRENCY = process.env.DEFAULT_CURRENCY || 'NGN';

// --- Validation Schemas ---
const priceObjectSchema = Joi.object({
  amount: Joi.number().min(0).required(),
  currency: Joi.string().min(1).optional(),
});

const baseSchema = {
  title: Joi.string().min(1).required(),
  author: Joi.string().min(1).required(),
  description: Joi.string().allow('').optional(),
  price: Joi.alternatives().try(Joi.number().min(0), priceObjectSchema).optional(),
  currency: Joi.string().min(1).optional(),
};

const createSchema = Joi.object(baseSchema);
const updateSchema = Joi.object(baseSchema).fork(Object.keys(baseSchema), (schema) => schema.optional()).min(1);

// --- Controller Functions ---

/**
 * @desc    Fetch a single ebook by ID
 * @route   GET /api/ebooks/:id
 */
const getEbookById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // 1. Validate ID format immediately
  if (!mongoose.isValidObjectId(id)) {
    res.status(400);
    throw new Error('Invalid Ebook ID format');
  }

  // 2. Simple, direct query
  const ebook = await Ebook.findById(id).select('-__v');

  // 3. If not found, return 404
  if (!ebook) {
    res.status(404);
    throw new Error('Ebook not found');
  }

  res.json(ebook);
});

/**
 * @desc    Create new ebook
 * @route   POST /api/ebooks
 */
const createEbook = asyncHandler(async (req, res) => {
  const { error, value } = createSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  // Cover Image Logic
  let coverImage = {
    url: req.file?.path || req.body.coverImageUrl || 'https://res.cloudinary.com/dzijdorge/image/upload/v1763476497/hunam_comp_x3mwck.jpg',
    public_id: req.file?.filename || req.body.coverImagePublicId || 'hunam_comp_x3mwck'
  };

  // Standardize Price Structure
  let priceObj = { amount: 0, currency: value.currency || DEFAULT_CURRENCY };
  if (typeof value.price === 'number') {
    priceObj.amount = value.price;
  } else if (value.price && typeof value.price === 'object') {
    priceObj.amount = value.price.amount || 0;
    priceObj.currency = value.price.currency || priceObj.currency;
  }

  const ebook = await Ebook.create({
    title: value.title,
    author: value.author,
    description: value.description || '',
    price: priceObj,
    coverImage,
  });

  res.status(201).json({ message: 'Ebook created successfully!', data: ebook });
});

/**
 * @desc    Update ebook
 * @route   PUT /api/ebooks/:id
 */
const updateEbook = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { error, value } = updateSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const ebook = await Ebook.findById(id);
  if (!ebook) {
    res.status(404);
    throw new Error('Ebook not found');
  }

  // Handle Image Update
  if (req.file) {
    try {
      if (ebook.coverImage?.public_id) {
        await cloudinary.uploader.destroy(ebook.coverImage.public_id);
      }
    } catch (e) {
      console.warn('Cloudinary cleanup failed:', e.message);
    }
    ebook.coverImage = { url: req.file.path, public_id: req.file.filename };
  }

  // Handle Price Object updates
  if (value.price !== undefined) {
    if (typeof value.price === 'number') {
      ebook.price.amount = value.price;
    } else {
      ebook.price.amount = value.price.amount ?? ebook.price.amount;
      ebook.price.currency = value.price.currency ?? ebook.price.currency;
    }
  }
  if (value.currency) ebook.price.currency = value.currency;

  // Update other basic fields
  ['title', 'author', 'description'].forEach(field => {
    if (value[field] !== undefined) ebook[field] = value[field];
  });

  const updatedEbook = await ebook.save();
  res.json(updatedEbook);
});

/**
 * @desc    Get all ebooks
 * @route   GET /api/ebooks
 */
const getEbooks = asyncHandler(async (req, res) => {
  const ebooks = await Ebook.find({}).select('-__v').sort({ createdAt: -1 });
  res.json(ebooks);
});

/**
 * @desc    Delete ebook
 * @route   DELETE /api/ebooks/:id
 */
const deleteEbook = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const ebook = await Ebook.findById(id);
  if (!ebook) {
    res.status(404);
    throw new Error('Ebook not found');
  }

  try {
    if (ebook.coverImage?.public_id) {
      await cloudinary.uploader.destroy(ebook.coverImage.public_id);
    }
  } catch (e) {
    console.warn('Cloudinary delete failed:', e.message);
  }

  await ebook.deleteOne();
  res.json({ message: 'Ebook deleted' });
});

/**
 * @desc    Like an ebook
 * @route   POST /api/ebooks/:id/like
 */
const likeEbook = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const cid = req.body.cid || req.headers['x-cid'];

  if (!cid) {
    res.status(400);
    throw new Error('Missing client identifier');
  }

  const updated = await Ebook.findOneAndUpdate(
    { _id: id, likedBy: { $ne: cid } },
    { $inc: { likes: 1 }, $push: { likedBy: cid } },
    { new: true }
  );

  if (!updated) {
    const ebook = await Ebook.findById(id);
    if (!ebook) {
      res.status(404);
      throw new Error('Ebook not found');
    }
    return res.json({ message: 'Already liked', likes: ebook.likes });
  }

  res.json({ message: 'Liked', likes: updated.likes });
});

const getTopEbooks = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 5;
  const ebooks = await Ebook.find({}).select('-__v').sort({ likes: -1, createdAt: -1 }).limit(limit);
  res.json(ebooks);
});

const getEbookStats = asyncHandler(async (req, res) => {
  const total = await Ebook.countDocuments();
  res.json({ totalBooks: total });
});

module.exports = { createEbook, getEbooks, getEbookById, updateEbook, deleteEbook, likeEbook, getTopEbooks, getEbookStats };