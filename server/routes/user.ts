import { RequestHandler } from "express";
import admin, { adminDb } from "../lib/firebase-admin";

const BOOQABLE_BASE_URL = process.env.BOOQABLE_BASE_URL;
const BOOQABLE_API_KEY = process.env.BOOQABLE_API_KEY;

// Preferences (users/{uid}/preferences)
export const getUserPreferences: RequestHandler = async (req: any, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'User not authenticated' });
    const ref = adminDb.collection('users').doc(req.user.uid).collection('preferences').doc('default');
    const snap = await ref.get();
    if (!snap.exists) {
      const prefs = { theme: 'light', notifications: true, defaultView: 'orders', lastLogin: new Date() };
      await ref.set(prefs);
      return res.json({ success: true, data: prefs });
    }
    const data = snap.data();
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to fetch preferences' });
  }
};

export const updateUserPreferences: RequestHandler = async (req: any, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'User not authenticated' });
    const ref = adminDb.collection('users').doc(req.user.uid).collection('preferences').doc('default');
    await ref.set({ ...req.body, lastLogin: new Date() }, { merge: true });
    const snap = await ref.get();
    res.json({ success: true, data: snap.data() });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to update preferences' });
  }
};

// Notes (users/{uid}/notes)
export const addUserNote: RequestHandler = async (req: any, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'User not authenticated' });
    const { orderId, message } = req.body || {};
    if (!message) return res.status(400).json({ success: false, error: 'message is required' });
    const ref = await adminDb.collection('users').doc(req.user.uid).collection('notes').add({
      orderId: orderId || '',
      message,
      createdAt: new Date()
    });
    res.json({ success: true, data: { id: ref.id } });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to add note' });
  }
};

export const getUserNotes: RequestHandler = async (req: any, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'User not authenticated' });
    const snap = await adminDb.collection('users').doc(req.user.uid).collection('notes').orderBy('createdAt', 'desc').get();
    const notes = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
    res.json({ success: true, data: notes });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to fetch notes' });
  }
};

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

// Get user profile from Firestore
export const getUserProfile: RequestHandler = async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const userDoc = await adminDb.collection('users').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found'
      });
    }

    res.json({
      success: true,
      data: userDoc.data()
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile'
    });
  }
};

// Get user orders from Booqable and sync to Firestore (users/{uid}/orders)
export const getUserOrders: RequestHandler = async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const userDoc = await adminDb.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'User profile not found' });
    }

    const userProfile = userDoc.data();
    const booqableCustomerId = userProfile?.booqableCustomerId;

    if (!booqableCustomerId) {
      return res.json({ success: true, data: { orders: [], pagination: { current_page: 1, total_pages: 0, total_count: 0, per_page: 20 } } });
    }

    const { page = 1, limit = 20 } = req.query;
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: limit.toString(),
      'filter[customer_id]': booqableCustomerId.toString(),
      include: 'lines,lines.item'
    });

    const data = await booqableRequest(`/orders?${params}`);

    const orders = (data.orders || []).map((order: any) => {
      const total = parseFloat(order.total_in_cents) / 100;
      const deposit = parseFloat((total * 0.1).toFixed(2));
      const balance = parseFloat((total - deposit).toFixed(2));
      return {
        id: order.id,
        number: order.number,
        status: order.status,
        payment_status: order.payment_status,
        start_date: order.starts_at,
        end_date: order.stops_at,
        total_amount: total,
        currency: 'GBP',
        items: order.lines?.map((line: any) => ({
          id: line.id,
          product_id: line.item?.id,
          product_name: line.item?.name,
          qty: line.quantity,
          price: parseFloat(line.price_in_cents) / 100
        })) || [],
        delivery_address: {
          line1: order.delivery_address_line_1 || '',
          line2: order.delivery_address_line_2 || '',
          city: order.delivery_address_city || '',
          postcode: order.delivery_address_zipcode || '',
          country: order.delivery_address_country || 'GB'
        },
        created_at: order.created_at,
        updated_at: order.updated_at,
        deposit,
        balance,
        booqableOrderId: order.id,
        invoiceUrl: '',
        packingSlipUrl: ''
      };
    });

    // Sync to Firestore subcollection and create notifications
    const batch = adminDb.batch();
    const ordersCol = adminDb.collection('users').doc(req.user.uid).collection('orders');
    const notifsCol = adminDb.collection('users').doc(req.user.uid).collection('notifications');

    for (const o of orders) {
      const ref = ordersCol.doc(o.id);
      const existing = await ref.get();
      const prevStatus = existing.exists ? (existing.data() as any).status : null;

      batch.set(ref, {
        booqableOrderId: o.booqableOrderId,
        products: o.items.map((i: any) => ({ productId: i.product_id, name: i.product_name, qty: i.qty, price: i.price })),
        rentalPeriod: { start: o.start_date, end: o.end_date },
        status: o.status,
        invoiceUrl: o.invoiceUrl,
        packingSlipUrl: o.packingSlipUrl,
        totalAmount: o.total_amount,
        deposit: o.deposit,
        balance: o.balance,
        createdAt: new Date(o.created_at),
        updatedAt: new Date(o.updated_at)
      }, { merge: true });

      if (!existing.exists) {
        const nref = notifsCol.doc();
        batch.set(nref, {
          title: 'Order Confirmed',
          message: `Your order #${o.number} has been placed successfully.`,
          type: 'order',
          orderId: o.id,
          isRead: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else if (prevStatus && prevStatus !== o.status) {
        const nref = notifsCol.doc();
        batch.set(nref, {
          title: 'Order Status Updated',
          message: `Your order #${o.number} status changed to ${o.status}.`,
          type: 'order',
          orderId: o.id,
          isRead: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    await batch.commit();

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          current_page: parseInt(page.toString()),
          total_pages: data.meta?.total_pages || 1,
          total_count: data.meta?.total_count || orders.length,
          per_page: parseInt(limit.toString())
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user orders' });
  }
};

// Update user profile
export const updateUserProfile: RequestHandler = async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const updates = req.body;
    delete updates.uid;
    delete updates.booqableCustomerId;
    delete updates.createdAt;

    updates.updatedAt = new Date();

    await adminDb.collection('users').doc(req.user.uid).set(updates, { merge: true });

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ success: false, error: 'Failed to update user profile' });
  }
};

// Add item to wishlist (users/{uid}/wishlist/{product_id})
export const addToWishlist: RequestHandler = async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const { product_id, product_name, price_per_day, image_url, category } = req.body || {};
    if (!product_id || !product_name) {
      return res.status(400).json({ success: false, error: 'product_id and product_name are required' });
    }

    const docRef = adminDb.collection('users').doc(req.user.uid).collection('wishlist').doc(product_id);
    await docRef.set({
      productId: product_id,
      productName: product_name,
      thumbnail: image_url || '',
      pricePerDay: typeof price_per_day === 'number' ? price_per_day : 0,
      category: category || 'General',
      addedAt: new Date(),
    }, { merge: true });

    res.json({ success: true, message: 'Item added to wishlist' });
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.status(500).json({ success: false, error: 'Failed to add to wishlist' });
  }
};

