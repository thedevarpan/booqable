import { RequestHandler } from "express";

import admin, { adminDb } from "../lib/firebase-admin";
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

// Stock alert data model
interface StockAlert {
  id: string;
  user_id: string;
  product_id: string;
  product_name: string;
  product_image: string;
  start_date: string;
  end_date: string;
  email: string;
  phone?: string;
  created_at: string;
  triggered_at?: string;
  status: 'active' | 'triggered' | 'expired';
}

// Check if a product is available for given dates
async function checkProductAvailability(productId: string, startDate: string, endDate: string): Promise<boolean> {
  try {
    // This is a simplified availability check
    // In production, you'd check against the actual Booqable calendar/availability API
    const response = await booqableRequest(`/products/${productId}`);
    
    if (!response.product) {
      return false;
    }

    // Mock availability check - in production, integrate with calendar API
    // For demo purposes, assume 80% availability
    return Math.random() > 0.2;
  } catch (error) {
    console.error('Error checking product availability:', error);
    return false;
  }
}


// Create a new stock alert
export const createStockAlert: RequestHandler = async (req, res) => {
  try {
    const userId = req.user?.uid;
    const { product_id, product_name, product_image, start_date, end_date, email, phone } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    if (!product_id || !product_name || !start_date || !end_date || !email) {
      return res.status(400).json({
        success: false,
        error: 'Product ID, name, dates, and email are required'
      });
    }

    // Validate dates
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);
    const now = new Date();

    if (startDateObj <= now) {
      return res.status(400).json({
        success: false,
        error: 'Start date must be in the future'
      });
    }

    if (endDateObj <= startDateObj) {
      return res.status(400).json({
        success: false,
        error: 'End date must be after start date'
      });
    }

    // Check if alert already exists for this user/product/dates
    const existingSnap = await adminDb
      .collection('users').doc(userId)
      .collection('stock_alerts')
      .where('product_id', '==', product_id)
      .where('start_date', '==', start_date)
      .where('end_date', '==', end_date)
      .where('status', '==', 'active')
      .get();

    if (!existingSnap.empty) {
      return res.status(400).json({
        success: false,
        error: 'You already have an active alert for this product and date range'
      });
    }

    // Verify product exists
    try {
      await booqableRequest(`/products/${product_id}`);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Create new alert
    const alertsRef = adminDb.collection('users').doc(userId).collection('stock_alerts');
    const docRef = alertsRef.doc();
    const newAlert: StockAlert = {
      id: docRef.id,
      user_id: userId,
      product_id,
      product_name,
      product_image: product_image || '/placeholder.svg',
      start_date,
      end_date,
      email,
      phone,
      created_at: new Date().toISOString(),
      status: 'active'
    };

    await docRef.set(newAlert);

    console.log(`📅 Stock alert created: ${product_name} for ${email} (${start_date} to ${end_date})`);

    res.json({
      success: true,
      data: {
        alert: newAlert
      }
    });

  } catch (error) {
    console.error('Error creating stock alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create stock alert'
    });
  }
};

// Get user's stock alerts
export const getUserStockAlerts: RequestHandler = async (req, res) => {
  try {
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    // Get alerts for this user from Firestore
    const snap = await adminDb.collection('users').doc(userId).collection('stock_alerts').orderBy('created_at', 'desc').get();
    const userAlerts = snap.docs.map(d => d.data() as StockAlert);

    // Update status to expired for past alerts (non-blocking)
    const now = new Date();
    await Promise.all(userAlerts.map(async (alert) => {
      if (new Date(alert.end_date) < now && alert.status === 'active') {
        await adminDb.collection('users').doc(userId).collection('stock_alerts').doc(alert.id).update({ status: 'expired' });
        alert.status = 'expired';
      }
    }));

    res.json({
      success: true,
      data: {
        alerts: userAlerts
      }
    });

  } catch (error) {
    console.error('Error fetching user stock alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stock alerts'
    });
  }
};

// Delete a stock alert
export const deleteStockAlert: RequestHandler = async (req, res) => {
  try {
    const userId = req.user?.uid;
    const { alertId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    if (!alertId) {
      return res.status(400).json({
        success: false,
        error: 'Alert ID is required'
      });
    }

    // Verify document exists under this user and delete
    const docRef = adminDb.collection('users').doc(userId).collection('stock_alerts').doc(alertId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found or you do not have permission to delete it'
      });
    }

    await docRef.delete();
    console.log(`🗑️ Stock alert deleted: ${alertId}`);

    res.json({
      success: true,
      data: {
        deleted_alert_id: alertId
      }
    });

  } catch (error) {
    console.error('Error deleting stock alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete stock alert'
    });
  }
};

