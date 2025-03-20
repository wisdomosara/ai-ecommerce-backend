const express = require('express');
const router = express.Router();
const Store = require('../../models/Store');
const { isAuth, isAdmin } = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');

// @route   GET api/stores
// @desc    Get all stores
// @access  Public
router.get('/', async (req, res) => {
  try {
    const stores = await Store.find().sort({ name: 1 });
    res.json(stores);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/stores/:id
// @desc    Get store by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }
    res.json(store);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Store not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   POST api/stores
// @desc    Create a store
// @access  Private
router.post(
  '/',
  [
    isAuth,
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
      const {
        name,
        description,
        logo,
        banner,
        address,
        contactEmail,
        contactPhone,
        socialMedia
      } = req.body;

      // Check if store already exists
      const existingStore = await Store.findOne({ name });
      if (existingStore) {
        return res.status(400).json({ message: 'Store already exists' });
      }

      // Create new store
      const newStore = new Store({
        name,
        description,
        logo,
        banner,
        owner: req.user.id,
        address,
        contactEmail,
        contactPhone,
        socialMedia
      });

      const store = await newStore.save();
      res.json(store);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   PUT api/stores/:id
// @desc    Update a store
// @access  Private
router.put('/:id', isAuth, async (req, res) => {
  try {
    const {
      name,
      description,
      logo,
      banner,
      address,
      contactEmail,
      contactPhone,
      socialMedia,
      isVerified
    } = req.body;

    // Find store
    const store = await Store.findById(req.params.id);
    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    // Verify ownership or admin status
    if (store.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Update fields
    if (name) store.name = name;
    if (description !== undefined) store.description = description;
    if (logo !== undefined) store.logo = logo;
    if (banner !== undefined) store.banner = banner;
    if (address !== undefined) store.address = address;
    if (contactEmail !== undefined) store.contactEmail = contactEmail;
    if (contactPhone !== undefined) store.contactPhone = contactPhone;
    if (socialMedia !== undefined) store.socialMedia = socialMedia;
    if (isVerified !== undefined && req.user.role === 'admin') {
      store.isVerified = isVerified;
    }
    store.updatedAt = Date.now();

    await store.save();
    res.json(store);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Store not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/stores/:id
// @desc    Delete a store
// @access  Private
router.delete('/:id', isAuth, async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    // Verify ownership or admin status
    if (store.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await store.remove();
    res.json({ message: 'Store removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Store not found' });
    }
    res.status(500).send('Server error');
  }
});

module.exports = router;
