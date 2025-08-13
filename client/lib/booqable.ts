// Booqable API Configuration and Service Functions

interface BookingItem {
  id: string;
  name: string;
  image: string;
  quantity: number;
  pricePerDay: number;
  available?: boolean;
}

interface BookingDates {
  start: string;
  end: string;
  days: number;
}

interface Booking {
  id: string;
  orderNumber: string;
  items: BookingItem[];
  rentalDates: BookingDates;
  status: 'confirmed' | 'delivered' | 'returned' | 'cancelled';
  totalAmount: number;
  paidAmount: number;
  createdAt: string;
  invoiceUrl?: string;
  packingSlipUrl?: string;
}

interface ModifiableBooking extends Booking {
  canModify: boolean;
  canCancel: boolean;
  modificationDeadline: string;
  cancellationPolicy: {
    fullRefund: number;
    partialRefund: number; 
    noRefund: number;
  };
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  totalBookings: number;
  totalSpent: number;
  joinedAt: string;
  loyaltyPoints?: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price_per_day: number;
  images: string[];
  category: string;
  available: boolean;
  stock_quantity: number;
  slug: string;
  short_description?: string;
  base_price_in_cents?: number;
  product_group_id?: string;
}

interface ProductGroup {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  product_count?: number;
}

interface BookingStats {
  totalBookings: number;
  activeRentals: number;
  totalSpent: number;
  upcomingBookings: number;
}

class BookableAPI {
  private baseUrl: string;