// Remove item from wishlist (users/{uid}/wishlist/{product_id})
export const removeFromWishlist: RequestHandler = async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const { product_id } = req.params;
    if (!product_id) {
      return res.status(400).json({ success: false, error: 'Product ID is required' });
    }

    await adminDb.collection('users').doc(req.user.uid).collection('wishlist').doc(product_id).delete();

    res.json({ success: true, message: 'Item removed from wishlist' });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.status(500).json({ success: false, error: 'Failed to remove from wishlist' });
  }
};

// Get user wishlist (users/{uid}/wishlist)
export const getUserWishlist: RequestHandler = async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const snap = await adminDb.collection('users').doc(req.user.uid).collection('wishlist').orderBy('addedAt', 'desc').get();

    const items: any[] = [];
    for (const doc of snap.docs) {
      const d = doc.data();
      let price = typeof d.pricePerDay === 'number' ? d.pricePerDay : 0;
      let image = d.thumbnail || '/placeholder.svg';
      let category = d.category || 'General';

      if (price === 0 || image === '/placeholder.svg') {
        try {
          const productData = await booqableRequest(`/products/${d.productId}?include=images,collections,properties`);
          if (productData.product) {
            if (price === 0) {
              if (productData.product.base_price_in_cents) price = parseFloat(productData.product.base_price_in_cents) / 100;
              else if (productData.product.price_in_cents) price = parseFloat(productData.product.price_in_cents) / 100;
            }
            if (image === '/placeholder.svg') {
              if (productData.product.photos?.length > 0) image = productData.product.photos[0].original_url || productData.product.photos[0].original || image;
              else if (productData.product.photo_url) image = productData.product.photo_url;
            }
            const collectionIds = productData.product.relationships?.collections?.data?.map((c: any) => c.id) || [];
            const productCollections = productData.included?.filter((inc: any) => inc.type === 'collections' && collectionIds.includes(inc.id)) || [];
            if (productCollections.length > 0) category = productCollections[0].attributes?.name || category;
          }
        } catch {}
      }

      items.push({
        id: d.productId,
        product_id: d.productId,
        product_name: d.productName || 'Product',
        price_per_day: price,
        image_url: image,
        category,
        added_date: d.addedAt?.toDate ? d.addedAt.toDate().toISOString() : (d.addedAt?.toISOString ? d.addedAt.toISOString() : new Date().toISOString()),
        is_available: true,
      });
    }

    res.json({ success: true, data: { items, count: items.length } });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch wishlist' });
  }
};
