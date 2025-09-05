import { RequestHandler } from "express";
import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
}) : null;

const BOOQABLE_BASE_URL = process.env.BOOQABLE_BASE_URL;
const BOOQABLE_API_KEY = process.env.BOOQABLE_API_KEY;

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

// Calculate payment schedule based on order total and rental date
function calculatePaymentSchedule(orderTotal: number, rentalStartDate: string) {
  const now = new Date();
  const rentalStart = new Date(rentalStartDate);
  const daysUntilRental = Math.ceil((rentalStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  // 30% deposit, 70% final payment
  const depositAmount = orderTotal * 0.3;
  const finalAmount = orderTotal * 0.7;
  
  // Deposit due within 24 hours of booking
  const depositDueDate = new Date();
  depositDueDate.setDate(depositDueDate.getDate() + 1);
  
  // Final payment due 7 days before rental
  const finalDueDate = new Date(rentalStart);
  finalDueDate.setDate(finalDueDate.getDate() - 7);
  
  return {
    deposit_amount: depositAmount,
    deposit_due_date: depositDueDate.toISOString(),
    final_amount: finalAmount,
    final_due_date: finalDueDate.toISOString(),
    total_amount: orderTotal
  };
}

// Get payment details for an order
export const getOrderPayments: RequestHandler = async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log('getOrderPayments called with orderId:', orderId);
    console.log('Request user:', req.user ? 'User authenticated' : 'No user found');

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      });
    }

    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check environment variables
    if (!BOOQABLE_BASE_URL || !BOOQABLE_API_KEY) {
      console.error('Missing Booqable configuration:', {
        BOOQABLE_BASE_URL: !!BOOQABLE_BASE_URL,
        BOOQABLE_API_KEY: !!BOOQABLE_API_KEY
      });
      return res.status(500).json({
        success: false,
        error: 'Booqable API configuration is missing'
      });
    }

    // Get order details from Booqable
    console.log('Fetching order from Booqable API:', `/orders/${orderId}`);

    let orderData;
    try {
      orderData = await booqableRequest(`/orders/${orderId}`);
      console.log('Booqable order response:', orderData);
    } catch (booqableError) {
      console.error('Booqable API error:', booqableError);
      return res.status(500).json({
        success: false,
        error: `Failed to fetch order from Booqable: ${booqableError instanceof Error ? booqableError.message : 'Unknown Booqable error'}`
      });
    }

    if (!orderData.order) {
      console.log('Order not found in Booqable response');
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const order = orderData.order;
    const orderTotal = parseFloat(order.total_in_cents) / 100;
    
    // Calculate payment schedule
    const schedule = calculatePaymentSchedule(orderTotal, order.starts_at);
    
    // Get payment status from order properties
    const properties = order.properties || {};
    const depositPaid = properties.deposit_paid === 'true' || properties.deposit_paid === true;
    const finalPaid = properties.final_paid === 'true' || properties.final_paid === true;
    
    const paymentSchedule = {
      ...schedule,
      deposit_paid: depositPaid,
      deposit_paid_date: properties.deposit_paid_date,
      final_paid: finalPaid,
      final_paid_date: properties.final_paid_date
    };

    // Generate mock invoices (in production, these would be stored in database)
    const invoices = [];
    
    if (depositPaid) {
      invoices.push({
        id: `dep_${orderId}`,
        type: 'deposit',
        amount: schedule.deposit_amount,
        issued_date: properties.deposit_paid_date || new Date().toISOString(),
        due_date: schedule.deposit_due_date,
        paid_date: properties.deposit_paid_date,
        status: 'paid',
        stripe_payment_intent_id: properties.deposit_payment_intent_id
      });
    }
    
    if (finalPaid) {
      invoices.push({
        id: `final_${orderId}`,
        type: 'final',
        amount: schedule.final_amount,
        issued_date: properties.final_paid_date || new Date().toISOString(),
        due_date: schedule.final_due_date,
        paid_date: properties.final_paid_date,
        status: 'paid',
        stripe_payment_intent_id: properties.final_payment_intent_id
      });
    }

    // Calculate outstanding balance
    let outstandingBalance = null;
    const now = new Date();
    
    if (!depositPaid) {
      const daysOverdue = Math.max(0, Math.ceil((now.getTime() - new Date(schedule.deposit_due_date).getTime()) / (1000 * 60 * 60 * 24)));
      outstandingBalance = {
        amount: schedule.deposit_amount,
        due_date: schedule.deposit_due_date,
        type: 'deposit',
        days_overdue: daysOverdue > 0 ? daysOverdue : undefined
      };
    } else if (!finalPaid && new Date(schedule.final_due_date) <= now) {
      const daysOverdue = Math.ceil((now.getTime() - new Date(schedule.final_due_date).getTime()) / (1000 * 60 * 60 * 24));
      outstandingBalance = {
        amount: schedule.final_amount,
        due_date: schedule.final_due_date,
        type: 'final',
        days_overdue: daysOverdue > 0 ? daysOverdue : undefined
      };
    }

    res.json({
      success: true,
      data: {
        schedule: paymentSchedule,
        invoices,
        outstanding_balance: outstandingBalance
      }
    });

  } catch (error) {
    console.error('Error fetching payment details for order', req.params.orderId, ':', error);

    // Return more specific error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    res.status(500).json({
      success: false,
      error: `Failed to fetch payment details: ${errorMessage}`
    });
  }
};

