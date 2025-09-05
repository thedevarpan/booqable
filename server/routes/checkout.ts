import { RequestHandler } from "express";
import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const BOOQABLE_BASE_URL = process.env.BOOQABLE_BASE_URL;
const BOOQABLE_API_KEY = process.env.BOOQABLE_API_KEY;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

if (!STRIPE_SECRET_KEY) {
  console.error("STRIPE_SECRET_KEY environment variable is not set");
}

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
}) : null;

// Helper function to make authenticated requests to Booqable API
async function booqableRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${BOOQABLE_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${BOOQABLE_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Booqable API error: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`Booqable API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

interface CartItem {
  product_id: string;
  quantity: number;
  start_date: string;
  end_date: string;
  rental_days: number;
  price_per_day: number;
}

interface CheckoutSession {
  items: CartItem[];
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  delivery_address?: {
    line1: string;
    line2?: string;
    city: string;
    postal_code: string;
    country: string;
  };
  special_instructions?: string;
}

// Create Stripe Checkout Session
export const createCheckoutSession: RequestHandler = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({
        success: false,
        error: 'Stripe is not configured'
      });
    }

    const { items, customer, delivery_address, special_instructions }: CheckoutSession = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Items are required'
      });
    }

    if (!customer || !customer.email || !customer.name) {
      return res.status(400).json({
        success: false,
        error: 'Customer name and email are required'
      });
    }

    // Validate all items and get product details
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    let orderTotal = 0;
    const productDetails: Array<{
      product_id: string;
      name: string;
      sku: string;
      quantity: number;
      rental_days: number;
      start_date: string;
      end_date: string;
      price_per_day: number;
      total_price: number;
    }> = [];

    for (const item of items) {
      // Validate minimum rental period
      if (item.rental_days < 8) {
        return res.status(400).json({
          success: false,
          error: `Minimum rental period is 8 days for product ${item.product_id}`
        });
      }

      // Get product details from Booqable
      const productData = await booqableRequest(`/products/${item.product_id}`);
      
      if (!productData.product) {
        return res.status(404).json({
          success: false,
          error: `Product ${item.product_id} not found`
        });
      }

      const product = productData.product;
      const itemTotal = item.price_per_day * item.quantity * item.rental_days;
      orderTotal += itemTotal;

      // Add to product details for order creation
      productDetails.push({
        product_id: item.product_id,
        name: product.name,
        sku: product.sku || '',
        quantity: item.quantity,
        rental_days: item.rental_days,
        start_date: item.start_date,
        end_date: item.end_date,
        price_per_day: item.price_per_day,
        total_price: itemTotal
      });

      // Create Stripe line item
      lineItems.push({
        price_data: {
          currency: 'gbp',
          product_data: {
            name: `${product.name} (${item.rental_days}-day rental)`,
            description: `Rental period: ${item.start_date} to ${item.end_date}`,
            images: product.photo_url ? [product.photo_url] : [],
            metadata: {
              product_id: item.product_id,
              rental_days: item.rental_days.toString(),
              start_date: item.start_date,
              end_date: item.end_date,
            }
          },
          unit_amount: Math.round(item.price_per_day * item.rental_days * 100), // Convert to pence
        },
        quantity: item.quantity,
      });
    }

    // Add delivery fee if applicable
    const deliveryFee = orderTotal >= 100 ? 0 : 10;
    if (deliveryFee > 0) {
      lineItems.push({
        price_data: {
          currency: 'gbp',
          product_data: {
            name: 'Delivery Fee',
            description: 'Free delivery on orders over £100'
          },
          unit_amount: deliveryFee * 100, // Convert to pence
        },
        quantity: 1,
      });
    }

    // Calculate 10% deposit in pence
    const grandTotal = orderTotal + deliveryFee;
    const depositPence = Math.max(1, Math.round(grandTotal * 100 * 0.10));

    // Create Stripe Checkout Session for deposit only
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: 'Rental Deposit (10%)',
              description: 'Balance due before pickup/dispatch'
            },
            unit_amount: depositPence,
          },
          quantity: 1,
        }
      ],
      mode: 'payment',
      success_url: `${CLIENT_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${CLIENT_URL}/cart`,
      customer_email: customer.email,
      metadata: {
        order_type: 'rental',
        customer_name: customer.name,
        customer_phone: customer.phone || '',
        delivery_address: delivery_address ? JSON.stringify(delivery_address) : '',
        special_instructions: special_instructions || '',
        product_details: JSON.stringify(productDetails),
        order_total_gbp: grandTotal.toFixed(2),
        deposit_gbp: (depositPence / 100).toFixed(2),
        balance_gbp: (grandTotal - depositPence / 100).toFixed(2),
      },
      shipping_address_collection: delivery_address ? undefined : {
        allowed_countries: ['GB'],
      },
      phone_number_collection: {
        enabled: true,
      },
    });

    res.json({
      success: true,
      data: {
        session_id: session.id,
        checkout_url: session.url,
        order_total: orderTotal,
        delivery_fee: deliveryFee,
        grand_total: grandTotal,
        deposit: depositPence / 100,
        balance_due: grandTotal - depositPence / 100
      }
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create checkout session'
    });
  }
};

// Handle Stripe webhook for successful payments
export const handleStripeWebhook: RequestHandler = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe is not configured' });
    }

    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not set');
      return res.status(400).json({ error: 'Webhook secret not configured' });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      try {
        await processSuccessfulPayment(session);
        console.log('Order processed successfully for session:', session.id);
      } catch (error) {
        console.error('Error processing successful payment:', error);
        // Don't return error to Stripe - we don't want to retry
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Failed to handle webhook' });
  }
};

// Process successful payment and create order in Booqable
async function processSuccessfulPayment(session: Stripe.Checkout.Session) {
  const metadata = session.metadata;
  
  if (!metadata) {
    throw new Error('No metadata found in session');
  }

  const productDetails = JSON.parse(metadata.product_details || '[]');
  const deliveryAddress = metadata.delivery_address ? JSON.parse(metadata.delivery_address) : null;

  // Create or find customer in Booqable
  let customerId: string;
  
  try {
    // Try to find existing customer by email
    const customersData = await booqableRequest(`/customers?filter[email]=${session.customer_email}`);
    
    if (customersData.customers && customersData.customers.length > 0) {
      customerId = customersData.customers[0].id;
      console.log('Found existing customer:', customerId);
    } else {
      // Create new customer
      const customerData = {
        customer: {
          name: metadata.customer_name,
          email: session.customer_email,
          phone: metadata.customer_phone || '',
          ...(deliveryAddress && {
            address_line_1: deliveryAddress.line1,
            address_line_2: deliveryAddress.line2 || '',
            address_city: deliveryAddress.city,
            address_zipcode: deliveryAddress.postal_code,
            address_country: deliveryAddress.country
          })
        }
      };

      const newCustomerData = await booqableRequest('/customers', {
        method: 'POST',
        body: JSON.stringify(customerData)
      });

      customerId = newCustomerData.customer.id;
      console.log('Created new customer:', customerId);
    }
  } catch (error) {
    console.error('Error handling customer:', error);
    throw error;
  }

  // Create order in Booqable for each product (they might have different rental periods)
  const orders = [];
  
  for (const item of productDetails) {
    try {
      const orderData = {
        order: {
          customer_id: customerId,
          starts_at: item.start_date,
          stops_at: item.end_date,
          status: 'confirmed',
          payment_status: 'unpaid',
          lines_attributes: [{
            item_id: item.product_id,
            quantity: item.quantity,
            price_structure_id: null
          }],
          properties: {
            stripe_session_id: session.id,
            stripe_payment_intent_id: session.payment_intent,
            special_instructions: metadata.special_instructions || '',
            total_amount_paid: session.amount_total ? (session.amount_total / 100).toString() : '0',
            order_total_gbp: metadata.order_total_gbp || '',
            deposit_gbp: metadata.deposit_gbp || '',
            balance_gbp: metadata.balance_gbp || ''
          },
          ...(deliveryAddress && {
            delivery_address_line_1: deliveryAddress.line1,
            delivery_address_line_2: deliveryAddress.line2 || '',
            delivery_address_city: deliveryAddress.city,
            delivery_address_zipcode: deliveryAddress.postal_code,
            delivery_address_country: deliveryAddress.country
          })
        }
      };

      const orderResponse = await booqableRequest('/orders', {
        method: 'POST',
        body: JSON.stringify(orderData)
      });

      orders.push(orderResponse.order);
      console.log('Created order in Booqable:', orderResponse.order.id);
    } catch (error) {
      console.error('Error creating order for item:', item.product_id, error);
      // Continue with other items even if one fails
    }
  }

  if (orders.length === 0) {
    throw new Error('Failed to create any orders in Booqable');
  }

  return orders;
}

// Get checkout session details
export const getCheckoutSession: RequestHandler = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({
        success: false,
        error: 'Stripe is not configured'
      });
    }

    const { session_id } = req.params;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);

    res.json({
      success: true,
      data: {
        session_id: session.id,
        payment_status: session.payment_status,
        customer_email: session.customer_email,
        amount_total: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency,
        metadata: session.metadata
      }
    });

  } catch (error) {
    console.error('Error retrieving checkout session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve checkout session'
    });
  }
};
