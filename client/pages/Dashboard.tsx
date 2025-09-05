import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Package, Heart, Star, TrendingUp, Clock, MapPin, User, CreditCard, Bell } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '../contexts/AuthContext';
import { firebaseAvailable } from '../lib/firebase';

interface DashboardStats {
  totalOrders: number;
  upcomingOrders: number;
  totalSpent: number;
  recentOrdersCount: number;
  wishlistItems: number;
}

interface RecentOrder {
  id: string;
  number: string;
  status: string;
  payment_status: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  primary_product_name: string;
  primary_product_image: string;
  items: Array<{
    id: string;
    name: string;
    image: string;
    quantity: number;
    price: number;
  }>;
}

interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
}

interface FeaturedProduct {
  id: string;
  name: string;
  image: string;
  price: number;
  category: string;
  rating: number;
}

export default function Dashboard() {
  const { currentUser, userProfile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    upcomingOrders: 0,
    totalSpent: 0,
    recentOrdersCount: 0,
    wishlistItems: 0
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([]);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [dashboardMessage, setDashboardMessage] = useState('');
  const [booqableLoaded, setBooqableLoaded] = useState(false);

  // Fetch dashboard data by email
  const fetchDashboardData = async (email: string) => {
    try {
      setLoading(true);
      setError(null);
      setCurrentEmail(email);

      console.log('Fetching dashboard data for:', email);

      // Fetch dashboard data from API (authenticated)
      const token = firebaseAvailable && currentUser ? await currentUser.getIdToken() : null;
      const dashboardResponse = await fetch(`/api/dashboard/data?email=${encodeURIComponent(email)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      const dashboardData = await dashboardResponse.json();

      // Fetch featured products
      const productsResponse = await fetch('/api/products?limit=6');
      const productsData = await productsResponse.json();

      if (dashboardData.success) {
        const data = dashboardData.data;

        console.log('Dashboard data received:', data);

        // Set customer profile
        if (data.customer) {
          setCustomerProfile(data.customer);
        }

        // Set stats
        setStats(data.stats);

        // Set recent orders with real data
        setRecentOrders(data.recentOrders);

        // Set dashboard message
        setDashboardMessage(data.summary.message);
      } else {
        throw new Error(dashboardData.error || 'Failed to fetch dashboard data');
      }

      // Set featured products
      if (productsData.success) {
        setFeaturedProducts(productsData.data.products.slice(0, 6).map((product: any) => ({
          id: product.id,
          name: product.name,
          image: product.images?.[0] || '/placeholder.svg',
          price: product.price_per_day,
          category: product.category,
          rating: product.rating || 4.5
        })));
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      setCustomerProfile(null);
      setStats({
        totalOrders: 0,
        upcomingOrders: 0,
        totalSpent: 0,
        recentOrdersCount: 0,
        wishlistItems: 0
      });
      setRecentOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle email submission
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.trim()) {
      fetchDashboardData(emailInput.trim());
    }
  };

  // Auto-fetch data if user is logged in with Firebase
  useEffect(() => {
    if (firebaseAvailable && currentUser?.email) {
      setEmailInput(currentUser.email);
      fetchDashboardData(currentUser.email);
    }
  }, [currentUser]);

  // Load Booqable embed script once
  useEffect(() => {
    if (booqableLoaded) return;
    const existing = document.querySelector('script[data-booqable]') as HTMLScriptElement | null;
    if (existing) {
      setBooqableLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.booqable.com/assets/booking.js';
    script.async = true;
    script.defer = true;
    script.setAttribute('data-booqable', 'true');
    script.onload = () => setBooqableLoaded(true);
    document.body.appendChild(script);
  }, [booqableLoaded]);

  if (!currentUser) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Please log in to view your dashboard</h1>
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
          <div className="flex items-center space-x-4 mb-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={userProfile?.photoURL || currentUser?.photoURL || ''} />
              <AvatarFallback className="text-lg">
                {customerProfile?.name?.charAt(0) ||
                 userProfile?.displayName?.charAt(0) ||
                 currentUser?.email?.charAt(0) ||
                 currentEmail?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">
                Welcome back, {customerProfile?.name || userProfile?.displayName || 'User'}!
              </h1>
              <p className="text-lg text-muted-foreground">
                {dashboardMessage || "Here's what's happening with your costume rentals"}
              </p>
              {customerProfile && (
                <p className="text-sm text-muted-foreground">
                  Customer ID: {customerProfile.id} | Email: {customerProfile.email}
                </p>
              )}
            </div>
          </div>
        </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Rentals</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingOrders}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wishlist Items</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.wishlistItems}</div>
            <p className="text-xs text-muted-foreground">
              <Link to="/wishlist" className="text-luxury-purple-600 hover:underline">
                View all
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{stats.totalSpent.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Orders</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link to="/orders">View All</Link>
              </Button>
            </div>
            <CardDescription>Your latest costume rentals</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center space-x-4">
                      <div className="h-12 w-12 bg-gray-200 rounded"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentOrders.length > 0 ? (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                    <img
                      src={order.primary_product_image}
                      alt={order.primary_product_name}
                      className="h-12 w-12 rounded object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder.svg';
                      }}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{order.primary_product_name}</p>
                      <p className="text-xs text-muted-foreground mb-1">Order #{order.number}</p>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Badge variant={
                          order.status === 'confirmed' ? 'default' :
                          order.status === 'completed' ? 'secondary' :
                          order.status === 'started' ? 'outline' :
                          'destructive'
                        }>
                          {order.status}
                        </Badge>
                        <Badge variant={
                          order.payment_status === 'paid' ? 'default' : 'destructive'
                        }>
                          {order.payment_status}
                        </Badge>
                        <span>£{order.total_amount.toFixed(2)}</span>
                      </div>
                      {order.items.length > 1 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          +{order.items.length - 1} more item(s)
                        </p>
                      )}
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>{new Date(order.start_date).toLocaleDateString()}</p>
                      <p>to {new Date(order.end_date).toLocaleDateString()}</p>
                      <div className="mt-2 flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={async () => {
                          try {
                            const token = firebaseAvailable && currentUser ? await currentUser.getIdToken() : '';
                            const res = await fetch(`/api/orders/${order.id}/payments`, { headers: { Authorization: `Bearer ${token}` } });
                            const data = await res.json();
                            const invoice = data?.data?.invoices?.[0];
                            if (invoice?.download_url) {
                              window.open(invoice.download_url, '_blank');
                            } else {
                              const fallback = await fetch(`/api/invoices/deposit_${order.id}/download`, { headers: { Authorization: `Bearer ${token}` } });
                              const fjson = await fallback.json();
                              if (fjson?.data?.download_url) window.open(fjson.data.download_url, '_blank');
                            }
                          } catch {}
                        }}>Invoice</Button>
                        <Button size="sm" variant="outline" onClick={async () => {
                          try {
                            const token = firebaseAvailable && currentUser ? await currentUser.getIdToken() : '';
                            const res = await fetch(`/api/invoices/packing_${order.id}/download`, { headers: { Authorization: `Bearer ${token}` } });
                            const data = await res.json();
                            if (data?.data?.download_url) window.open(data.data.download_url, '_blank');
                          } catch {}
                        }}>Packing Slip</Button>
                        <Button size="sm" onClick={() => { window.location.href = `/orders?rebook=${order.id}`; }}>Rebook</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No orders yet</p>
                <Button asChild>
                  <Link to="/products">Browse Costumes</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Featured Products */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Featured Costumes</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link to="/products">View All</Link>
              </Button>
            </div>
            <CardDescription>Popular rentals you might like</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-square bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {featuredProducts.map((product) => (
                  <div key={product.id} className="group block">
                    <Link to={`/costume/${product.id}`} className="block">
                      <div className="aspect-square overflow-hidden rounded-lg mb-2">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <h3 className="font-medium text-sm line-clamp-2 group-hover:text-luxury-purple-600">
                        {product.name}
                      </h3>
                    </Link>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm font-bold text-luxury-purple-600">£{product.price}/day</p>
                      <div className="flex items-center space-x-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs text-muted-foreground">{product.rating}</span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="booqable-product-button" data-id={product.id}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="booqable-datepicker"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2" asChild>
              <Link to="/products">
                <Package className="h-6 w-6" />
                <span>Browse Costumes</span>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2" asChild>
              <Link to="/wishlist">
                <Heart className="h-6 w-6" />
                <span>My Wishlist</span>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2" asChild>
              <Link to="/orders">
                <Calendar className="h-6 w-6" />
                <span>My Orders</span>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2" asChild>
              <Link to="/settings">
                <User className="h-6 w-6" />
                <span>Settings</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
