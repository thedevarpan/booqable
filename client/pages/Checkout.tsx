import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Package, CreditCard, Truck, Calendar, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';

interface DeliveryAddress {
  line1: string;
  line2?: string;
  city: string;
  postal_code: string;
  country: string;
}

interface CustomerInfo {
  name: string;
  email: string;
  phone?: string;
}

export default function Checkout() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { state: cartState, clearCart } = useCart();
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: currentUser?.displayName || '',
    email: currentUser?.email || '',
    phone: ''
  });
  
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>({
    line1: '',
    line2: '',
    city: '',
    postal_code: '',
    country: 'GB'
  });
  
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [sameAsRegistration, setSameAsRegistration] = useState(false);

  // Redirect if cart is empty
  useEffect(() => {
    if (cartState.items.length === 0) {
      navigate('/cart');
    }
  }, [cartState.items.length, navigate]);

  // Calculate totals
  const subtotal = cartState.total;
  const deliveryFee = subtotal >= 100 ? 0 : 10;
  const total = subtotal + deliveryFee;
  const deposit = Math.max(1, Math.round(total * 0.10 * 100) / 100);
  const balanceDue = Math.max(0, Math.round((total - deposit) * 100) / 100);

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle checkout submission
  const handleCheckout = async () => {
    if (!agreeToTerms) {
      toast({
        title: "Terms required",
        description: "Please accept the terms and conditions to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!customerInfo.name || !customerInfo.email) {
      toast({
        title: "Customer information required",
        description: "Please fill in your name and email address.",
        variant: "destructive",
      });
      return;
    }

    if (!deliveryAddress.line1 || !deliveryAddress.city || !deliveryAddress.postal_code) {
      toast({
        title: "Delivery address required",
        description: "Please fill in your delivery address.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Prepare cart items for checkout
      const items = cartState.items.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        start_date: item.start_date!,
        end_date: item.end_date!,
        rental_days: item.rental_days!,
        price_per_day: item.price_per_day
      }));

      // Create Stripe checkout session
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items,
          customer: customerInfo,
          delivery_address: deliveryAddress,
          special_instructions: specialInstructions
        }),
      });

      const raw = await response.text();
      let result: any;
      try {
        result = raw ? JSON.parse(raw) : {};
      } catch {
        result = { success: false, error: raw };
      }

      if (!response.ok) {
        throw new Error(result?.error || 'Failed to create checkout session');
      }

      if (result.success && result.data?.checkout_url) {
        // Store order details in session storage for success page
        sessionStorage.setItem('checkout_session_id', result.data.session_id);
        sessionStorage.setItem('order_details', JSON.stringify({
          items: cartState.items,
          customer: customerInfo,
          delivery_address: deliveryAddress,
          special_instructions: specialInstructions,
          total: result.data.grand_total,
          deposit: result.data.deposit ?? deposit,
          balance_due: result.data.balance_due ?? balanceDue
        }));

        // Clear cart since we're proceeding to payment
        clearCart();

        // Redirect to Stripe Checkout
        window.location.href = result.data.checkout_url;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Checkout failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (cartState.items.length === 0) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <span>/</span>
        <Link to="/cart" className="hover:text-foreground">Cart</Link>
        <span>/</span>
        <span className="text-foreground">Checkout</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Checkout Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground">Checkout</h1>
            <Button variant="outline" asChild>
              <Link to="/cart">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Cart
              </Link>
            </Button>
          </div>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter your phone number"
                />
              </div>
            </CardContent>
          </Card>

          {/* Delivery Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Truck className="h-5 w-5 mr-2" />
                Delivery Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="line1">Address Line 1 *</Label>
                <Input
                  id="line1"
                  value={deliveryAddress.line1}
                  onChange={(e) => setDeliveryAddress(prev => ({ ...prev, line1: e.target.value }))}
                  placeholder="Street address, building number"
                  required
                />
              </div>
              <div>
                <Label htmlFor="line2">Address Line 2</Label>
                <Input
                  id="line2"
                  value={deliveryAddress.line2}
                  onChange={(e) => setDeliveryAddress(prev => ({ ...prev, line2: e.target.value }))}
                  placeholder="Apartment, suite, unit, etc. (optional)"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={deliveryAddress.city}
                    onChange={(e) => setDeliveryAddress(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="City"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="postal_code">Postal Code *</Label>
                  <Input
                    id="postal_code"
                    value={deliveryAddress.postal_code}
                    onChange={(e) => setDeliveryAddress(prev => ({ ...prev, postal_code: e.target.value }))}
                    placeholder="Postal code"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Special Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Special Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="instructions">Delivery Notes (Optional)</Label>
              <Textarea
                id="instructions"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Any special delivery instructions, access codes, or preferences..."
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Terms and Conditions */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="terms"
                  checked={agreeToTerms}
                  onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
                />
                <div className="text-sm">
                  <Label htmlFor="terms" className="cursor-pointer">
                    I agree to the{' '}
                    <Link to="/rental-terms" className="text-luxury-purple-600 hover:underline">
                      Rental Terms & Conditions
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy" className="text-luxury-purple-600 hover:underline">
                      Privacy Policy
                    </Link>
                  </Label>
                  <p className="text-muted-foreground mt-1">
                    By checking this box, you acknowledge that you understand the rental terms,
                    damage protection policy, and return requirements.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cart Items */}
              <div className="space-y-3">
                {cartState.items.map((item) => (
                  <div key={item.id} className="flex space-x-3 p-3 border rounded-lg">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded border"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder.svg';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm line-clamp-2">{item.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">{item.category}</Badge>
                        <span className="text-xs text-muted-foreground">Qty: {item.quantity}</span>
                      </div>
                      {item.start_date && item.end_date && (
                        <div className="flex items-center space-x-1 mt-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {formatDate(item.start_date)} - {formatDate(item.end_date)}
                          </span>
                        </div>
                      )}
                      <div className="font-semibold text-sm mt-1">
                        £{(item.price_per_day * item.quantity * (item.rental_days || 1)).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Pricing Summary */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal ({cartState.totalItems} items):</span>
                  <span>£{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery:</span>
                  <span className={deliveryFee === 0 ? 'text-green-600' : ''}>
                    {deliveryFee === 0 ? 'Free' : `£${deliveryFee.toFixed(2)}`}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span>Deposit (10%) now:</span>
                  <span>£{deposit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold">
                  <span>Balance Due:</span>
                  <span className="text-luxury-purple-600">£{balanceDue.toFixed(2)}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <Button
                onClick={handleCheckout}
                disabled={loading || !agreeToTerms}
                className="w-full bg-luxury-purple-600 hover:bg-luxury-purple-700"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay 10% Deposit (£{deposit.toFixed(2)})
                  </>
                )}
              </Button>

              {subtotal < 100 && (
                <p className="text-sm text-muted-foreground text-center">
                  Add £{(100 - subtotal).toFixed(2)} more for free delivery
                </p>
              )}
            </CardContent>
          </Card>

          {/* Security Info */}
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-sm">
                  <div className="font-medium text-green-800">Secure Payment</div>
                  <div className="text-green-700">
                    Your payment information is encrypted and secure
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rental Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Rental Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start space-x-2">
                <Calendar className="h-4 w-4 mt-0.5 text-luxury-purple-600" />
                <div>
                  <span className="font-medium">Minimum Rental:</span>
                  <p className="text-muted-foreground">8 days minimum for all items</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <Package className="h-4 w-4 mt-0.5 text-luxury-purple-600" />
                <div>
                  <span className="font-medium">Damage Protection:</span>
                  <p className="text-muted-foreground">Professional cleaning included</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <Truck className="h-4 w-4 mt-0.5 text-luxury-purple-600" />
                <div>
                  <span className="font-medium">Delivery:</span>
                  <p className="text-muted-foreground">Free delivery on orders over £100</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