// Process a payment (deposit or final)
export const processPayment: RequestHandler = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { payment_type, amount } = req.body;

    if (!orderId || !payment_type || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Order ID, payment type, and amount are required'
      });
    }

    // Get order details
    const orderData = await booqableRequest(`/orders/${orderId}`);
    
    if (!orderData.order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const order = orderData.order;

    if (!stripe) {
      return res.status(500).json({ success: false, error: 'Stripe is not configured' });
    }
    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `${payment_type.charAt(0).toUpperCase() + payment_type.slice(1)} Payment - Order #${order.number}`,
              description: `${payment_type} payment for costume rental order`,
            },
            unit_amount: Math.round(amount * 100), // Convert to pence
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}/orders/${orderId}/payment-success?session_id={CHECKOUT_SESSION_ID}&type=${payment_type}`,
      cancel_url: `${process.env.CLIENT_URL}/orders/${orderId}`,
      metadata: {
        order_id: orderId,
        payment_type,
        booqable_order_number: order.number
      },
      customer_email: order.customer?.email,
    });

    res.json({
      success: true,
      data: {
        checkout_url: session.url,
        session_id: session.id
      }
    });

  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process payment'
    });
  }
};

// Handle successful payment webhook
export const handlePaymentSuccess: RequestHandler = async (req, res) => {
  try {
    const { session_id, order_id, payment_type } = req.body;

    if (!session_id || !order_id || !payment_type) {
      return res.status(400).json({
        success: false,
        error: 'Session ID, order ID, and payment type are required'
      });
    }

    if (!stripe) {
      return res.status(500).json({ success: false, error: 'Stripe is not configured' });
    }
    // Get the Stripe session
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    if (session.payment_status !== 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Payment not completed'
      });
    }

    // Get order details
    const orderData = await booqableRequest(`/orders/${order_id}`);
    
    if (!orderData.order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const order = orderData.order;
    const properties = order.properties || {};

    // Update order with payment information
    const updatedProperties = {
      ...properties,
      [`${payment_type}_paid`]: 'true',
      [`${payment_type}_paid_date`]: new Date().toISOString(),
      [`${payment_type}_payment_intent_id`]: session.payment_intent,
      [`${payment_type}_amount`]: session.amount_total / 100
    };

    // Update payment status in order
    if (payment_type === 'final' || (payment_type === 'deposit' && properties.final_paid)) {
      updatedProperties.payment_status = 'paid';
    } else if (payment_type === 'deposit') {
      updatedProperties.payment_status = 'partially_paid';
    }

    await booqableRequest(`/orders/${order_id}`, {
      method: 'PUT',
      body: JSON.stringify({
        order: {
          properties: updatedProperties,
          payment_status: updatedProperties.payment_status
        }
      })
    });

    console.log(`${payment_type} payment completed for order ${order_id}: £${session.amount_total / 100}`);

    res.json({
      success: true,
      data: {
        payment_type,
        amount: session.amount_total / 100,
        paid_date: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error handling payment success:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process payment confirmation'
    });
  }
};

// Download invoice/receipt
export const downloadInvoice: RequestHandler = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        error: 'Invoice ID is required'
      });
    }

    // Extract order ID and payment type from invoice ID
    const [type, orderId] = invoiceId.split('_');
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid invoice ID format'
      });
    }

    // Get order details
    const orderData = await booqableRequest(`/orders/${orderId}`);
    
    if (!orderData.order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // In a real implementation, you would generate a PDF invoice here
    // For now, we'll return a simple JSON response
    const invoice = {
      invoice_id: invoiceId,
      order_number: orderData.order.number,
      type: type === 'dep' ? 'deposit' : 'final',
      amount: type === 'dep' 
        ? parseFloat(orderData.order.total_in_cents) / 100 * 0.3
        : parseFloat(orderData.order.total_in_cents) / 100 * 0.7,
      issued_date: new Date().toISOString(),
      customer: orderData.order.customer
    };

    res.json({
      success: true,
      data: invoice,
      message: 'In production, this would generate and return a PDF invoice'
    });

  } catch (error) {
    console.error('Error downloading invoice:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download invoice'
    });
  }
};

// Get payment methods for a customer
export const getCustomerPaymentMethods: RequestHandler = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: 'Customer ID is required'
      });
    }

    if (!stripe) {
      return res.status(500).json({ success: false, error: 'Stripe is not configured' });
    }
    // Get payment methods from Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    res.json({
      success: true,
      data: paymentMethods.data.map(pm => ({
        id: pm.id,
        type: pm.type,
        card: {
          brand: pm.card?.brand,
          last4: pm.card?.last4,
          exp_month: pm.card?.exp_month,
          exp_year: pm.card?.exp_year
        },
        created: pm.created
      }))
    });

  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment methods'
    });
  }
};
