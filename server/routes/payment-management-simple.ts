import { RequestHandler } from "express";

// Simplified payment management without full Stripe integration
// Returns mock payment data for demonstration purposes

export const getOrderPayments: RequestHandler = async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log('getOrderPayments called with orderId:', orderId);

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

    // Mock payment data based on orderId
    const mockOrderTotal = parseFloat((Math.random() * 500 + 100).toFixed(2));
    const depositAmount = parseFloat((mockOrderTotal * 0.3).toFixed(2));
    const finalAmount = parseFloat((mockOrderTotal * 0.7).toFixed(2));
    
    const now = new Date();
    const depositDueDate = new Date();
    depositDueDate.setDate(depositDueDate.getDate() + 1);
    
    const finalDueDate = new Date();
    finalDueDate.setDate(finalDueDate.getDate() + 14);
    
    // Simulate different payment states based on orderId
    const orderIdNum = parseInt(orderId.replace(/\D/g, ''), 10) || 1;
    const depositPaid = orderIdNum % 3 !== 0; // 2/3 of orders have deposit paid
    const finalPaid = orderIdNum % 4 === 0; // 1/4 of orders are fully paid
    
    const paymentSchedule = {
      deposit_amount: depositAmount,
      deposit_due_date: depositDueDate.toISOString(),
      deposit_paid: depositPaid,
      deposit_paid_date: depositPaid ? new Date(Date.now() - 86400000).toISOString() : null,
      final_amount: finalAmount,
      final_due_date: finalDueDate.toISOString(),
      final_paid: finalPaid,
      final_paid_date: finalPaid ? new Date(Date.now() - 43200000).toISOString() : null,
      total_amount: mockOrderTotal,
      currency: 'GBP'
    };

    const invoices = [];
    if (depositPaid) {
      invoices.push({
        id: `deposit_${orderId}`,
        type: 'deposit',
        amount: depositAmount,
        issued_date: paymentSchedule.deposit_paid_date,
        due_date: paymentSchedule.deposit_due_date,
        paid_date: paymentSchedule.deposit_paid_date,
        status: 'paid',
        download_url: `/api/invoices/deposit_${orderId}/download`
      });
    }

    if (finalPaid) {
      invoices.push({
        id: `final_${orderId}`,
        type: 'final',
        amount: finalAmount,
        issued_date: paymentSchedule.final_paid_date,
        due_date: paymentSchedule.final_due_date,
        paid_date: paymentSchedule.final_paid_date,
        status: 'paid',
        download_url: `/api/invoices/final_${orderId}/download`
      });
    }

    // Calculate outstanding balance
    let outstandingBalance = null;
    if (!depositPaid) {
      const daysOverdue = Math.max(0, Math.ceil((now.getTime() - new Date(paymentSchedule.deposit_due_date).getTime()) / (1000 * 60 * 60 * 24)));
      outstandingBalance = {
        amount: depositAmount,
        type: 'deposit',
        due_date: paymentSchedule.deposit_due_date,
        days_overdue: daysOverdue,
        is_overdue: daysOverdue > 0,
        description: 'Deposit payment required to confirm your booking'
      };
    } else if (!finalPaid) {
      const daysOverdue = Math.max(0, Math.ceil((now.getTime() - new Date(paymentSchedule.final_due_date).getTime()) / (1000 * 60 * 60 * 24)));
      outstandingBalance = {
        amount: finalAmount,
        type: 'final',
        due_date: paymentSchedule.final_due_date,
        days_overdue: daysOverdue,
        is_overdue: daysOverdue > 0,
        description: 'Final payment due before rental period'
      };
    }

    res.json({
      success: true,
      data: {
        schedule: paymentSchedule,
        invoices: invoices,
        outstanding_balance: outstandingBalance
      }
    });

  } catch (error) {
    console.error('Error fetching payment details for order', req.params.orderId, ':', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    res.status(500).json({
      success: false,
      error: `Failed to fetch payment details: ${errorMessage}`
    });
  }
};

// Mock payment processing
export const processPayment: RequestHandler = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentType, amount } = req.body;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Simulate payment processing
    console.log(`Processing ${paymentType} payment for order ${orderId}: £${amount}`);
    
    // In a real implementation, this would integrate with Stripe
    const paymentIntent = {
      id: `pi_mock_${Date.now()}`,
      status: 'succeeded',
      amount: amount * 100, // Convert to cents
      currency: 'gbp'
    };

    res.json({
      success: true,
      data: {
        payment_intent: paymentIntent,
        redirect_url: `/orders/${orderId}?payment=success`
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

// Mock payment success handler
export const handlePaymentSuccess: RequestHandler = async (req, res) => {
  try {
    console.log('Payment success webhook received:', req.body);
    
    res.json({
      success: true,
      message: 'Payment success handled'
    });

  } catch (error) {
    console.error('Error handling payment success:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to handle payment success'
    });
  }
};

// Mock invoice download
export const downloadInvoice: RequestHandler = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // In a real implementation, generate and return PDF
    res.json({
      success: true,
      data: {
        download_url: `https://example.com/invoices/${invoiceId}.pdf`,
        expires_at: new Date(Date.now() + 3600000).toISOString() // 1 hour
      }
    });

  } catch (error) {
    console.error('Error downloading invoice:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download invoice'
    });
  }
};

// Mock customer payment methods
export const getCustomerPaymentMethods: RequestHandler = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Mock payment methods
    const paymentMethods = [
      {
        id: 'pm_mock_card_1',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '4242',
          exp_month: 12,
          exp_year: 2025
        },
        is_default: true
      }
    ];

    res.json({
      success: true,
      data: paymentMethods
    });

  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment methods'
    });
  }
};
