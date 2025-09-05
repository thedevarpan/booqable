import { RequestHandler } from "express";

const BOOQABLE_BASE_URL = process.env.BOOQABLE_BASE_URL;
const BOOQABLE_API_KEY = process.env.BOOQABLE_API_KEY;

// Helper function to make authenticated requests to Booqable API with timeout
async function booqableRequest(endpoint: string, options: RequestInit & { timeoutMs?: number } = {}) {
  if (!BOOQABLE_BASE_URL) throw new Error('BOOQABLE_BASE_URL not configured');
  const url = `${BOOQABLE_BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 8000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Authorization': BOOQABLE_API_KEY ? `Bearer ${BOOQABLE_API_KEY}` : '',
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
  } finally {
    clearTimeout(timer);
  }
}

// Get all collections (using collections endpoint)
export const getCollections: RequestHandler = async (req, res) => {
  try {
    // Default collections based on dancecostumesforhire.co.uk structure
    const defaultCollections = [
      {
        id: 'all',
        name: 'All Products',
        image: '/placeholder.svg',
        description: 'Browse all available costumes',
        product_count: 0
      },
      {
        id: 'shows',
        name: 'Shows',
        image: '/placeholder.svg',
        description: 'Costumes designed for performances, featuring sequins and sparkle to enhance your stage presence',
        product_count: 0
      },
      {
        id: 'competitions',
        name: 'Competitions',
        image: '/placeholder.svg',
        description: 'Fun, vibrant, and unforgettable costumes for competition appearances',
        product_count: 0
      },
      {
        id: 'schools',
        name: 'Schools',
        image: '/placeholder.svg',
        description: 'Versatile and memorable costumes suitable for various school events',
        product_count: 0
      },
      {
        id: 'boys',
        name: 'Boys',
        image: '/placeholder.svg',
        description: 'Costumes specifically designed for boys performances',
        product_count: 0
      },
      {
        id: 'girls',
        name: 'Girls',
        image: '/placeholder.svg',
        description: 'Beautiful costumes for girls performances',
        product_count: 0
      }
    ];

    let collections = [...defaultCollections];

    try {
      // If Booqable is not configured, skip external call and return defaults immediately
      if (!BOOQABLE_BASE_URL || !BOOQABLE_API_KEY) {
        console.warn('Booqable configuration missing (BOOQABLE_BASE_URL or BOOQABLE_API_KEY). Returning default collections.');
      } else {
        // Try to get collections from Booqable API
        const data = await booqableRequest('/collections');

        if (data.collections && Array.isArray(data.collections)) {
          console.log('Found collections:', data.collections.length);

          // Add Booqable collections as additional collections
          const booqableCollections = data.collections
            .filter((collection: any) => collection.name && !collection.archived) // Filter out archived collections
            .map((collection: any) => ({
              id: collection.id,
              name: collection.name,
              image: collection.photo?.original_url || collection.photo?.large_url || '/placeholder.svg',
              description: collection.description || `Collection of ${collection.name.toLowerCase()} costumes`,
              product_count: collection.products_count || 0
            }));

          // Add unique Booqable collections (avoid duplicates with default ones)
          booqableCollections.forEach(booqableCollection => {
            const exists = collections.find(col =>
              col.name.toLowerCase() === booqableCollection.name.toLowerCase()
            );
            if (!exists) {
              collections.push(booqableCollection);
            }
          });
        }
      }
    } catch (apiError) {
      console.log('Could not fetch collections from Booqable, using default collections:', apiError);
    }

    // Try to enhance 'all' count quickly, but do not block response
    try {
      const productsData = await booqableRequest('/products?per_page=1', { timeoutMs: 2000 });
      if (productsData.meta?.total_count) {
        const allIndex = collections.findIndex(col => col.id === 'all');
        if (allIndex !== -1) {
          collections[allIndex].product_count = productsData.meta.total_count;
        }
      }
    } catch {
      // Non-blocking; continue
    }

    res.json({
      success: true,
      data: collections
    });
  } catch (error) {
    console.error('Error fetching collections:', error);
    // Return default collections even if API fails
    res.json({
      success: true,
      data: [
        {
          id: 'all',
          name: 'All Products',
          image: '/placeholder.svg',
          description: 'Browse all available costumes',
          product_count: 0
        }
      ]
    });
  }
};

// Get all products with optional filtering
export const getProducts: RequestHandler = async (req, res) => {
  try {
    const {
      search,
      category,
      collection_id,
      min_price,
      max_price,
      sizes,
      colors,
      page = 1,
      limit = 30,
      per_page
    } = req.query;

    // Build query parameters for Booqable API
    const itemsPerPage = per_page ? parseInt(per_page.toString()) : parseInt(limit.toString());

    // If searching, fetch more products to ensure we get good search results
    const fetchParams = new URLSearchParams({
      page: search ? '1' : page.toString(),
      per_page: search ? '100' : itemsPerPage.toString(), // Fetch more products when searching
      include: 'images,collections,properties'
    });

    if (search) {
      console.log('Search parameter received:', search.toString());
    }

    // Handle collection filtering - filter by collection_id if it's a valid UUID
    if (collection_id && collection_id !== 'all') {
      // Check if collection_id is a UUID (from Booqable collections)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(collection_id.toString())) {
        fetchParams.append('filter[collection_id]', collection_id.toString());
      }
      // For our custom collections (shows, competitions, etc.), we'll filter client-side
    }

    const apiUrl = `/products?${fetchParams}`;
    console.log('Full Booqable API URL:', apiUrl);

    const data = await booqableRequest(apiUrl);

    console.log('Booqable API response metadata:', {
      total_products: data.products?.length,
      meta: data.meta,
      has_search: !!search
    });

    // Debug: Log the first product to understand the structure
    if (data.products && data.products.length > 0) {
      console.log('Sample Booqable product structure:', JSON.stringify(data.products[0], null, 2));
    }

    // Transform Booqable products data to our format
    const products = data.products?.map((product: any) => {
      // Handle different price field names that Booqable might use
      let pricePerDay = 0;
      if (product.base_price_in_cents) {
        pricePerDay = parseFloat(product.base_price_in_cents) / 100;
      } else if (product.price_in_cents) {
        pricePerDay = parseFloat(product.price_in_cents) / 100;
      } else if (product.base_price) {
        pricePerDay = parseFloat(product.base_price);
      } else if (product.price) {
        pricePerDay = parseFloat(product.price);
      }

      // Handle different image field structures
      let images = ['/placeholder.svg'];

      // First check for photos in the product itself
      if (product.photos && Array.isArray(product.photos)) {
        images = product.photos
          .map((photo: any) => photo.original_url || photo.large_url || photo.original || photo.url || photo.src)
          .filter(Boolean);
      } else if (product.photo) {
        const photoUrl = product.photo.original_url || product.photo.large_url || product.photo.original || product.photo.url || product.photo.src;
        if (photoUrl) images = [photoUrl];
      }

      // If no direct photos, check in included data (from API response)
      if (images.length === 1 && images[0] === '/placeholder.svg' && data.included) {
        const includedImages = data.included.filter((item: any) =>
          item.type === 'photos' || item.type === 'images'
        );

        const productImages = includedImages
          .filter((img: any) => img.attributes?.owner_id === product.id)
          .map((img: any) => img.attributes?.original_url || img.attributes?.large_url || img.attributes?.url)
          .filter(Boolean);

        if (productImages.length > 0) {
          images = productImages;
        }
      }

      // Fallback to photo_url if available
      if (images.length === 1 && images[0] === '/placeholder.svg' && product.photo_url) {
        images = [product.photo_url];
      }

      if (images.length === 0) images = ['/placeholder.svg'];

      // Extract collection relationships from product
      const collectionIds = product.relationships?.collections?.data?.map((c: any) => c.id) || [];

      // Find collections in included data
      const productCollections = data.included?.filter((inc: any) =>
        inc.type === "collections" && collectionIds.includes(inc.id)
      ) || [];

      // Map collections data
      const collections = productCollections.map((c: any) => ({
        id: c.id,
        name: c.attributes?.name,
        slug: c.attributes?.slug,
      }));

      // Determine primary category from first collection or fallback
      const primaryCategory = collections.length > 0 ? collections[0].name : 'General';

      // Determine if product is new (created within last 30 days)
      const isNew = product.created_at ?
        new Date(product.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) :
        false;

      return {
        id: product.id,
        name: product.name || product.title || 'Unnamed Product',
        price_per_day: pricePerDay,
        images: images,
        category: primaryCategory,
        collections: collections, // Include all collections this product belongs to
        description: product.description || product.excerpt || '',
        sizes: product.properties?.sizes || product.sizes || [],
        colors: product.properties?.colors || product.colors || [],
        rating: 4.5, // Default rating
        review_count: 0,
        is_featured: product.featured || product.is_featured || false,
        is_new: isNew,
        attributes: {
          sku: product.sku || product.code || '',
          material: product.properties?.material || '',
          care: product.properties?.care_instructions || product.care_instructions || '',
          brand: product.brand || '',
          condition: product.condition || ''
        }
      };
    }) || [];

    // Apply client-side filters (supplement to Booqable's filtering)
    let filteredProducts = products;

    // If search term provided, filter products by name, description, or SKU
    if (search) {
      const searchTerm = search.toString().toLowerCase();
      filteredProducts = filteredProducts.filter((product: any) =>
        product.name.toLowerCase().includes(searchTerm) ||
        (product.description && product.description.toLowerCase().includes(searchTerm)) ||
        (product.attributes?.sku && product.attributes.sku.toLowerCase().includes(searchTerm))
      );
      console.log(`Filtered ${products.length} products down to ${filteredProducts.length} results for search: "${searchTerm}"`);
    }

    // Filter by collection/category
    if (collection_id && collection_id !== 'all') {
      const collectionFilter = collection_id.toString().toLowerCase();

      switch (collectionFilter) {
        case 'shows':
          filteredProducts = filteredProducts.filter((product: any) =>
            product.name.toLowerCase().includes('sequin') ||
            product.name.toLowerCase().includes('sparkle') ||
            product.name.toLowerCase().includes('stage') ||
            product.name.toLowerCase().includes('performance') ||
            product.description.toLowerCase().includes('show')
          );
          break;

        case 'competitions':
          filteredProducts = filteredProducts.filter((product: any) =>
            product.name.toLowerCase().includes('competition') ||
            product.name.toLowerCase().includes('dance') ||
            product.name.toLowerCase().includes('vibrant') ||
            product.description.toLowerCase().includes('competition')
          );
          break;

        case 'schools':
          filteredProducts = filteredProducts.filter((product: any) =>
            product.name.toLowerCase().includes('school') ||
            product.name.toLowerCase().includes('uniform') ||
            product.name.toLowerCase().includes('simple') ||
            product.description.toLowerCase().includes('school')
          );
          break;

        case 'boys':
          filteredProducts = filteredProducts.filter((product: any) =>
            product.name.toLowerCase().includes('boy') ||
            product.name.toLowerCase().includes('male') ||
            product.name.toLowerCase().includes('suit') ||
            product.name.toLowerCase().includes('shirt') ||
            product.name.toLowerCase().includes('trouser')
          );
          break;

        case 'girls':
          filteredProducts = filteredProducts.filter((product: any) =>
            product.name.toLowerCase().includes('girl') ||
            product.name.toLowerCase().includes('female') ||
            product.name.toLowerCase().includes('dress') ||
            product.name.toLowerCase().includes('skirt') ||
            product.name.toLowerCase().includes('tutu')
          );
          break;

        default:
          // If it's not a custom collection, check if it matches any collection ID or name
          filteredProducts = filteredProducts.filter((product: any) => {
            // Check if product belongs to this collection by ID
            const belongsToCollection = product.collections?.some((col: any) =>
              col.id === collection_id ||
              col.name.toLowerCase() === collectionFilter ||
              col.slug === collectionFilter
            );

            // Also check category name for backwards compatibility
            const categoryMatch = product.category.toLowerCase().includes(collectionFilter);

            return belongsToCollection || categoryMatch;
          });
          break;
      }
    } else if (category && category !== 'all') {
      filteredProducts = filteredProducts.filter((product: any) =>
        product.category.toLowerCase().includes(category.toString().toLowerCase())
      );
    }

    if (min_price || max_price) {
      filteredProducts = filteredProducts.filter((product: any) => {
        const price = product.price_per_day;
        const min = min_price ? parseFloat(min_price.toString()) : 0;
        const max = max_price ? parseFloat(max_price.toString()) : Infinity;
        return price >= min && price <= max;
      });
    }

    // Apply pagination to filtered results if searching
    let paginatedProducts = filteredProducts;
    let totalCount = filteredProducts.length;
    let totalPages = Math.ceil(totalCount / itemsPerPage);

    if (search) {
      // Apply pagination to filtered results
      const startIndex = (parseInt(page.toString()) - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      paginatedProducts = filteredProducts.slice(startIndex, endIndex);

      console.log(`Search pagination: page ${page}, showing ${startIndex + 1}-${Math.min(endIndex, totalCount)} of ${totalCount} results`);
    } else {
      // Use original API pagination for non-search requests
      totalCount = data.meta?.total_count || filteredProducts.length;
      totalPages = data.meta?.total_pages || Math.ceil(totalCount / itemsPerPage);
    }

    res.json({
      success: true,
      data: {
        products: paginatedProducts,
        pagination: {
          current_page: parseInt(page.toString()),
          total_pages: totalPages,
          total_count: totalCount,
          per_page: itemsPerPage
        }
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products'
    });
  }
};

// Get single product by ID
export const getProduct: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await booqableRequest(`/products/${id}?include=images,collections,properties`);

    if (!data.product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Extract collection relationships from product
    const collectionIds = data.product.relationships?.collections?.data?.map((c: any) => c.id) || [];

    // Find collections in included data
    const productCollections = data.included?.filter((inc: any) =>
      inc.type === "collections" && collectionIds.includes(inc.id)
    ) || [];

    // Map collections data
    const collections = productCollections.map((c: any) => ({
      id: c.id,
      name: c.attributes?.name,
      slug: c.attributes?.slug,
    }));

    // Handle different image field structures
    let images = ['/placeholder.svg'];

    // Check for images in included data
    if (data.included) {
      const includedImages = data.included.filter((item: any) =>
        item.type === 'images' && item.attributes?.owner_id === data.product.id
      );

      const productImages = includedImages
        .map((img: any) => img.attributes?.original_url || img.attributes?.large_url || img.attributes?.url)
        .filter(Boolean);

      if (productImages.length > 0) {
        images = productImages;
      }
    }

    // Fallback to direct photos if no images found
    if (images.length === 1 && images[0] === '/placeholder.svg' && data.product.photos) {
      images = data.product.photos?.map((photo: any) => photo.original) || ['/placeholder.svg'];
    }

    // Fallback to photo_url
    if (images.length === 1 && images[0] === '/placeholder.svg' && data.product.photo_url) {
      images = [data.product.photo_url];
    }

    const product = {
      id: data.product.id,
      name: data.product.name,
      price_per_day: parseFloat(data.product.base_price_in_cents) / 100,
      images: images,
      category: collections.length > 0 ? collections[0].name : 'General',
      collections: collections,
      description: data.product.description || '',
      sizes: data.product.properties?.sizes || [],
      colors: data.product.properties?.colors || [],
      rating: 4.5,
      review_count: 0,
      is_featured: data.product.featured || false,
      is_new: data.product.created_at ? new Date(data.product.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : false,
      attributes: {
        sku: data.product.sku,
        material: data.product.properties?.material || '',
        care: data.product.properties?.care_instructions || '',
        dimensions: data.product.properties?.dimensions || ''
      }
    };

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product'
    });
  }
};

// Check availability for product and date range
export const checkAvailability: RequestHandler = async (req, res) => {
  try {
    const { product_id, start_date, end_date } = req.body;

    if (!product_id || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'Product ID, start date, and end date are required'
      });
    }

    // Validate minimum rental period (inclusive days)
    const startDate = new Date(start_date + 'T00:00:00');
    const endDate = new Date(end_date + 'T00:00:00');
    const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (daysDiff < 8) {
      return res.status(400).json({
        success: false,
        error: 'Minimum rental period is 8 days'
      });
    }

    // Check availability via Booqable orders API for conflicts
    let isAvailable = false;
    try {
      const ordersData = await booqableRequest(`/orders?filter[item_id]=${product_id}&filter[starts_at_gteq]=${start_date}&filter[stops_at_lteq]=${end_date}`);
      isAvailable = !(ordersData.orders && ordersData.orders.length > 0);
    } catch (apiErr) {
      console.error('Booqable orders availability check failed:', apiErr);
      isAvailable = false;
    }

    res.json({
      success: true,
      data: {
        available: isAvailable,
        product_id,
        start_date,
        end_date,
        rental_days: daysDiff,
        message: isAvailable
          ? 'Product is available for selected dates'
          : 'Product is not available for selected dates. Please choose different dates.'
      }
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check availability'
    });
  }
};

// Create customer in Booqable (called when user registers)
export const createCustomer: RequestHandler = async (req, res) => {
  try {
    const { firebase_uid, email, name, phone, address } = req.body;

    if (!firebase_uid || !email || !name) {
      return res.status(400).json({
        success: false,
        error: 'Firebase UID, email, and name are required'
      });
    }

    const customerData = {
      customer: {
        name,
        email,
        phone: phone || '',
        properties: {
          firebase_uid // Store Firebase UID in customer properties for mapping
        },
        ...(address && {
          address_line_1: address.line1,
          address_line_2: address.line2 || '',
          address_city: address.city,
          address_zipcode: address.postcode,
          address_country: address.country || 'GB'
        })
      }
    };

    const data = await booqableRequest('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData)
    });

    if (!data.customer) {
      throw new Error('Failed to create customer in Booqable');
    }

    const customer = {
      id: data.customer.id,
      firebase_uid,
      email: data.customer.email,
      name: data.customer.name,
      phone: data.customer.phone,
      address: {
        line1: data.customer.address_line_1 || '',
        line2: data.customer.address_line_2 || '',
        city: data.customer.address_city || '',
        postcode: data.customer.address_zipcode || '',
        country: data.customer.address_country || 'GB'
      },
      created_at: data.customer.created_at
    };

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create customer'
    });
  }
};

// Get products with focus on images (matches your fetch request)
export const getProductsWithImages: RequestHandler = async (req, res) => {
  try {
    const { page = 1, per_page = 50 } = req.query;

    // Build query parameters specifically for images and collections
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: per_page.toString(),
      include: 'images,collections,properties'
    });

    const data = await booqableRequest(`/products?${params}`);

    // Return the raw data with included images for your frontend to process
    res.json({
      success: true,
      data: {
        products: data.products || [],
        included: data.included || [], // This contains the images with type: 'photos' or 'images'
        meta: data.meta || {}
      }
    });
  } catch (error) {
    console.error('Error fetching products with images:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products with images'
    });
  }
};

// Create order in Booqable (called after successful payment)
export const createOrder: RequestHandler = async (req, res) => {
  try {
    const {
      customer_id,
      items,
      start_date,
      end_date,
      delivery_address,
      special_instructions,
      stripe_payment_intent_id
    } = req.body;

    if (!customer_id || !items || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'Customer ID, items, start date, and end date are required'
      });
    }

    const orderData = {
      order: {
        customer_id,
        starts_at: start_date,
        stops_at: end_date,
        status: 'confirmed',
        payment_status: 'paid',
        lines_attributes: items.map((item: any) => ({
          item_id: item.product_id,
          quantity: item.quantity,
          price_structure_id: null // Use default pricing
        })),
        properties: {
          stripe_payment_intent_id,
          delivery_instructions: special_instructions || ''
        },
        ...(delivery_address && {
          delivery_address_line_1: delivery_address.line1,
          delivery_address_line_2: delivery_address.line2 || '',
          delivery_address_city: delivery_address.city,
          delivery_address_zipcode: delivery_address.postcode,
          delivery_address_country: delivery_address.country || 'GB'
        })
      }
    };

    const data = await booqableRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });

    if (!data.order) {
      throw new Error('Failed to create order in Booqable');
    }

    const order = {
      id: data.order.id,
      customer_id: data.order.customer_id,
      items,
      start_date: data.order.starts_at,
      end_date: data.order.stops_at,
      status: data.order.status,
      payment_status: data.order.payment_status,
      total_amount: parseFloat(data.order.total_in_cents) / 100,
      delivery_address,
      special_instructions,
      stripe_payment_intent_id,
      created_at: data.order.created_at,
      booqable_number: data.order.number
    };

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create order'
    });
  }
};
