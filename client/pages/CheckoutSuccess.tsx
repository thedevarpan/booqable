import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, Package, Calendar, Mail, Download, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

interface OrderDetails {
  items: Array<{
    id: string;
    name: string;
    image: string;
    category: string;
    quantity: number;
    start_date?: string;
    end_date?: string;
    rental_days?: number;
    price_per_day: number;
  }>;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  delivery_address: {
    line1: string;
    line2?: string;
    city: string;
    postal_code: string;
    country: string;
  };
  special_instructions?: string;
  total: number;
}

interface SessionDetails {
  session_id: string;
  payment_status: string;
  customer_email: string;
  amount_total: number;
  currency: string;
}

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const loadOrderDetails = async () => {
      if (!sessionId) {
        setError('No session ID provided');
        setLoading(false);
        return;
      }

      try {
        // Get order details from session storage
        const storedOrderDetails = sessionStorage.getItem('order_details');
        if (storedOrderDetails) {
          setOrderDetails(JSON.parse(storedOrderDetails));
        }

        // Fetch session details from server
        const response = await fetch(`/api/checkout/session/${sessionId}`);
        const result = await response.json();

        if (result.success) {
          setSessionDetails(result.data);
        } else {
          throw new Error(result.error || 'Failed to fetch session details');
        }

        // Clear stored order details
        sessionStorage.removeItem('order_details');
        sessionStorage.removeItem('checkout_session_id');

      } catch (err) {
        console.error('Error loading order details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    loadOrderDetails();
  }, [sessionId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const downloadReceipt = () => {
    toast({
      title: "Receipt download",
      description: "Your receipt will be emailed to you shortly.",
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-luxury-purple-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your order details...</p>
        </div>
      </div>
    );
  }

  if (error || !sessionDetails) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-6">
          <div className="rounded-full bg-red-100 p-6 w-24 h-24 mx-auto flex items-center justify-center">
            <Package className="h-12 w-12 text-red-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Order Not Found</h1>
            <p className="text-lg text-muted-foreground">
              {error || "We couldn't find your order details."}
            </p>
          </div>
          <div className="flex justify-center space-x-4">
            <Button variant="outline" asChild>
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Link>
            </Button>
            <Button asChild>
              <Link to="/orders">
                View Orders
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Success Header */}
      <div className="text-center space-y-6 mb-12">
        <div className="rounded-full bg-green-100 p-6 w-24 h-24 mx-auto flex items-center justify-center">
          <CheckCircle className="h-12 w-12 text-green-600" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Order Confirmed!</h1>
          <p className="text-xl text-muted-foreground">
            Thank you for your rental order. We've received your payment and will process your order shortly.
          </p>
        </div>
        <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
          <span>Order confirmation sent to:</span>
          <span className="font-medium text-foreground">{sessionDetails.customer_email}</span>
          <Mail className="h-4 w-4" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Summary */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Order Summary</span>
                <Badge variant="secondary">
                  Session: {sessionId?.slice(-8)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {orderDetails ? (
                <div className="space-y-4">
                  {orderDetails.items.map((item) => (
                    <div key={item.id} className="flex space-x-4 p-4 border rounded-lg">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded border"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder.svg';
                        }}
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{item.name}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline">{item.category}</Badge>
                          <span className="text-sm text-muted-foreground">
                            Quantity: {item.quantity}
                          </span>
                        </div>
                        {item.start_date && item.end_date && (
                          <div className="flex items-center space-x-2 mt-2 text-sm">
                            <Calendar className="h-4 w-4 text-luxury-purple-600" />
                            <span className="font-medium">Rental Period:</span>
                            <span>
                              {formatDate(item.start_date)} - {formatDate(item.end_date)}
                            </span>
                            <Badge variant="secondary">
                              {item.rental_days} days
                            </Badge>
                          </div>
                        )}
                        <div className="mt-2">
                          <span className="text-lg font-semibold text-luxury-purple-600">
                            £{(item.price_per_day * item.quantity * (item.rental_days || 1)).toFixed(2)}
                          </span>
                          <span className="text-sm text-muted-foreground ml-2">
                            (£{item.price_per_day}/day × {item.quantity} × {item.rental_days} days)
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Order details not available in this session.</p>
                  <p className="text-sm mt-2">Please check your email for full order confirmation.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery Information */}
          {orderDetails?.delivery_address && (
            <Card>
              <CardHeader>
                <CardTitle>Delivery Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">Delivery Address:</h4>
                  <div className="text-sm space-y-1">
                    <p>{orderDetails.delivery_address.line1}</p>
                    {orderDetails.delivery_address.line2 && (
                      <p>{orderDetails.delivery_address.line2}</p>
                    )}
                    <p>
                      {orderDetails.delivery_address.city}, {orderDetails.delivery_address.postal_code}
                    </p>
                    <p>{orderDetails.delivery_address.country}</p>
                  </div>
                </div>
                {orderDetails.special_instructions && (
                  <div>
                    <h4 className="font-semibold mb-2">Special Instructions:</h4>
                    <p className="text-sm text-muted-foreground">
                      {orderDetails.special_instructions}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Payment Summary & Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Amount Paid:</span>
                <span className="font-semibold">
                  £{(sessionDetails.amount_total / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Payment Status:</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {sessionDetails.payment_status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="text-sm">Card</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total:</span>
                <span className="text-luxury-purple-600">
                  £{(sessionDetails.amount_total / 100).toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button onClick={downloadReceipt} className="w-full" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download Receipt
            </Button>
            
            <Button asChild className="w-full">
              <Link to="/orders">
                <Package className="h-4 w-4 mr-2" />
                View My Orders
              </Link>
            </Button>
            
            <Button asChild className="w-full" variant="outline">
              <Link to="/products">
                Continue Shopping
              </Link>
            </Button>
            
            <Button asChild className="w-full" variant="ghost">
              <Link to="/">
                <Home className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          </div>

          {/* What's Next */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-800 text-lg">What's Next?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-blue-700">
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-xs font-semibold">
                  1
                </div>
                <p>We'll process your order and prepare your costumes</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-xs font-semibold">
                  2
                </div>
                <p>Your costumes will be delivered before your rental start date</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-xs font-semibold">
                  3
                </div>
                <p>Enjoy your rental period, then return using our prepaid label</p>
              </div>
            </CardContent>
          </Card>

          {/* Contact Support */}
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Need help with your order?
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/contact">
                  Contact Support
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
