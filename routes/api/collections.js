const express = require('express');
const router = express.Router();
const Collection = require('../../models/Collection');
const { isAuth, isAdmin } = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');

// @route   GET api/collections
// @desc    Get all collections
// @access  Public
router.get('/', async (req, res) => {
  try {
    const collections = await Collection.find().sort({ name: 1 });
    res.json(collections);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/collections/:id
// @desc    Get collection by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }
    res.json(collection);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Collection not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   POST api/collections
// @desc    Create a collection
// @access  Private/Admin
router.post(
  '/',
  [
    isAuth,
    isAdmin,
    [
      check('name', 'Name is required').not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, description, image, startDate, endDate } = req.body;

      // Check if collection already exists
      const existingCollection = await Collection.findOne({ name });
      if (existingCollection) {
        return res.status(400).json({ message: 'Collection already exists' });
      }

      // Create new collection
      const newCollection = new Collection({
        name,
        description,
        image,
        startDate,
        endDate
      });

      const collection = await newCollection.save();
      res.json(collection);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   PUT api/collections/:id
// @desc    Update a collection
// @access  Private/Admin
router.put('/:id', isAuth, isAdmin, async (req, res) => {
  try {
    const { name, description, image, startDate, endDate, isActive } = req.body;

    // Find collection
    const collection = await Collection.findById(req.params.id);
    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    // Update fields
    if (name) collection.name = name;
    if (description !== undefined) collection.description = description;
    if (image !== undefined) collection.image = image;
    if (startDate !== undefined) collection.startDate = startDate;
    if (endDate !== undefined) collection.endDate = endDate;
    if (isActive !== undefined) collection.isActive = isActive;
    collection.updatedAt = Date.now();

    await collection.save();
    res.json(collection);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Collection not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/collections/:id
// @desc    Delete a collection
// @access  Private/Admin
router.delete('/:id', isAuth, isAdmin, async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    await collection.remove();
    res.json({ message: 'Collection removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Collection not found' });
    }
    res.status(500).send('Server error');
  }
});

module.exports = router;
