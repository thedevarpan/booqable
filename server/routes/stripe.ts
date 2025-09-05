import { RequestHandler } from "express";

// Mock Stripe integration - in production, you'd use the actual Stripe SDK
// import Stripe from 'stripe';
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//   apiVersion: '2023-10-16',
// });

// Create payment intent for checkout
export const createPaymentIntent: RequestHandler = async (req, res) => {
  try {
    const { 
      amount, 
      currency = 'gbp',
      customer_email,
      metadata = {} 
    } = req.body;

    if (!amount || !customer_email) {
      return res.status(400).json({
        success: false,
        error: 'Amount and customer email are required'
      });
    }

    // In production:
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount: Math.round(amount * 100), // Convert to pence
    //   currency,
    //   receipt_email: customer_email,
    //   metadata: {
    //     ...metadata,
    //     integration_type: 'costume_rental'
    //   },
    //   automatic_payment_methods: {
    //     enabled: true,
    //   },
    // });

    // Mock payment intent
    const mockPaymentIntent = {
      id: `pi_mock_${Date.now()}`,
      client_secret: `pi_mock_${Date.now()}_secret_mock`,
      amount: Math.round(amount * 100),
      currency,
      status: 'requires_payment_method',
      created: Math.floor(Date.now() / 1000)
    };

    res.json({
      success: true,
      data: {
        client_secret: mockPaymentIntent.client_secret,
        payment_intent_id: mockPaymentIntent.id
      }
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment intent'
    });
  }
};

// Webhook handler for Stripe events
export const handleWebhook: RequestHandler = async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    
    // In production:
    // let event;
    // try {
    //   event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    // } catch (err) {
    //   console.error('Webhook signature verification failed:', err);
    //   return res.status(400).send('Webhook signature verification failed');
    // }

    // For development, we'll mock the event
    const event = {
      id: `evt_mock_${Date.now()}`,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_mock_123',
          amount: 4500,
          currency: 'gbp',
          status: 'succeeded',
          receipt_email: 'customer@example.com',
          metadata: {
            customer_id: '123',
            order_items: JSON.stringify([
              { product_id: 1, quantity: 1, price: 45 }
            ]),
            start_date: '2024-01-15',
            end_date: '2024-01-27'
          }
        }
      }
    };

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log('Payment succeeded:', paymentIntent.id);
        
        // In production, this would:
        // 1. Create order in Booqable using the metadata
        // 2. Send confirmation email to customer
        // 3. Update order status in database
        // 4. Send invoice/receipt
        
        // Mock order creation call to Booqable
        const orderData = {
          customer_id: paymentIntent.metadata?.customer_id,
          items: JSON.parse(paymentIntent.metadata?.order_items || '[]'),
          start_date: paymentIntent.metadata?.start_date,
          end_date: paymentIntent.metadata?.end_date,
          stripe_payment_intent_id: paymentIntent.id,
          amount: paymentIntent.amount / 100, // Convert back to pounds
          status: 'paid'
        };

        console.log('Creating order in Booqable:', orderData);
        
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        console.log('Payment failed:', failedPayment.id);
        
        // Handle failed payment
        // 1. Log the failure
        // 2. Notify customer
        // 3. Clean up any reservations
        
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Webhook handling failed'
    });
  }
};

// Get payment methods for customer
export const getPaymentMethods: RequestHandler = async (req, res) => {
  try {
    const { customer_id } = req.params;

    if (!customer_id) {
      return res.status(400).json({
        success: false,
        error: 'Customer ID is required'
      });
    }

    // In production:
    // const paymentMethods = await stripe.paymentMethods.list({
    //   customer: customer_id,
    //   type: 'card',
    // });

    // Mock payment methods
    const mockPaymentMethods = {
      data: [
        {
          id: 'pm_mock_123',
          type: 'card',
          card: {
            brand: 'visa',
            last4: '4242',
            exp_month: 12,
            exp_year: 2025
          }
        }
      ]
    };

    res.json({
      success: true,
      data: mockPaymentMethods.data
    });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment methods'
    });
  }
};

// Process refund
export const createRefund: RequestHandler = async (req, res) => {
  try {
    const { payment_intent_id, amount, reason } = req.body;

    if (!payment_intent_id) {
      return res.status(400).json({
        success: false,
        error: 'Payment intent ID is required'
      });
    }

    // In production:
    // const refund = await stripe.refunds.create({
    //   payment_intent: payment_intent_id,
    //   amount: amount ? Math.round(amount * 100) : undefined, // Partial or full refund
    //   reason: reason || 'requested_by_customer'
    // });

    // Mock refund
    const mockRefund = {
      id: `re_mock_${Date.now()}`,
      payment_intent: payment_intent_id,
      amount: amount ? Math.round(amount * 100) : 4500,
      status: 'succeeded',
      reason: reason || 'requested_by_customer',
      created: Math.floor(Date.now() / 1000)
    };

    res.json({
      success: true,
      data: mockRefund
    });
  } catch (error) {
    console.error('Error creating refund:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create refund'
    });
  }
};

// Calculate order total including taxes and fees
export const calculateOrderTotal: RequestHandler = async (req, res) => {
  try {
    const { items, delivery_method, promo_code } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        error: 'Items array is required'
      });
    }

    // Calculate subtotal
    const subtotal = items.reduce((sum: number, item: any) => {
      return sum + (item.price * item.quantity * item.rental_days);
    }, 0);

    // Delivery fees
    const deliveryFees = {
      standard: 0, // Free standard delivery
      express: 15,
      next_day: 25
    };

    const deliveryFee = deliveryFees[delivery_method as keyof typeof deliveryFees] || 0;

    // VAT (20% in UK)
    const vatRate = 0.20;
    const vat = (subtotal + deliveryFee) * vatRate;

    // Promo code discount (mock)
    let discount = 0;
    if (promo_code) {
      const promoCodes: { [key: string]: number } = {
        'FIRST20': 0.20, // 20% off first order
        'SAVE10': 0.10,  // 10% off
        'STUDENT15': 0.15 // 15% off for students
      };
      
      if (promoCodes[promo_code.toUpperCase()]) {
        discount = subtotal * promoCodes[promo_code.toUpperCase()];
      }
    }

    const total = subtotal + deliveryFee + vat - discount;

    res.json({
      success: true,
      data: {
        subtotal: Number(subtotal.toFixed(2)),
        delivery_fee: Number(deliveryFee.toFixed(2)),
        vat: Number(vat.toFixed(2)),
        discount: Number(discount.toFixed(2)),
        total: Number(total.toFixed(2)),
        currency: 'GBP',
        breakdown: {
          items: items.map((item: any) => ({
            ...item,
            line_total: Number((item.price * item.quantity * item.rental_days).toFixed(2))
          })),
          promo_code,
          delivery_method
        }
      }
    });
  } catch (error) {
    console.error('Error calculating order total:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate order total'
    });
  }
};
