const express = require("express");
const router = express.Router();
const Product = require("../../models/Product");
const { isAuth, isSeller } = require("../../middleware/auth");
const { check, validationResult } = require("express-validator");

// @route   GET api/products
// @desc    Get all products
// @access  Public
router.get("/", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const page = parseInt(req.query.page) || 1;
    const sortBy = req.query.sortBy || "createdAt";
    const order = req.query.order || "desc";
    const category = req.query.category;
    const store = req.query.store;
    const priceMin = req.query.priceMin;
    const priceMax = req.query.priceMax;
    const isOnSale = req.query.isOnSale === "true";
    const isFeatured = req.query.isFeatured === "true";
    const isNewArrival = req.query.isNewArrival === "true";

    // Build query
    const query = {};
    if (category) query.category = category;
    if (store) query.store = store;
    if (priceMin && priceMax) {
      query.price = { $gte: priceMin, $lte: priceMax };
    } else if (priceMin) {
      query.price = { $gte: priceMin };
    } else if (priceMax) {
      query.price = { $lte: priceMax };
    }
    if (isOnSale) query.isOnSale = true;
    if (isFeatured) query.isFeatured = true;
    if (isNewArrival) query.isNewArrival = true;

    // Execute query
    const products = await Product.find(query)
      .populate("category", "name")
      .populate("store", "name")
      .sort({ [sortBy]: order === "desc" ? -1 : 1 })
      .limit(limit)
      .skip((page - 1) * limit);

    // Get total count for pagination
    const count = await Product.countDocuments(query);

    res.json({
      products,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   GET api/products/featured
// @desc    Get featured products
// @access  Public
router.get("/featured", async (req, res) => {
  try {
    const products = await Product.find({ isFeatured: true })
      .populate("category", "name")
      .populate("store", "name")
      .limit(10);
    res.json(products);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   GET api/products/deals
// @desc    Get products on sale
// @access  Public
router.get("/deals", async (req, res) => {
  try {
    const products = await Product.find({ isOnSale: true })
      .populate("category", "name")
      .populate("store", "name")
      .sort({ salePrice: 1 })
      .limit(10);
    res.json(products);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   GET api/products/new
// @desc    Get new arrivals
// @access  Public
router.get("/new", async (req, res) => {
  try {
    const products = await Product.find({ isNewArrival: true })
      .populate("category", "name")
      .populate("store", "name")
      .sort({ createdAt: -1 })
      .limit(10);
    res.json(products);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   GET api/products/:id
// @desc    Get product by ID
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category", "name")
      .populate("collections", "name")
      .populate("store", "name owner logo")
      .populate({
        path: "reviews.user",
        select: "name avatar",
      });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(500).send("Server error");
  }
});

// @route   POST api/products
// @desc    Create a product
// @access  Private/Seller
router.post(
  "/",
  [
    isAuth,
    isSeller,
    [
      check("name", "Name is required").not().isEmpty(),
      check("description", "Description is required").not().isEmpty(),
      check("price", "Price is required").isNumeric(),
      check("category", "Category is required").not().isEmpty(),
      check("stock", "Stock is required").isNumeric(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Check if store exists for this seller
      const store = await Store.findOne({ owner: req.user.id });
      if (!store) {
        return res.status(400).json({ message: "Please create a store first" });
      }

      const {
        name,
        description,
        price,
        salePrice,
        images,
        category,
        collections,
        stock,
        variants,
        specs,
        isOnSale,
        isFeatured,
        isNewArrival,
      } = req.body;

      // Create new product
      const newProduct = new Product({
        name,
        description,
        price,
        salePrice,
        images,
        category,
        collections,
        store: store._id,
        stock,
        variants,
        specs,
        isOnSale,
        isFeatured,
        isNewArrival,
      });

      const product = await newProduct.save();
      res.json(product);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// @route   PUT api/products/:id
// @desc    Update a product
// @access  Private/Seller
router.put("/:id", isAuth, isSeller, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if store belongs to this seller
    const store = await Store.findOne({ owner: req.user.id });
    if (!store || product.store.toString() !== store._id.toString()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const {
      name,
      description,
      price,
      salePrice,
      images,
      category,
      collections,
      stock,
      variants,
      specs,
      isOnSale,
      isFeatured,
      isNewArrival,
    } = req.body;

    // Update fields
    if (name) product.name = name;
    if (description) product.description = description;
    if (price) product.price = price;
    if (salePrice !== undefined) product.salePrice = salePrice;
    if (images) product.images = images;
    if (category) product.category = category;
    if (collections) product.collections = collections;
    if (stock !== undefined) product.stock = stock;
    if (variants) product.variants = variants;
    if (specs) product.specs = specs;
    if (isOnSale !== undefined) product.isOnSale = isOnSale;
    if (isFeatured !== undefined) product.isFeatured = isFeatured;
    if (isNewArrival !== undefined) product.isNewArrival = isNewArrival;
    product.updatedAt = Date.now();

    await product.save();
    res.json(product);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(500).send("Server error");
  }
});

// @route   DELETE api/products/:id
// @desc    Delete a product
// @access  Private/Seller
router.delete("/:id", isAuth, isSeller, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if store belongs to this seller
    const store = await Store.findOne({ owner: req.user.id });
    if (!store || product.store.toString() !== store._id.toString()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    await product.remove();
    res.json({ message: "Product removed" });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(500).send("Server error");
  }
});

// @route   POST api/products/review/:id
// @desc    Review a product
// @access  Private
router.post(
  "/review/:id",
  [
    isAuth,
    [
      check("text", "Text is required").not().isEmpty(),
      check("rating", "Rating is required").isNumeric(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      const { text, rating } = req.body;

      // Check if user already reviewed this product
      const alreadyReviewed = product.reviews.find(
        (review) => review.user.toString() === req.user.id
      );

      if (alreadyReviewed) {
        return res.status(400).json({ message: "Product already reviewed" });
      }

      // Add review
      const newReview = {
        user: req.user.id,
        text,
        rating: Number(rating),
      };

      product.reviews.push(newReview);

      // Calculate average rating
      product.rating =
        product.reviews.reduce((acc, item) => item.rating + acc, 0) /
        product.reviews.length;

      product.updatedAt = Date.now();
      await product.save();
      res.json(product.reviews);
    } catch (err) {
      console.error(err.message);
      if (err.kind === "ObjectId") {
        return res.status(404).json({ message: "Product not found" });
      }
      res.status(500).send("Server error");
    }
  }
);

module.exports = router;
