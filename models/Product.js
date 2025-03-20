const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProductSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  salePrice: {
    type: Number,
  },
  images: [
    {
      type: String,
    },
  ],
  category: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  collections: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Collection',
    },
  ],
  store: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
  },
  variants: [
    {
      name: String,
      options: [
        {
          name: String,
          price: Number,
          stock: Number,
        },
      ],
    },
  ],
  specs: [
    {
      name: String,
      value: String,
    },
  ],
  rating: {
    type: Number,
    default: 0,
  },
  reviews: [
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      text: String,
      rating: Number,
      date: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  isOnSale: {
    type: Boolean,
    default: false,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  isNewArrival: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Text index for search functionality
ProductSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Product', ProductSchema);