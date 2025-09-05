import React from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, Calendar, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';

export default function Cart() {
  const { state: cartState, updateQuantity, removeItem, updateDates } = useCart();
  const { toast } = useToast();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(itemId);
      toast({
        title: "Item removed",
        description: "Item has been removed from your cart.",
      });
    } else {
      updateQuantity(itemId, newQuantity);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    removeItem(itemId);
    toast({
      title: "Item removed",
      description: "Item has been removed from your cart.",
    });
  };

  const calculateItemTotal = (item: typeof cartState.items[0]) => {
    return item.price_per_day * item.quantity * (item.rental_days || 1);
  };

  if (cartState.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center space-y-6 text-center py-16">
          <div className="rounded-full bg-gray-100 p-6">
            <ShoppingBag className="h-12 w-12 text-gray-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Your Cart is Empty</h1>
            <p className="text-lg text-muted-foreground max-w-md">
              Looks like you haven't added any costumes to your cart yet.
            </p>
          </div>
          <div className="flex space-x-4">
            <Button variant="outline" asChild>
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Continue Shopping
              </Link>
            </Button>
            <Button asChild className="bg-luxury-purple-600 hover:bg-luxury-purple-700">
              <Link to="/products">
                Browse Products
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <span>/</span>
        <span className="text-foreground">Shopping Cart</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground">Your Cart</h1>
            <Badge variant="secondary">{cartState.totalItems} items</Badge>
          </div>

          <div className="space-y-4">
            {cartState.items.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Product Image */}
                    <div className="w-full sm:w-32 h-32 flex-shrink-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover rounded-lg border"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder.svg';
                        }}
                      />
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:justify-between">
                        <div>
                          <Link 
                            to={`/costume/${item.id}`}
                            className="text-lg font-semibold hover:text-luxury-purple-600 transition-colors"
                          >
                            {item.name}
                          </Link>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline">{item.category}</Badge>
                            <span className="text-sm text-muted-foreground">
                              £{item.price_per_day.toFixed(2)}/day
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Rental Dates */}
                      {item.start_date && item.end_date && (
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {formatDate(item.start_date)} - {formatDate(item.end_date)}
                          </span>
                          <Badge variant="outline" className="ml-2">
                            {item.rental_days} days
                          </Badge>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        {/* Quantity Controls */}
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium">Quantity:</span>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                              className="h-8 w-8 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                              className="w-16 text-center h-8"
                              min="1"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              className="h-8 w-8 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Item Total */}
                        <div className="text-lg font-semibold text-luxury-purple-600">
                          £{calculateItemTotal(item).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Continue Shopping */}
          <div className="flex justify-between items-center pt-4">
            <Button variant="outline" asChild>
              <Link to="/products">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Continue Shopping
              </Link>
            </Button>
          </div>
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal ({cartState.totalItems} items):</span>
                  <span>£{cartState.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery:</span>
                  <span className="text-green-600">
                    {cartState.total >= 100 ? 'Free' : '£10.00'}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total:</span>
                  <span className="text-luxury-purple-600">
                    £{(cartState.total + (cartState.total >= 100 ? 0 : 10)).toFixed(2)}
                  </span>
                </div>
              </div>

              <Button className="w-full bg-luxury-purple-600 hover:bg-luxury-purple-700" asChild>
                <Link to="/checkout">
                  Proceed to Checkout
                </Link>
              </Button>

              {cartState.total < 100 && (
                <p className="text-sm text-muted-foreground text-center">
                  Add £{(100 - cartState.total).toFixed(2)} more for free delivery
                </p>
              )}
            </CardContent>
          </Card>

          {/* Rental Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Rental Information
              </CardTitle>
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
            </CardContent>
          </Card>

          {/* Security Badge */}
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 text-sm text-muted-foreground">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-green-500"></div>
              </div>
              <span>Secure checkout guaranteed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
