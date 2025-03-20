const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Collection = require('../models/Collection');
const Store = require('../models/Store');
const Order = require('../models/Order');
const Cart = require('../models/Cart');

const users = [
  {
    name: 'Admin User',
    email: 'admin@example.com',
    password: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    phone: '+1234567890',
    isVerified: true,
    avatar: 'admin-avatar.jpg',
    address: {
      street: '123 Admin St',
      city: 'Admin City',
      state: 'AS',
      country: 'USA',
      zipCode: '12345'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Store Owner',
    email: 'store@example.com',
    password: bcrypt.hashSync('store123', 10),
    role: 'merchant',
    phone: '+1234567891',
    isVerified: true,
    avatar: 'merchant-avatar.jpg',
    address: {
      street: '456 Merchant St',
      city: 'Merchant City', 
      state: 'MS',
      country: 'USA',
      zipCode: '23456'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Customer',
    email: 'customer@example.com',
    password: bcrypt.hashSync('customer123', 10),
    role: 'user',
    phone: '+1234567892',
    isVerified: true,
    avatar: 'customer-avatar.jpg',
    address: {
      street: '789 Customer St',
      city: 'Customer City',
      state: 'CS',
      country: 'USA',
      zipCode: '34567'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const categories = [
  {
    name: 'Women\'s Fashion',
    description: 'Fashion items for women',
    image: 'womens-fashion.jpg',
    isActive: true,
    slug: 'womens-fashion',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Men\'s Fashion',
    description: 'Fashion items for men',
    image: 'mens-fashion.jpg',
    isActive: true,
    slug: 'mens-fashion',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Accessories',
    description: 'Fashion accessories',
    image: 'accessories.jpg',
    isActive: true,
    slug: 'accessories',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const products = [
  {
    name: 'Summer Dress',
    description: 'Light and breezy summer dress',
    price: 89.99,
    category: '{{categories.0._id}}',
    images: ['summer-dress-1.jpg', 'summer-dress-2.jpg'],
    store: '{{stores.0._id}}',
    stock: 50,
    isActive: true,
    slug: 'summer-dress',
    sku: 'SD001',
    brand: 'Summer Fashion',
    ratings: {
      rating: 4.5,
      numReviews: 10
    },
    reviews: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Men\'s Casual Shirt',
    description: 'Comfortable casual shirt for men',
    price: 49.99,
    category: '{{categories.1._id}}',
    images: ['casual-shirt-1.jpg', 'casual-shirt-2.jpg'],
    store: '{{stores.1._id}}',
    stock: 75,
    isActive: true,
    slug: 'mens-casual-shirt',
    sku: 'MCS001',
    brand: 'Casual Wear',
    ratings: {
      rating: 4.2,
      numReviews: 8
    },
    reviews: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const stores = [
  {
    name: 'Fashion Forward',
    description: 'Trendy and affordable fashion',
    owner: '{{users.1._id}}',
    logo: 'fashion-forward-logo.jpg',
    banner: 'fashion-forward-banner.jpg',
    address: {
      street: '123 Style Street',
      city: 'Fashion District',
      state: 'FD',
      country: 'USA',
      zipCode: '45678'
    },
    contactEmail: 'contact@fashionforward.com',
    contactPhone: '+1234567890',
    isVerified: true,
    socialMedia: {
      facebook: 'fashionforward',
      instagram: 'fashion.forward',
      twitter: 'fashionforward'
    },
    ratings: {
      rating: 4.7,
      numReviews: 15
    },
    reviews: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const orders = [
  {
    user: '{{users.2._id}}',
    orderItems: [
      {
        product: '{{products.0._id}}',
        quantity: 2,
        price: 89.99
      }
    ],
    shippingAddress: {
      street: '789 Customer St',
      city: 'Customer City',
      state: 'CS',
      country: 'USA',
      zipCode: '34567'
    },
    paymentMethod: 'stripe',
    totalPrice: 179.98,
    shippingPrice: 10.00,
    taxPrice: 18.00,
    isPaid: true,
    paidAt: new Date('2024-01-15'),
    status: 'completed',
    paymentResult: {
      id: 'pay_123456789',
      status: 'completed',
      update_time: '2024-01-15T10:30:00Z',
      email_address: 'customer@example.com'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const carts = [
  {
    user: '{{users.2._id}}',
    items: [
      {
        product: '{{products.0._id}}',
        quantity: 2
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const seedDatabase = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await Collection.deleteMany({});
    await Store.deleteMany({});
    await Order.deleteMany({});
    await Cart.deleteMany({});

    // Insert users first to get their IDs
    const createdUsers = await User.insertMany(users);
    
    // Insert categories
    const createdCategories = await Category.insertMany(categories);

    // Update references in stores data
    const storesWithRefs = stores.map(store => ({
      ...store,
      owner: createdUsers[1]._id
    }));
    const createdStores = await Store.insertMany(storesWithRefs);

    // Update references in products data
    const productsWithRefs = products.map((product, index) => ({
      ...product,
      category: createdCategories[index]._id,
      store: createdStores[0]._id
    }));
    const createdProducts = await Product.insertMany(productsWithRefs);

    // Update references in orders data
    const ordersWithRefs = orders.map(order => ({
      ...order,
      user: createdUsers[2]._id,
      orderItems: [{
        ...order.orderItems[0],
        product: createdProducts[0]._id
      }]
    }));
    await Order.insertMany(ordersWithRefs);

    // Update references in carts data
    const cartsWithRefs = carts.map(cart => ({
      ...cart,
      user: createdUsers[2]._id,
      items: [{
        product: createdProducts[0]._id,
        quantity: cart.items[0].quantity
      }]
    }));
    await Cart.insertMany(cartsWithRefs);

    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};

module.exports = seedDatabase;



