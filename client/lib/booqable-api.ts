// Client-side utilities for fetching Booqable products with images

export interface BooqableProduct {
  id: string;
  name: string;
  sku?: string;
  photo_url?: string;
  base_price_in_cents?: number;
  description?: string;
  collections?: any[];
  photos?: BooqablePhoto[];
  [key: string]: any;
}

export interface BooqablePhoto {
  id: string;
  type: 'photos' | 'images';
  attributes: {
    owner_id: string;
    owner_type: string;
    original_url?: string;
    large_url?: string;
    url?: string;
    position?: number;
  };
}

export interface BooqableResponse {
  products: BooqableProduct[];
  included: BooqablePhoto[];
  meta?: {
    total_pages?: number;
    total_count?: number;
    current_page?: number;
  };
}

/**
 * Fetch products with images from our API endpoint
 * This mimics the direct Booqable API call you provided
 */
export async function fetchProductsWithImages(options: {
  page?: number;
  per_page?: number;
} = {}): Promise<BooqableResponse> {
  const params = new URLSearchParams({
    page: (options.page || 1).toString(),
    per_page: (options.per_page || 50).toString()
  });

  const response = await fetch(`/api/products-with-images?${params}`, {
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch products');
  }

  return result.data;
}

/**
 * Extract images for a specific product from the included data
 */
export function getProductImages(product: BooqableProduct, included: BooqablePhoto[]): string[] {
  const images: string[] = [];

  // First check direct product photos
  if (product.photos && Array.isArray(product.photos)) {
    product.photos.forEach(photo => {
      const url = photo.original_url || photo.large_url || photo.url;
      if (url) images.push(url);
    });
  }

  // Check photo_url on product
  if (product.photo_url && !images.includes(product.photo_url)) {
    images.push(product.photo_url);
  }

  // Check included data for images
  const productImages = included
    .filter(item => 
      (item.type === 'photos' || item.type === 'images') && 
      item.attributes?.owner_id === product.id
    )
    .map(item => item.attributes?.original_url || item.attributes?.large_url || item.attributes?.url)
    .filter(Boolean) as string[];

  productImages.forEach(url => {
    if (!images.includes(url)) {
      images.push(url);
    }
  });

  // Return placeholder if no images found
  return images.length > 0 ? images : ['/placeholder.svg'];
}

/**
 * Transform Booqable product data to our app format
 */
export function transformProduct(product: BooqableProduct, included: BooqablePhoto[]) {
  const images = getProductImages(product, included);
  
  return {
    id: product.id,
    name: product.name || 'Unnamed Product',
    price_per_day: product.base_price_in_cents ? product.base_price_in_cents / 100 : 0,
    images,
    category: 'General', // Category will be determined from collections
    description: product.description || '',
    sizes: [],
    colors: [],
    rating: 4.5,
    review_count: 0,
    is_featured: false,
    is_new: false,
    attributes: {
      sku: product.sku || '',
      material: '',
      care: '',
      brand: '',
      condition: ''
    }
  };
}

/**
 * Example usage function that demonstrates how to use the API
 */
export async function loadProductsWithImages() {
  try {
    console.log('Fetching products with images...');
    
    const data = await fetchProductsWithImages({ page: 1, per_page: 20 });
    
    console.log('Raw data:', data);
    console.log('Included images:', data.included?.filter(item => item.type === 'photos' || item.type === 'images'));
    
    // Transform products for use in your app
    const transformedProducts = data.products.map(product => 
      transformProduct(product, data.included || [])
    );
    
    return {
      products: transformedProducts,
      pagination: data.meta
    };
  } catch (error) {
    console.error('Error loading products:', error);
    throw error;
  }
}
