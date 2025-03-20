const express = require('express');
const router = express.Router();
const Category = require('../../models/Category');
const { isAuth, isAdmin } = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');

// @route   GET api/categories
// @desc    Get all categories
// @access  Public
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/categories/:id
// @desc    Get category by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(category);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   POST api/categories
// @desc    Create a category
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
      const { name, description, parent, image } = req.body;

      // Check if category already exists
      const existingCategory = await Category.findOne({ name });
      if (existingCategory) {
        return res.status(400).json({ message: 'Category already exists' });
      }

      // Create new category
      const newCategory = new Category({
        name,
        description,
        parent,
        image,
      });

      const category = await newCategory.save();
      res.json(category);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   PUT api/categories/:id
// @desc    Update a category
// @access  Private/Admin
router.put('/:id', isAuth, isAdmin, async (req, res) => {
  try {
    const { name, description, parent, image, isActive } = req.body;

    // Find category
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Update fields
    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    if (parent !== undefined) category.parent = parent;
    if (image !== undefined) category.image = image;
    if (isActive !== undefined) category.isActive = isActive;
    category.updatedAt = Date.now();

    await category.save();
    res.json(category);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/categories/:id
// @desc    Delete a category
// @access  Private/Admin
router.delete('/:id', isAuth, isAdmin, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await category.remove();
    res.json({ message: 'Category removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.status(500).send('Server error');
  }
});

module.exports = router;