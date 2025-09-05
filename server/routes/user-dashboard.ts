import { RequestHandler } from "express";
import { adminDb } from "../lib/firebase-admin";

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

// Get customer by email from Booqable
async function getBooqableCustomerByEmail(email: string) {
  try {
    const params = new URLSearchParams({
      'filter[email]': email
    });
    
    const data = await booqableRequest(`/customers?${params}`);
    return data.customers?.[0] || null;
  } catch (error) {
    console.error('Error fetching customer by email:', error);
    return null;
  }
}

// Create a new customer in Booqable
async function createBooqableCustomer(payload: {
  email: string;
  name?: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    postcode?: string;
    country?: string;
  }
  firebase_uid?: string;
}) {
  const customerData: any = {
    customer: {
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      phone: payload.phone || '',
      properties: payload.firebase_uid ? { firebase_uid: payload.firebase_uid } : {},
    }
  };

  if (payload.address) {
    customerData.customer.address_line_1 = payload.address.line1 || '';
    customerData.customer.address_line_2 = payload.address.line2 || '';
    customerData.customer.address_city = payload.address.city || '';
    customerData.customer.address_zipcode = payload.address.postcode || '';
    customerData.customer.address_country = payload.address.country || 'GB';
  }

  const data = await booqableRequest('/customers', {
    method: 'POST',
    body: JSON.stringify(customerData)
  });

  return data.customer;
}

// Update an existing customer in Booqable
async function updateBooqableCustomer(customerId: string, payload: {
  name?: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    postcode?: string;
    country?: string;
  }
}) {
  const updateData: any = { customer: {} };

  if (payload.name !== undefined) updateData.customer.name = payload.name;
  if (payload.phone !== undefined) updateData.customer.phone = payload.phone;
  if (payload.address) {
    updateData.customer.address_line_1 = payload.address.line1 || '';
    updateData.customer.address_line_2 = payload.address.line2 || '';
    updateData.customer.address_city = payload.address.city || '';
    updateData.customer.address_zipcode = payload.address.postcode || '';
    updateData.customer.address_country = payload.address.country || 'GB';
  }

  const data = await booqableRequest(`/customers/${customerId}`, {
    method: 'PUT',
    body: JSON.stringify(updateData)
  });

  return data.customer;
}

// Get complete dashboard data for a user; ensures customer exists and is isolated to auth user
export const getDashboardData: RequestHandler = async (req: any, res) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const queryEmail = (req.query.email as string | undefined)?.toLowerCase();
    const userEmail = req.user.email.toLowerCase();

    // Enforce data isolation: ignore mismatched email query
    const email = queryEmail && queryEmail === userEmail ? userEmail : userEmail;

    console.log(`Fetching dashboard data for email: ${email}`);

    // Try to find customer by email
    let customer = await getBooqableCustomerByEmail(email);

    // If not found, create and store ID in Firestore
    if (!customer) {
      console.log('Customer not found in Booqable. Creating new customer...');
      customer = await createBooqableCustomer({ email, firebase_uid: req.user.uid });

      try {
        await adminDb.collection('users').doc(req.user.uid).set({
          booqableCustomerId: customer.id,
          updatedAt: new Date()
        }, { merge: true });
      } catch (e) {
        console.warn('Failed to store booqableCustomerId in Firestore:', e);
      }

      // Return empty stats for new customers
      return res.json({
        success: true,
        data: {
          customer: {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone || '',
            created_at: customer.created_at
          },
          stats: {
            totalOrders: 0,
            upcomingOrders: 0,
            totalSpent: 0,
            recentOrdersCount: 0,
            wishlistItems: 0
          },
          recentOrders: [],
          summary: {
            hasOrders: false,
            message: "Welcome! You haven't placed any orders yet."
          }
        }
      });
    }

    console.log(`Found customer: ${customer.id} - ${customer.name}`);

    // Fetch customer's orders
    const ordersParams = new URLSearchParams({
      'filter[customer_id]': customer.id,
      'include': 'lines,lines.item',
      'sort': '-created_at'
    });

    const ordersData = await booqableRequest(`/orders?${ordersParams}`);
    const orders = ordersData.orders || [];

    console.log(`Found ${orders.length} orders for customer`);

    // Process orders to get real product data
    const processedOrders = [] as any[];
    const now = new Date();
    let totalSpent = 0;
    let upcomingOrdersCount = 0;

    for (const order of orders) {
      const orderStartDate = new Date(order.starts_at);
      const orderEndDate = new Date(order.stops_at);
      const orderTotal = parseFloat(order.total_in_cents) / 100;
      
      totalSpent += orderTotal;
      
      if (orderStartDate > now) {
        upcomingOrdersCount++;
      }

      const orderItems = [] as any[];
      let primaryProductImage = '/placeholder.svg';
      let primaryProductName = 'Multiple Items';

      if (order.lines && order.lines.length > 0) {
        for (const line of order.lines) {
          if (line.item) {
            try {
              const productData = await booqableRequest(`/products/${line.item.id}?include=images,collections,properties`);
              if (productData.product) {
                let productImages = ['/placeholder.svg'];
                if (productData.included) {
                  const includedImages = productData.included.filter((item: any) =>
                    (item.type === 'images' || item.type === 'photos') && item.attributes?.owner_id === productData.product.id
                  );
                  const realImages = includedImages
                    .map((img: any) => img.attributes?.original_url || img.attributes?.large_url || img.attributes?.url)
                    .filter(Boolean);
                  if (realImages.length > 0) {
                    productImages = realImages;
                  }
                }
                if (productImages.length === 1 && productImages[0] === '/placeholder.svg' && productData.product.photo_url) {
                  productImages = [productData.product.photo_url];
                }
                if (orderItems.length === 0) {
                  primaryProductImage = productImages[0];
                  primaryProductName = productData.product.name;
                }
                orderItems.push({
                  id: line.item.id,
                  name: productData.product.name,
                  image: productImages[0],
                  quantity: line.quantity,
                  price: parseFloat(line.price_in_cents) / 100
                });
              }
            } catch (error) {
              console.error(`Error fetching product details for ${line.item.id}:`, error);
              orderItems.push({
                id: line.item.id,
                name: line.item.name,
                image: '/placeholder.svg',
                quantity: line.quantity,
                price: parseFloat(line.price_in_cents) / 100
              });
            }
          }
        }
      }

      processedOrders.push({
        id: order.id,
        number: order.number,
        status: order.status,
        payment_status: order.payment_status,
        start_date: order.starts_at,
        end_date: order.stops_at,
        total_amount: orderTotal,
        currency: 'GBP',
        items: orderItems,
        primary_product_name: primaryProductName,
        primary_product_image: primaryProductImage,
        delivery_address: {
          line1: order.delivery_address_line_1 || '',
          line2: order.delivery_address_line_2 || '',
          city: order.delivery_address_city || '',
          postcode: order.delivery_address_zipcode || '',
          country: order.delivery_address_country || 'GB'
        },
        created_at: order.created_at,
        updated_at: order.updated_at
      });
    }

    const recentOrders = processedOrders.slice(0, 3);

    // Fetch wishlist count from Firestore subcollection
    let wishlistCount = 0;
    try {
      const wishlistSnap = await adminDb.collection('users').doc(req.user.uid).collection('wishlist').get();
      wishlistCount = wishlistSnap.size;
    } catch (e) {
      console.warn('Failed to fetch wishlist count:', e);
    }

    const dashboardData = {
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone || '',
        created_at: customer.created_at
      },
      stats: {
        totalOrders: orders.length,
        upcomingOrders: upcomingOrdersCount,
        totalSpent: totalSpent,
        recentOrdersCount: recentOrders.length,
        wishlistItems: wishlistCount
      },
      recentOrders,
      summary: {
        hasOrders: orders.length > 0,
        message: orders.length > 0
          ? `You have ${orders.length} total orders and ${upcomingOrdersCount} upcoming rentals.`
          : "Welcome! Start browsing our costume collection to place your first order."
      }
    };

    res.json({ success: true, data: dashboardData });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
  }
};