  constructor() {
    // Use our backend proxy to avoid CORS issues
    this.baseUrl = '/api/booqable';
    console.log('Booqable API configured to use proxy:', this.baseUrl);
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Remove leading slash if present
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const url = `${this.baseUrl}/${cleanEndpoint}`;

    console.log('Making request to:', url);

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      // Clone the response so we can read it multiple times if needed
      const responseClone = response.clone();

      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await responseClone.text();
        } catch (textError) {
          errorText = 'Unable to read error response';
        }
        console.error('API error response:', response.status, errorText);
        throw new Error(`Booqable API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Fetch error for URL:', url, error);
      throw error;
    }
  }

  private isConfigured(): boolean {
    return true; // Always configured since we're using proxy
  }

  // Test method to check if proxy is working
  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest('product_groups');
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  // Customer Methods
  async getCurrentCustomer(customerId?: string): Promise<Customer> {
    if (!this.isConfigured()) {
      throw new Error('Booqable API not configured');
    }

    try {
      // For now, return a default customer since Booqable doesn't have a direct customer endpoint
      // In practice, you'd get customer info from your authentication system
      return {
        id: 'current-user',
        name: 'Guest User',
        email: 'user@example.com',
        totalBookings: 0,
        totalSpent: 0,
        joinedAt: new Date().toISOString(),
        loyaltyPoints: 0,
      };
    } catch (error) {
      console.error('Error fetching customer:', error);
      throw error;
    }
  }

  async updateCustomer(customerId: string, data: Partial<Customer>): Promise<Customer> {
    if (!this.isConfigured()) {
      console.warn('Booqable API not configured, cannot update customer');
      throw new Error('API not configured');
    }

    try {
      const response = await this.makeRequest<any>(`/customers/${customerId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return this.mapCustomerData(response);
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  }

  // Booking Methods
  async getBookings(customerId?: string): Promise<Booking[]> {
    if (!this.isConfigured()) {
      throw new Error('Booqable API not configured');
    }

    try {
      const response = await this.makeRequest<any>('/orders');
      return (response.orders || []).map((order: any) => this.mapBookingData(order));
    } catch (error) {
      console.error('Error fetching bookings:', error);
      throw error;
    }
  }

  async getModifiableBookings(customerId?: string): Promise<ModifiableBooking[]> {
    if (!this.isConfigured()) {
      throw new Error('Booqable API not configured');
    }

    try {
      const bookings = await this.getBookings(customerId);
      return bookings
        .filter(booking => booking.status === 'confirmed' || booking.status === 'delivered')
        .map(booking => this.enhanceBookingWithModificationInfo(booking));
    } catch (error) {
      console.error('Error fetching modifiable bookings:', error);
      throw error;
    }
  }

  async modifyBooking(bookingId: string, modifications: {
    startDate?: string;
    endDate?: string;
    quantities?: Record<string, number>;
  }): Promise<ModifiableBooking> {
    if (!this.isConfigured()) {
      throw new Error('Booqable API not configured');
    }

    try {
      const response = await this.makeRequest<any>(`/orders/${bookingId}`, {
        method: 'PUT',
        body: JSON.stringify({
          starts_at: modifications.startDate,
          stops_at: modifications.endDate,
        }),
      });
      return this.enhanceBookingWithModificationInfo(this.mapBookingData(response));
    } catch (error) {
      console.error('Error modifying booking:', error);
      throw error;
    }
  }

  async cancelBooking(bookingId: string): Promise<{ success: boolean; refundAmount: number }> {
    if (!this.isConfigured()) {
      throw new Error('Booqable API not configured');
    }

    try {
      await this.makeRequest<any>(`/orders/${bookingId}`, {
        method: 'DELETE',
      });
      return { success: true, refundAmount: 0 };
    } catch (error) {
      console.error('Error cancelling booking:', error);
      throw error;
    }
  }

  // Product Methods
  async getProducts(): Promise<Product[]> {
    try {
      const response = await this.makeRequest<any>('products?include=photos,product_group');
      return (response.products || []).map((product: any) => this.mapProductData(product, response.included));
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  async getProductGroups(): Promise<ProductGroup[]> {
    try {
      const response = await this.makeRequest<any>('product_groups');
      return (response.product_groups || []).map((group: any) => this.mapProductGroupData(group));
    } catch (error) {
      console.error('Error fetching product groups:', error);
      throw error;
    }
  }

  async getProductsByCategory(categorySlug: string): Promise<Product[]> {
    if (!this.isConfigured()) {
      throw new Error('Booqable API not configured');
    }

    try {
      // First get the product group by slug
      const groups = await this.getProductGroups();
      const group = groups.find(g => g.slug === categorySlug);

      if (!group) {
        return [];
      }

      const response = await this.makeRequest<any>(`/products?filter[product_group_id]=${group.id}&include=photos,product_group`);
      return (response.products || []).map((product: any) => this.mapProductData(product, response.included));
    } catch (error) {
      console.error('Error fetching products by category:', error);
      throw error;
    }
  }

  async getProduct(productId: string): Promise<Product | null> {
    if (!this.isConfigured()) {
      throw new Error('Booqable API not configured');
    }

    try {
      const response = await this.makeRequest<any>(`/products/${productId}?include=photos,product_group`);
      return this.mapProductData(response.product || response, response.included);
    } catch (error) {
      console.error('Error fetching product:', error);
      return null;
    }
  }

  // Check availability for specific dates
  async checkAvailability(productId: string, startDate: string, endDate: string): Promise<{
    available: boolean;
    availableQuantity: number;
    conflictingOrders?: any[];
  }> {
    try {
      console.log('Checking availability for product:', productId, 'from', startDate, 'to', endDate);

      // For now, use a simple approach since the planning endpoint might not be available
      // We'll check basic product availability and stock
      const product = await this.getProduct(productId);

      if (!product) {
        return {
          available: false,
          availableQuantity: 0,
        };
      }

      // Try to check for existing orders/bookings (if the endpoint exists)
      let bookedQuantity = 0;
      try {
        const ordersResponse = await this.makeRequest<any>(
          `orders?filter[starts_at_gteq]=${startDate}&filter[stops_at_lteq]=${endDate}`
        );

        const orders = ordersResponse.orders || [];

        // Calculate booked quantity for this product during the specified period
        bookedQuantity = orders.reduce((sum: number, order: any) => {
          const orderLines = order.lines || order.order_lines || [];
          const productLines = orderLines.filter((line: any) =>
            line.product_id === productId || line.item_id === productId
          );
          return sum + productLines.reduce((lineSum: number, line: any) =>
            lineSum + (line.quantity || 1), 0
          );
        }, 0);
      } catch (orderError) {
        console.log('Could not check existing orders, using basic availability:', orderError);
        // If orders endpoint fails, just use basic stock check
      }

      const totalStock = product.stock_quantity || 0;
      const availableQuantity = Math.max(0, totalStock - bookedQuantity);

      // Simulate some realistic availability (since we can't get real booking data)
      // In a real scenario, this would check against actual booking system
      const isAvailable = product.available && availableQuantity > 0;

      return {
        available: isAvailable,
        availableQuantity: isAvailable ? availableQuantity : 0,
        conflictingOrders: [],
      };
    } catch (error) {
      console.error('Error checking availability:', error);
      // Fallback to basic stock check
      try {
        const product = await this.getProduct(productId);
        return {
          available: product?.available || false,
          availableQuantity: product?.stock_quantity || 0,
        };
      } catch (fallbackError) {
        console.error('Fallback availability check failed:', fallbackError);
        return {
          available: false,
          availableQuantity: 0,
        };
      }
    }
  }

  // Analytics Methods
  async getBookingStats(customerId?: string): Promise<BookingStats> {
    if (!this.isConfigured()) {
      throw new Error('Booqable API not configured');
    }

    try {
      const bookings = await this.getBookings(customerId);
      return {
        totalBookings: bookings.length,
        activeRentals: bookings.filter(b => b.status === 'delivered').length,
        totalSpent: bookings.reduce((sum, b) => sum + b.paidAmount, 0),
        upcomingBookings: bookings.filter(b => b.status === 'confirmed').length,
      };
    } catch (error) {
      console.error('Error fetching booking stats:', error);
      throw error;
    }
  }

  // Data Mapping Functions
  private mapCustomerData(data: any): Customer {
    return {
      id: data.id || data.uuid || '1',
      name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.name || 'Guest User',
      email: data.email || 'user@example.com',
      phone: data.phone,
      totalBookings: data.order_count || 0,
      totalSpent: data.total_spent || 0,
      joinedAt: data.created_at || new Date().toISOString(),
      loyaltyPoints: data.loyalty_points || 0,
    };
  }

  private mapBookingData(data: any): Booking {
    return {
      id: data.id || data.uuid || Math.random().toString(),
      orderNumber: data.number || data.order_number || `CR-${Date.now()}`,
      items: (data.lines || data.items || []).map((item: any) => ({
        id: item.id || item.product_id || Math.random().toString(),
        name: item.name || item.product_name || 'Unknown Item',
        image: item.image || item.product_image || 'https://images.unsplash.com/photo-1583196344000-916dd2b51a79?w=400&h=500&fit=crop',
        quantity: item.quantity || 1,
        pricePerDay: item.price_per_day || item.unit_price || 0,
        available: item.available !== false,
      })),
      rentalDates: {
        start: data.starts_at || data.start_date || new Date().toISOString().split('T')[0],
        end: data.stops_at || data.end_date || new Date().toISOString().split('T')[0],
        days: data.rental_days || 1,
      },
      status: this.mapStatus(data.status || data.state),
      totalAmount: data.total || data.total_amount || 0,
      paidAmount: data.paid_amount || data.total || 0,
      createdAt: data.created_at || new Date().toISOString(),
      invoiceUrl: data.invoice_url,
      packingSlipUrl: data.packing_slip_url,
    };
  }

  private mapProductData(data: any, included?: any[]): Product {
    let categoryName = 'General';
    let images: string[] = [];

    // Handle included data for product group and photos
    if (included && data.relationships) {
      // Get product group name
      if (data.relationships.product_group?.data?.id) {
        const productGroup = included.find(item =>
          item.type === 'product_groups' && item.id === data.relationships.product_group.data.id
        );
        if (productGroup) {
          categoryName = productGroup.attributes.name;
        }
      }

      // Get photos
      if (data.relationships.photos?.data) {
        images = data.relationships.photos.data.map((photoRef: any) => {
          const photo = included.find(item =>
            item.type === 'photos' && item.id === photoRef.id
          );
          return photo ? photo.attributes.original : null;
        }).filter(Boolean);
      }
    }

    // Fallback to direct data if no included data
    if (images.length === 0) {
      images = (data.photos || []).map((photo: any) =>
        photo.original || photo.url || photo
      ).filter(Boolean);
    }

    // Default image if none found
    if (images.length === 0) {
      images = ['https://images.unsplash.com/photo-1583196344000-916dd2b51a79?w=400&h=500&fit=crop'];
    }

    return {
      id: data.id || data.uuid || Math.random().toString(),
      name: data.attributes?.name || data.name || 'Unknown Product',
      description: data.attributes?.description || data.description || '',
      short_description: data.attributes?.short_description || data.short_description,
      price_per_day: data.attributes?.base_price_in_cents
        ? data.attributes.base_price_in_cents / 100
        : (data.base_price_in_cents ? data.base_price_in_cents / 100 : 0),
      base_price_in_cents: data.attributes?.base_price_in_cents || data.base_price_in_cents,
      images,
      category: categoryName,
      available: (data.attributes?.stock_count || data.stock_count || 0) > 0,
      stock_quantity: data.attributes?.stock_count || data.stock_count || 0,
      slug: data.attributes?.slug || data.slug || '',
      product_group_id: data.relationships?.product_group?.data?.id || data.product_group_id,
    };
  }

  private mapProductGroupData(data: any): ProductGroup {
    // Handle Booqable API response format which has attributes nested
    const attributes = data.attributes || data;
    return {
      id: data.id || Math.random().toString(),
      name: attributes.name || 'Unknown Category',
      slug: attributes.slug || '',
      description: attributes.description,
      image: attributes.photo,
      product_count: attributes.products_count || 0,
    };
  }

  private mapStatus(status: string): 'confirmed' | 'delivered' | 'returned' | 'cancelled' {
    const statusMap: Record<string, 'confirmed' | 'delivered' | 'returned' | 'cancelled'> = {
      'reserved': 'confirmed',
      'started': 'delivered',
      'stopped': 'returned',
      'cancelled': 'cancelled',
      'confirmed': 'confirmed',
      'delivered': 'delivered',
      'returned': 'returned',
    };
    return statusMap[status] || 'confirmed';
  }

  private enhanceBookingWithModificationInfo(booking: Booking): ModifiableBooking {
    const today = new Date();
    const startDate = new Date(booking.rentalDates.start);
    const daysUntilRental = Math.floor((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return {
      ...booking,
      canModify: daysUntilRental > 1 && booking.status === 'confirmed',
      canCancel: daysUntilRental > 0,
      modificationDeadline: new Date(startDate.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      cancellationPolicy: {
        fullRefund: 7,
        partialRefund: 3,
        noRefund: 1,
      },
    };
  }

}

// Export singleton instance
export const booqableAPI = new BookableAPI();

// Export types for use in components
export type {
  Booking,
  ModifiableBooking,
  BookingItem,
  BookingDates,
  Customer,
  Product,
  BookingStats,
};
