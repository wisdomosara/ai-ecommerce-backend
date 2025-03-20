const express = require('express');
const router = express.Router();
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const Cart = require('../../models/Cart');
const { isAuth, isSeller, isAdmin } = require('../../middleware/auth');

// @route   GET api/orders
// @desc    Get all orders for current user
// @access  Private
router.get('/', isAuth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate('products.product', 'name images');
    res.json(orders);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/orders/seller
// @desc    Get all orders for seller's products
// @access  Private/Seller
router.get('/seller', isAuth, isSeller, async (req, res) => {
  try {
    // Find seller's store
    const store = await Store.findOne({ owner: req.user.id });
    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    // Find all seller's products
    const products = await Product.find({ store: store._id }).select('_id');
    const productIds = products.map((product) => product._id);

    // Find orders containing seller's products
    const orders = await Order.find({
      'products.product': { $in: productIds },
    })
      .sort({ createdAt: -1 })
      .populate('user', 'name email')
      .populate('products.product', 'name images price');

    res.json(orders);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/orders/all
// @desc    Get all orders (admin only)
// @access  Private/Admin
router.get('/all', isAuth, isAdmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate('user', 'name email')
      .populate('products.product', 'name images price');
    res.json(orders);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get('/:id', isAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('products.product', 'name images price');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user is owner, seller of products, or admin
    const isSeller = req.user.role === 'seller';
    const isAdmin = req.user.role === 'admin';
    const isOwner = order.user._id.toString() === req.user.id;

    if (!isOwner && !isAdmin && !isSeller) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    res.json(order);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   POST api/orders
// @desc    Create an order
// @access  Private
router.post('/', isAuth, async (req, res) => {
  try {
    const {
      products,
      shippingAddress,
      paymentMethod,
      taxPrice,
      shippingPrice,
      totalPrice,
    } = req.body;

    // Check if products are available
    for (const item of products) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: `Product not found: ${item.product}` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          message: `Not enough stock for ${product.name}. Available: ${product.stock}`,
        });
      }

      // Update product stock
      product.stock -= item.quantity;
      await product.save();
    }

    // Create new order
    const newOrder = new Order({
      user: req.user.id,
      products,
      shippingAddress,
      paymentMethod,
      taxPrice,
      shippingPrice,
      totalPrice,
    });

    const order = await newOrder.save();

    // Clear cart after successful order
    await Cart.findOneAndUpdate(
      { user: req.user.id },
      { $set: { items: [] } }
    );

    res.status(201).json(order);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/orders/:id/pay
// @desc    Update order to paid
// @access  Private
router.put('/:id/pay', isAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Ensure user is the order owner
    if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized' });
    }

    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time,
      email_address: req.body.email_address,
    };

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   PUT api/orders/:id/status
// @desc    Update order status (seller/admin only)
// @access  Private/Seller/Admin
router.put('/:id/status', isAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Ensure user is authorized (admin or seller of the products)
    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && req.user.role !== 'seller') {
      return res.status(401).json({ message: 'Not authorized' });
    }

    order.status = req.body.status || order.status;
    if (req.body.status === 'delivered') {
      order.deliveredAt = Date.now();
    }

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/orders/:id
// @desc    Cancel an order (admin only or if status is pending)
// @access  Private
router.delete('/:id', isAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check permissions
    const isAdmin = req.user.role === 'admin';
    const isOwner = order.user.toString() === req.user.id;
    const isPending = order.status === 'pending';

    if (!isAdmin && (!isOwner || !isPending)) {
      return res.status(401).json({
        message: 'Not authorized or order cannot be cancelled at this stage',
      });
    }

    // Return product quantities to stock
    for (const item of order.products) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock += item.quantity;
        await product.save();
      }
    }

    // Set order status to cancelled
    order.status = 'cancelled';
    await order.save();

    res.json({ message: 'Order cancelled' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(500).send('Server error');
  }
});

module.exports = router;