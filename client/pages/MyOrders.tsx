import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Package, Clock, MapPin, Eye, Download, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '../contexts/AuthContext';
import { OrderManagement } from '../components/OrderManagement';
import { PaymentManagement } from '../components/PaymentManagement';

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  number: string;
  status: string;
  payment_status: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  currency: string;
  items: OrderItem[];
  delivery_address: {
    line1: string;
    line2?: string;
    city: string;
    postcode: string;
    country: string;
  };
  special_instructions?: string;
  created_at: string;
  updated_at: string;
}

interface OrdersResponse {
  orders: Order[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_count: number;
    per_page: number;
  };
}

export default function MyOrders() {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  // Fetch orders from API
  const fetchOrders = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      setError(null);
      
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/user/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: { success: boolean; data: OrdersResponse; error?: string } = await response.json();
      
      if (data.success) {
        setOrders(data.data.orders);
      } else {
        throw new Error(data.error || 'Failed to fetch orders');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [currentUser]);

  // Handler for when an order is updated
  const handleOrderUpdate = (updatedOrder: Order) => {
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order
      )
    );
  };

  // Filter orders based on active tab
  const filteredOrders = orders.filter(order => {
    const now = new Date();
    const startDate = new Date(order.start_date);
    const endDate = new Date(order.end_date);

    switch (activeTab) {
      case 'upcoming':
        return startDate > now;
      case 'current':
        return startDate <= now && endDate >= now;
      case 'past':
        return endDate < now;
      default:
        return true;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!currentUser) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Please log in to view your orders</h1>
        <Button asChild>
          <Link to="/login">Login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Orders</h1>
            <p className="text-lg text-muted-foreground">
              Track your costume rental orders
            </p>
          </div>
          <Button onClick={fetchOrders} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-4"
              onClick={fetchOrders}
            >
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Orders Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Orders ({orders.length})</TabsTrigger>
          <TabsTrigger value="upcoming">
            Upcoming ({orders.filter(o => new Date(o.start_date) > new Date()).length})
          </TabsTrigger>
          <TabsTrigger value="current">
            Current ({orders.filter(o => {
              const now = new Date();
              return new Date(o.start_date) <= now && new Date(o.end_date) >= now;
            }).length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({orders.filter(o => new Date(o.end_date) < new Date()).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-luxury-purple-600 mr-2" />
              <span className="text-lg text-muted-foreground">Loading orders...</span>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {activeTab === 'all' ? 'No orders yet' : `No ${activeTab} orders`}
              </h3>
              <p className="text-muted-foreground mb-6">
                {activeTab === 'all' 
                  ? "You haven't placed any orders yet. Start browsing our collection!" 
                  : `You don't have any ${activeTab} orders at the moment.`
                }
              </p>
              <Button asChild>
                <Link to="/products">Browse Costumes</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredOrders.map((order) => (
                <Card key={order.id} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          Order #{order.number}
                          <Badge className={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                          <Badge className={getPaymentStatusColor(order.payment_status)}>
                            {order.payment_status}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          Placed on {formatDateTime(order.created_at)}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-luxury-purple-600">
                          £{order.total_amount.toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {order.currency}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Rental Period */}
                    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                      <Calendar className="h-5 w-5 text-luxury-purple-600" />
                      <div className="flex-1">
                        <div className="font-medium">Rental Period</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(order.start_date)} - {formatDate(order.end_date)}
                        </div>
                      </div>
                      <div className="text-sm font-medium">
                        {Math.ceil((new Date(order.end_date).getTime() - new Date(order.start_date).getTime()) / (1000 * 60 * 60 * 24))} days
                      </div>
                    </div>

                    {/* Items */}
                    <div>
                      <h4 className="font-medium mb-3">Items ({order.items.length})</h4>
                      <div className="space-y-2">
                        {order.items.map((item, index) => (
                          <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center">
                                <Package className="h-6 w-6 text-muted-foreground" />
                              </div>
                              <div>
                                <div className="font-medium">{item.product_name}</div>
                                <div className="text-sm text-muted-foreground">
                                  Quantity: {item.quantity}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">£{item.price.toFixed(2)}</div>
                              <div className="text-sm text-muted-foreground">per item</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Delivery Address */}
                    {order.delivery_address && (order.delivery_address.line1 || order.delivery_address.city) && (
                      <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                        <MapPin className="h-5 w-5 text-luxury-purple-600 mt-0.5" />
                        <div>
                          <div className="font-medium mb-1">Delivery Address</div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            {order.delivery_address.line1 && <div>{order.delivery_address.line1}</div>}
                            {order.delivery_address.line2 && <div>{order.delivery_address.line2}</div>}
                            <div>
                              {order.delivery_address.city && `${order.delivery_address.city}, `}
                              {order.delivery_address.postcode}
                            </div>
                            {order.delivery_address.country && <div>{order.delivery_address.country}</div>}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Order Management */}
                    <OrderManagement order={order} onOrderUpdate={handleOrderUpdate} />

                    {/* Payment Management */}
                    <PaymentManagement
                      orderId={order.id}
                      orderTotal={order.total_amount}
                      orderStatus={order.status}
                      rentalStartDate={order.start_date}
                    />

                    {/* Actions */}
                    <Separator />
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Invoice
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
