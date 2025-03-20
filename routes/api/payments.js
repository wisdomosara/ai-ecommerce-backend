const express = require('express');
const router = express.Router();
const Order = require('../../models/Order');
const { isAuth } = require('../../middleware/auth');
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Paystack = require('paystack-api')(process.env.PAYSTACK_SECRET_KEY);
// const Flutterwave = require('flutterwave-node-v3')(process.env.FLW_PUBLIC_KEY, process.env.FLW_SECRET_KEY);

// @route   POST api/payments/stripe/create-payment-intent
// @desc    Create Stripe payment intent
// @access  Private
// router.post('/stripe/create-payment-intent', isAuth, async (req, res) => {
//   try {
//     const { orderId } = req.body;

//     const order = await Order.findById(orderId);
//     if (!order) {
//       return res.status(404).json({ message: 'Order not found' });
//     }

//     // Create payment intent with Stripe
//     const paymentIntent = await stripe.paymentIntents.create({
//       amount: Math.round(order.totalPrice * 100), // Convert to cents
//       currency: 'usd',
//       metadata: {
//         orderId: order._id.toString(),
//         userId: req.user.id
//       }
//     });

//     res.json({
//       clientSecret: paymentIntent.client_secret
//     });
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send('Server error');
//   }
// });

// @route   POST api/payments/stripe/webhook
// @desc    Handle Stripe webhook events
// @access  Public
// router.post('/stripe/webhook', express.raw({type: 'application/json'}), async (req, res) => {
//   const sig = req.headers['stripe-signature'];

//   try {
//     const event = stripe.webhooks.constructEvent(
//       req.body,
//       sig,
//       process.env.STRIPE_WEBHOOK_SECRET
//     );

//     switch (event.type) {
//       case 'payment_intent.succeeded':
//         const paymentIntent = event.data.object;
//         await handleSuccessfulPayment(paymentIntent);
//         break;
//       case 'payment_intent.payment_failed':
//         const failedPayment = event.data.object;
//         await handleFailedPayment(failedPayment);
//         break;
//     }

//     res.json({ received: true });
//   } catch (err) {
//     console.error(err.message);
//     res.status(400).send(`Webhook Error: ${err.message}`);
//   }
// });

// @route   POST api/payments/paystack/initialize
// @desc    Initialize Paystack transaction
// @access  Private
router.post('/paystack/initialize', isAuth, async (req, res) => {
  try {
    const { orderId, email } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const transaction = await Paystack.transaction.initialize({
      email,
      amount: Math.round(order.totalPrice * 100), // Convert to kobo
      reference: `ord_${orderId}_${Date.now()}`,
      metadata: {
        orderId: order._id.toString(),
        userId: req.user.id
      }
    });

    res.json(transaction);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/payments/paystack/webhook
// @desc    Handle Paystack webhook events
// @access  Public
router.post('/paystack/webhook', async (req, res) => {
  try {
    const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(400).send('Invalid signature');
    }

    const event = req.body;

    switch(event.event) {
      case 'charge.success':
        await handlePaystackSuccess(event.data);
        break;
      case 'charge.failed':
        await handlePaystackFailure(event.data);
        break;
    }

    res.sendStatus(200);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/payments/flutterwave/initialize
// @desc    Initialize Flutterwave transaction
// @access  Private
// router.post('/flutterwave/initialize', isAuth, async (req, res) => {
//   try {
//     const { orderId, email } = req.body;

//     const order = await Order.findById(orderId);
//     if (!order) {
//       return res.status(404).json({ message: 'Order not found' });
//     }

//     const payload = {
//       tx_ref: `ord_${orderId}_${Date.now()}`,
//       amount: order.totalPrice,
//       currency: "USD",
//       redirect_url: `${process.env.CLIENT_URL}/payment/verify`,
//       customer: {
//         email,
//         phonenumber: req.user.phone,
//         name: req.user.name
//       },
//       meta: {
//         orderId: order._id.toString(),
//         userId: req.user.id
//       }
//     };

//     const response = await Flutterwave.Charge.card(payload);
//     res.json(response);
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send('Server error');
//   }
// });

// @route   POST api/payments/flutterwave/webhook
// @desc    Handle Flutterwave webhook events
// @access  Public
// router.post('/flutterwave/webhook', async (req, res) => {
//   try {
//     const secretHash = process.env.FLW_SECRET_HASH;
//     const signature = req.headers['verif-hash'];

//     if (!signature || signature !== secretHash) {
//       return res.status(400).send('Invalid signature');
//     }

//     const event = req.body;

//     switch(event.event) {
//       case 'charge.completed':
//         await handleFlutterwaveSuccess(event.data);
//         break;
//       case 'charge.failed':
//         await handleFlutterwaveFailure(event.data);
//         break;
//     }

//     res.sendStatus(200);
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send('Server error');
//   }
// });

// Payment handler functions
async function handleSuccessfulPayment(paymentIntent) {
  const orderId = paymentIntent.metadata.orderId;
  const order = await Order.findById(orderId);
  
  if (order) {
    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      id: paymentIntent.id,
      status: 'completed',
      update_time: new Date().toISOString(),
      email_address: paymentIntent.receipt_email
    };
    order.status = 'processing';
    await order.save();
  }
}

async function handleFailedPayment(paymentIntent) {
  const orderId = paymentIntent.metadata.orderId;
  const order = await Order.findById(orderId);
  
  if (order) {
    order.paymentResult = {
      id: paymentIntent.id,
      status: 'failed',
      update_time: new Date().toISOString(),
      error: paymentIntent.last_payment_error?.message
    };
    await order.save();
  }
}

async function handlePaystackSuccess(data) {
  const reference = data.reference;
  const orderId = reference.split('_')[1];
  const order = await Order.findById(orderId);
  
  if (order) {
    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      id: data.id,
      status: 'completed',
      update_time: new Date().toISOString(),
      email_address: data.customer.email
    };
    order.status = 'processing';
    await order.save();
  }
}

// async function handleFlutterwaveSuccess(data) {
//   const tx_ref = data.tx_ref;
//   const orderId = tx_ref.split('_')[1];
//   const order = await Order.findById(orderId);
  
//   if (order) {
//     order.isPaid = true;
//     order.paidAt = Date.now();
//     order.paymentResult = {
//       id: data.id,
//       status: 'completed',
//       update_time: new Date().toISOString(),
//       email_address: data.customer.email
//     };
//     order.status = 'processing';
//     await order.save();
//   }
// }

module.exports = router;

