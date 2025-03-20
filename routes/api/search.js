const express = require('express');
const router = express.Router();
const Product = require('../../models/Product');
const Category = require('../../models/Category');

// @route   GET api/search
// @desc    Search products and categories with filtering and sorting
// @access  Public
router.get('/', async (req, res) => {
  try {
    const searchQuery = req.query.q;
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const sortBy = req.query.sortBy || 'score'; // score, price, name, rating
    const order = req.query.order || 'desc';
    
    // Filters
    const categoryId = req.query.category;
    const priceMin = parseFloat(req.query.priceMin);
    const priceMax = parseFloat(req.query.priceMax);
    const rating = parseFloat(req.query.rating);
    const inStock = req.query.inStock === 'true';
    const onSale = req.query.onSale === 'true';

    if (!searchQuery) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    // Build product query
    let productQuery = { $text: { $search: searchQuery } };
    
    if (categoryId) {
      productQuery.category = categoryId;
    }
    
    if (priceMin || priceMax) {
      productQuery.price = {};
      if (priceMin) productQuery.price.$gte = priceMin;
      if (priceMax) productQuery.price.$lte = priceMax;
    }
    
    if (rating) {
      productQuery.rating = { $gte: rating };
    }
    
    if (inStock) {
      productQuery.stock = { $gt: 0 };
    }
    
    if (onSale) {
      productQuery.isOnSale = true;
    }

    // Build sort options
    let sortOptions = {};
    if (sortBy === 'score') {
      sortOptions = { score: { $meta: 'textScore' } };
    } else {
      sortOptions[sortBy] = order === 'desc' ? -1 : 1;
    }

    // Search products
    const products = await Product.find(
      productQuery,
      { score: { $meta: 'textScore' } }
    )
      .populate('category', 'name description image')
      .populate('store', 'name logo')
      .populate('collections', 'name')
      .sort(sortOptions)
      .limit(limit)
      .skip((page - 1) * limit);

    // Search categories
    const categories = await Category.find({
      $or: [
        { name: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } }
      ],
      isActive: true
    })
    .select('name description image parent')
    .populate('parent', 'name')
    .limit(5);

    // Get total counts for pagination
    const productCount = await Product.countDocuments(productQuery);
    const categoryCount = await Category.countDocuments({
      $or: [
        { name: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } }
      ],
      isActive: true
    });

    // Calculate stats
    const stats = {
      avgPrice: await Product.aggregate([
        { $match: productQuery },
        { $group: { _id: null, avg: { $avg: '$price' } } }
      ]).then(res => res[0]?.avg || 0),
      minPrice: await Product.findOne(productQuery).sort({ price: 1 }).select('price').then(res => res?.price || 0),
      maxPrice: await Product.findOne(productQuery).sort({ price: -1 }).select('price').then(res => res?.price || 0),
      totalProducts: productCount,
      totalCategories: categoryCount
    };

    res.json({
      products,
      categories,
      pagination: {
        totalPages: Math.ceil(productCount / limit),
        currentPage: page,
        totalProducts: productCount,
        productsPerPage: limit
      },
      filters: {
        availablePriceRange: {
          min: stats.minPrice,
          max: stats.maxPrice
        },
        averagePrice: stats.avgPrice
      },
      stats
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/search/suggestions
// @desc    Get search suggestions based on partial query
// @access  Public
router.get('/suggestions', async (req, res) => {
  try {
    const searchQuery = req.query.q;
    
    if (!searchQuery || searchQuery.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    // Get product name suggestions
    const productSuggestions = await Product.find({
      name: { $regex: `^${searchQuery}`, $options: 'i' }
    })
    .select('name category')
    .populate('category', 'name')
    .limit(5);

    // Get category suggestions
    const categorySuggestions = await Category.find({
      name: { $regex: `^${searchQuery}`, $options: 'i' },
      isActive: true
    })
    .select('name')
    .limit(3);

    res.json({
      suggestions: {
        products: productSuggestions,
        categories: categorySuggestions
      }
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;

