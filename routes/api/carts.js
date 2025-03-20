const express = require('express');
const router = express.Router();
const Cart = require('../../models/Cart');
const Product = require('../../models/Product');
const { isAuth } = require('../../middleware/auth');

// @route   GET api/carts
// @desc    Get user's cart
// @access  Private
router.get('/', isAuth, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id }).populate(
      'items.product',
      'name price images stock isOnSale salePrice'
    );

    if (!cart) {
      // Create new cart if not exists
      cart = new Cart({ user: req.user.id, items: [] });
      await cart.save();
    }

    res.json(cart);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/carts
// @desc    Add item to cart
// @access  Private
router.post('/', isAuth, async (req, res) => {
  try {
    const { productId, quantity = 1, variant } = req.body;

    // Validate product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({
        message: `Not enough stock. Available: ${product.stock}`,
      });
    }

    // Find or create cart
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
    }

    // Check if product already in cart
    const itemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        JSON.stringify(item.variant) === JSON.stringify(variant)
    );

    if (itemIndex > -1) {
      // Update quantity if item exists
      cart.items[itemIndex].quantity += quantity;
    } else {
      // Add new item
      cart.items.push({ product: productId, quantity, variant });
    }

    cart.updatedAt = Date.now();
    await cart.save();

    // Return cart with populated product details
    cart = await Cart.findOne({ user: req.user.id }).populate(
      'items.product',
      'name price images stock isOnSale salePrice'
    );

    res.json(cart);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/carts/:itemId
// @desc    Update cart item quantity
// @access  Private
router.put('/:itemId', isAuth, async (req, res) => {
  try {
    const { quantity } = req.body;
    if (quantity < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }

    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Find item
    const itemIndex = cart.items.findIndex(
      (item) => item._id.toString() === req.params.itemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    // Check product stock
    const product = await Product.findById(cart.items[itemIndex].product);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({
        message: `Not enough stock. Available: ${product.stock}`,
      });
    }

    // Update quantity
    cart.items[itemIndex].quantity = quantity;
    cart.updatedAt = Date.now();
    await cart.save();

    // Return updated cart
    cart = await Cart.findOne({ user: req.user.id }).populate(
      'items.product',
      'name price images stock isOnSale salePrice'
    );

    res.json(cart);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/carts/:itemId
// @desc    Remove item from cart
// @access  Private
router.delete('/:itemId', isAuth, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Remove item
    cart.items = cart.items.filter(
      (item) => item._id.toString() !== req.params.itemId
    );

    cart.updatedAt = Date.now();
    await cart.save();

    // Return updated cart
    cart = await Cart.findOne({ user: req.user.id }).populate(
      'items.product',
      'name price images stock isOnSale salePrice'
    );

    res.json(cart);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/carts
// @desc    Clear cart
// @access  Private
router.delete('/', isAuth, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Clear items
    cart.items = [];
    cart.updatedAt = Date.now();
    await cart.save();

    res.json(cart);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;