// Check availability for all active alerts (background job)
export const checkAllAlertsAvailability: RequestHandler = async (req, res) => {
  try {
    console.log('🔍 Checking availability for all active stock alerts...');
    
    const snap = await adminDb.collectionGroup('stock_alerts').where('status', '==', 'active').get();
    let notificationsTriggered = 0;

    for (const d of snap.docs) {
      const alert = d.data() as StockAlert;
      try {
        const isAvailable = await checkProductAvailability(alert.product_id, alert.start_date, alert.end_date);

        if (isAvailable) {
          // Create Firestore in-app notification
          try {
            const nref = adminDb.collection('users').doc(alert.user_id).collection('notifications').doc();
            await nref.set({
              title: 'Wishlist Item Available',
              message: `The item '${alert.product_name}' is back in stock.`,
              type: 'wishlist',
              isRead: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          } catch (e) {
            console.warn('Failed to write wishlist notification to Firestore:', e);
          }

          // Update alert status
          await d.ref.update({ status: 'triggered', triggered_at: new Date().toISOString() });
          notificationsTriggered++;
          console.log(`✅ Notification created for ${alert.product_name} to ${alert.email}`);
        }
      } catch (error) {
        console.error(`Error checking alert ${alert.id}:`, error);
      }
    }

    res.json({
      success: true,
      data: {
        alerts_checked: snap.size,
        notifications_sent: notificationsTriggered
      }
    });

  } catch (error) {
    console.error('Error checking alerts availability:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check alerts availability'
    });
  }
};

// Get alert statistics
export const getAlertStatistics: RequestHandler = async (req, res) => {
  try {
    const snap = await adminDb.collectionGroup('stock_alerts').get();
    const alerts = snap.docs.map(d => d.data() as StockAlert);

    const totalAlerts = alerts.length;
    const activeAlerts = alerts.filter(alert => alert.status === 'active').length;
    const triggeredAlerts = alerts.filter(alert => alert.status === 'triggered').length;
    const expiredAlerts = alerts.filter(alert => alert.status === 'expired').length;

    // Group by product
    const productAlerts = alerts.reduce((acc, alert) => {
      acc[alert.product_id] = (acc[alert.product_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostRequestedProducts = Object.entries(productAlerts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([productId, count]) => ({
        product_id: productId,
        alert_count: count
      }));

    res.json({
      success: true,
      data: {
        statistics: {
          total_alerts: totalAlerts,
          active_alerts: activeAlerts,
          triggered_alerts: triggeredAlerts,
          expired_alerts: expiredAlerts
        },
        most_requested_products: mostRequestedProducts
      }
    });

  } catch (error) {
    console.error('Error getting alert statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get alert statistics'
    });
  }
};

// Trigger a manual notification for testing
export const triggerTestNotification: RequestHandler = async (req, res) => {
  try {
    const { alertId } = req.params;

    if (!alertId) {
      return res.status(400).json({
        success: false,
        error: 'Alert ID is required'
      });
    }

    // Find the alert document in Firestore (collectionGroup search)
    const snap = await adminDb.collectionGroup('stock_alerts').where('id', '==', alertId).limit(1).get();
    if (snap.empty) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    const doc = snap.docs[0];
    const alert = doc.data() as StockAlert;

    // Create an in-app notification for the user
    try {
      const nref = adminDb.collection('users').doc(alert.user_id).collection('notifications').doc();
      await nref.set({
        title: 'Wishlist Item Available',
        message: `The item '${alert.product_name}' is back in stock.`,
        type: 'wishlist',
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (e) {
      console.warn('Failed to write wishlist notification to Firestore:', e);
    }

    // Update alert document status
    try {
      await doc.ref.update({ status: 'triggered', triggered_at: new Date().toISOString() });
    } catch (e) {
      console.warn('Failed to update alert status:', e);
    }

    res.json({
      success: true,
      data: {
        notification_sent: true,
        alert: { ...alert, status: 'triggered', triggered_at: new Date().toISOString() }
      }
    });

  } catch (error) {
    console.error('Error triggering test notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger test notification'
    });
  }
};
