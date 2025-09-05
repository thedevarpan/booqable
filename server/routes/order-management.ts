import { RequestHandler } from "express";

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

// Helper function to check if order can be modified based on business rules
function validateOrderModification(order: any) {
  const now = new Date();
  const rentalStart = new Date(order.starts_at);
  const daysUntilRental = Math.ceil((rentalStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    canModify: daysUntilRental > 28,
    canCancel: daysUntilRental > 28 && order.status !== 'cancelled',
    canReschedule: daysUntilRental > 14 && order.status === 'confirmed',
    daysUntilRental
  };
}

// Calculate refund amount based on cancellation timing
function calculateRefundAmount(order: any, daysUntilRental: number) {
  const totalAmount = parseFloat(order.total_in_cents) / 100;
  
  if (daysUntilRental > 28) return totalAmount;
  if (daysUntilRental > 14) return totalAmount * 0.8; // 20% fee
  if (daysUntilRental > 7) return totalAmount * 0.5; // 50% fee
  return 0; // No refund within 7 days
}

// Modify an existing order
export const modifyOrder: RequestHandler = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { start_date, end_date, items, special_instructions } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      });
    }

    // First, get the current order to validate modification rules
    const currentOrder = await booqableRequest(`/orders/${orderId}?include=lines`);
    
    if (!currentOrder.order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const { canModify, daysUntilRental } = validateOrderModification(currentOrder.order);
    
    if (!canModify) {
      return res.status(400).json({
        success: false,
        error: `Cannot modify order. Only ${daysUntilRental} days until rental (minimum 28 days required).`
      });
    }

    // Update the order in Booqable
    const updateData: any = {
      order: {
        ...(start_date && { starts_at: start_date }),
        ...(end_date && { stops_at: end_date }),
        ...(special_instructions && { 
          properties: { 
            ...currentOrder.order.properties,
            special_instructions 
          }
        })
      }
    };

    // If items are being modified, update the order lines
    if (items && items.length > 0) {
      updateData.order.lines_attributes = items.map((item: any) => ({
        id: item.id,
        quantity: item.quantity,
        _destroy: item.quantity === 0
      }));
    }

    const updatedOrder = await booqableRequest(`/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });

    // Log the modification for audit purposes
    console.log(`Order ${orderId} modified by user. Changes:`, {
      start_date,
      end_date,
      items_modified: !!items,
      instructions_updated: !!special_instructions
    });

    res.json({
      success: true,
      data: {
        id: updatedOrder.order.id,
        number: updatedOrder.order.number,
        status: updatedOrder.order.status,
        payment_status: updatedOrder.order.payment_status,
        start_date: updatedOrder.order.starts_at,
        end_date: updatedOrder.order.stops_at,
        total_amount: parseFloat(updatedOrder.order.total_in_cents) / 100,
        special_instructions: updatedOrder.order.properties?.special_instructions,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error modifying order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to modify order'
    });
  }
};

// Cancel an existing order
export const cancelOrder: RequestHandler = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason, refund_amount } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      });
    }

    // Get the current order
    const currentOrder = await booqableRequest(`/orders/${orderId}`);
    
    if (!currentOrder.order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const { canCancel, daysUntilRental } = validateOrderModification(currentOrder.order);
    
    if (!canCancel) {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel order. Only ${daysUntilRental} days until rental.`
      });
    }

    // Calculate refund amount
    const calculatedRefund = calculateRefundAmount(currentOrder.order, daysUntilRental);
    
    // Cancel the order in Booqable
    const cancelledOrder = await booqableRequest(`/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify({
        order: {
          status: 'cancelled',
          properties: {
            ...currentOrder.order.properties,
            cancellation_reason: reason,
            refund_amount: calculatedRefund,
            cancelled_at: new Date().toISOString()
          }
        }
      })
    });

    // TODO: Process refund through Stripe
    // This would typically involve creating a refund via Stripe API
    console.log(`Order ${orderId} cancelled. Refund amount: £${calculatedRefund}`);

    res.json({
      success: true,
      data: {
        id: cancelledOrder.order.id,
        number: cancelledOrder.order.number,
        status: 'cancelled',
        refund_amount: calculatedRefund,
        cancelled_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel order'
    });
  }
};

// Reschedule an existing order
export const rescheduleOrder: RequestHandler = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { new_start_date, new_end_date } = req.body;

    if (!orderId || !new_start_date || !new_end_date) {
      return res.status(400).json({
        success: false,
        error: 'Order ID, new start date, and new end date are required'
      });
    }

    // Get the current order
    const currentOrder = await booqableRequest(`/orders/${orderId}`);
    
    if (!currentOrder.order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const { canReschedule, daysUntilRental } = validateOrderModification(currentOrder.order);
    
    if (!canReschedule) {
      return res.status(400).json({
        success: false,
        error: `Cannot reschedule order. Only ${daysUntilRental} days until rental (minimum 14 days required).`
      });
    }

    // Check availability for new dates (simplified check)
    // In a real implementation, you'd check each item's availability
    const newStartDate = new Date(new_start_date);
    const newEndDate = new Date(new_end_date);
    const rentalDays = Math.ceil((newEndDate.getTime() - newStartDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (rentalDays < 1) {
      return res.status(400).json({
        success: false,
        error: 'End date must be after start date'
      });
    }

    // Update the order dates in Booqable
    const rescheduledOrder = await booqableRequest(`/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify({
        order: {
          starts_at: new_start_date,
          stops_at: new_end_date,
          properties: {
            ...currentOrder.order.properties,
            rescheduled_at: new Date().toISOString(),
            original_start_date: currentOrder.order.starts_at,
            original_end_date: currentOrder.order.stops_at
          }
        }
      })
    });

    console.log(`Order ${orderId} rescheduled from ${currentOrder.order.starts_at} to ${new_start_date}`);

    res.json({
      success: true,
      data: {
        id: rescheduledOrder.order.id,
        number: rescheduledOrder.order.number,
        status: rescheduledOrder.order.status,
        start_date: rescheduledOrder.order.starts_at,
        end_date: rescheduledOrder.order.stops_at,
        rescheduled_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error rescheduling order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reschedule order'
    });
  }
};

// Get order modification possibilities
export const getOrderModificationOptions: RequestHandler = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      });
    }

    // Get the current order
    const currentOrder = await booqableRequest(`/orders/${orderId}`);
    
    if (!currentOrder.order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const validation = validateOrderModification(currentOrder.order);
    const refundAmount = calculateRefundAmount(currentOrder.order, validation.daysUntilRental);

    res.json({
      success: true,
      data: {
        orderId,
        canModify: validation.canModify,
        canCancel: validation.canCancel,
        canReschedule: validation.canReschedule,
        daysUntilRental: validation.daysUntilRental,
        refundAmount,
        refundPercentage: Math.round((refundAmount / (parseFloat(currentOrder.order.total_in_cents) / 100)) * 100),
        businessRules: {
          modificationDeadline: '28 days before rental',
          cancellationDeadline: '28 days before rental (with fees after)',
          rescheduleDeadline: '14 days before rental'
        }
      }
    });

  } catch (error) {
    console.error('Error getting order modification options:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get order modification options'
    });
  }
};