// Get user's wishlist by email (from Booqable customer properties)
export const getWishlistByEmail: RequestHandler = async (req: any, res) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const customer = await getBooqableCustomerByEmail(req.user.email);

    if (!customer) {
      return res.json({ success: true, data: { items: [], count: 0 } });
    }

    res.json({
      success: true,
      data: {
        items: [],
        count: 0,
        message: "Wishlist functionality can be implemented using customer properties in Booqable"
      }
    });

  } catch (error) {
    console.error('Error fetching wishlist by email:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch wishlist' });
  }
};

// Get customer profile by email (auth optional, used for display-only)
export const getCustomerProfile: RequestHandler = async (req: any, res) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const customer = await getBooqableCustomerByEmail(req.user.email);

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    const profile = {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone || '',
      address: {
        line1: customer.address_line_1 || '',
        line2: customer.address_line_2 || '',
        city: customer.address_city || '',
        postcode: customer.address_zipcode || '',
        country: customer.address_country || 'GB'
      },
      created_at: customer.created_at,
      updated_at: customer.updated_at
    };

    res.json({ success: true, data: profile });

  } catch (error) {
    console.error('Error fetching customer profile:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch customer profile' });
  }
};

// Update the authenticated user's Booqable customer profile (name, phone, address)
export const updateCustomerProfile: RequestHandler = async (req: any, res) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const { name, phone, address } = req.body || {};

    // Get or create the Booqable customer tied to this email
    let customer = await getBooqableCustomerByEmail(req.user.email);

    if (!customer) {
      customer = await createBooqableCustomer({
        email: req.user.email,
        name,
        phone,
        address,
        firebase_uid: req.user.uid
      });

      try {
        await adminDb.collection('users').doc(req.user.uid).set({
          booqableCustomerId: customer.id,
          updatedAt: new Date()
        }, { merge: true });
      } catch (e) {
        console.warn('Failed to store booqableCustomerId in Firestore during update:', e);
      }
    }

    // Update customer in Booqable
    const updated = await updateBooqableCustomer(customer.id, { name, phone, address });

    const profile = {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone || '',
      address: {
        line1: updated.address_line_1 || '',
        line2: updated.address_line_2 || '',
        city: updated.address_city || '',
        postcode: updated.address_zipcode || '',
        country: updated.address_country || 'GB'
      },
      created_at: updated.created_at,
      updated_at: updated.updated_at
    };

    res.json({ success: true, data: profile });
  } catch (error) {
    console.error('Error updating Booqable customer profile:', error);
    res.status(500).json({ success: false, error: 'Failed to update customer profile' });
  }
};
