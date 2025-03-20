const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../../models/User');
const { isAuth, isAdmin } = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');

// @route   GET api/users
// @desc    Get all users (admin only)
// @access  Private/Admin
router.get('/', isAuth, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/users/:id
// @desc    Get user by ID
// @access  Private/Admin
router.get('/:id', isAuth, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   PUT api/users/profile
// @desc    Update user profile
// @access  Private
router.put(
  '/profile',
  [
    isAuth,
    [
      check('name', 'Name is required').not().isEmpty(),
      check('email', 'Please include a valid email').isEmail(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, avatar } = req.body;

    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Update user fields
      user.name = name || user.name;
      user.email = email || user.email;
      user.avatar = avatar || user.avatar;
      user.updatedAt = Date.now();

      // Update password if provided
      if (password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
      }

      await user.save();
      res.json(user);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   PUT api/users/role/:id
// @desc    Update user role (admin only)
// @access  Private/Admin
router.put('/role/:id', isAuth, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = req.body.role || user.role;
    user.updatedAt = Date.now();

    await user.save();
    res.json(user);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   PUT api/users/address
// @desc    Add/Update shipping address
// @access  Private
router.put('/address', isAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { street, city, state, zipCode, country, isDefault } = req.body;
    const newAddress = {
      street,
      city,
      state,
      zipCode,
      country,
      isDefault: isDefault || false,
    };

    // If this is a default address, unset other default addresses
    if (newAddress.isDefault) {
      user.shippingAddresses.forEach((address) => {
        address.isDefault = false;
      });
    }

    // Check if address already exists
    const addressIndex = user.shippingAddresses.findIndex(
      (address) => address.street === street && address.city === city
    );

    if (addressIndex !== -1) {
      // Update existing address
      user.shippingAddresses[addressIndex] = newAddress;
    } else {
      // Add new address
      user.shippingAddresses.push(newAddress);
    }

    user.updatedAt = Date.now();
    await user.save();
    res.json(user.shippingAddresses);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/users/address/:id
// @desc    Delete shipping address
// @access  Private
router.delete('/address/:id', isAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Filter out the address to remove
    user.shippingAddresses = user.shippingAddresses.filter(
      (address) => address._id.toString() !== req.params.id
    );

    user.updatedAt = Date.now();
    await user.save();
    res.json(user.shippingAddresses);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/users/:id
// @desc    Delete user (admin only)
// @access  Private/Admin
router.delete('/:id', isAuth, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.remove();
    res.json({ message: 'User removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).send('Server error');
  }
});

module.exports = router;