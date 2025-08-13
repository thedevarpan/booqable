import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, Calendar, ShoppingBag, ArrowLeft, CreditCard } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from '../components/AuthModal';
import { useAuthenticatedAction } from '../hooks/useAuthenticatedAction';
import { toast } from 'sonner';

export default function Cart() {
  const { items, itemCount, totalAmount, updateQuantity, removeItem, clearCart } = useCart();
  const { currentUser } = useAuth();
  const { executeAction, showAuthModal, authModalMode, closeAuthModal } = useAuthenticatedAction();
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);

  const applyPromoCode = () => {
    // Mock promo code functionality
    if (promoCode.toLowerCase() === 'welcome10') {
      setPromoDiscount(0.1); // 10% discount
      toast.success('Promo code applied! 10% discount');
    } else if (promoCode.toLowerCase() === 'first20') {
      setPromoDiscount(0.2); // 20% discount
      toast.success('Promo code applied! 20% discount');
    } else {
      toast.error('Invalid promo code');
    }
  };

  const handleCheckout = () => {
    executeAction(() => {
      // User is authenticated, proceed to checkout
      console.log('Proceeding to checkout with items:', items);
      // Here you would integrate with Stripe
      toast.success('Proceeding to checkout...');
    }, 'login');
  };

  const discountAmount = totalAmount * promoDiscount;
  const finalAmount = totalAmount - discountAmount;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background pt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <div className="mb-8">
            <Link
              to="/"
              className="inline-flex items-center text-brand-purple hover:text-brand-purple-dark transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Continue Shopping
            </Link>
          </div>

          {/* Empty Cart */}
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-brand-purple-light to-brand-emerald-light rounded-full flex items-center justify-center">
              <ShoppingBag className="h-12 w-12 text-brand-purple" />
            </div>

            <h1 className="text-3xl font-bold text-foreground mb-4">
              Your Cart is Empty
            </h1>

            <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
              Looks like you haven't added any costumes to your cart yet. 
              Start browsing our amazing collection!
            </p>

            <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
              <Button asChild size="lg" className="bg-brand-purple hover:bg-brand-purple-dark">
                <Link to="/#featured">
                  Browse Featured Costumes
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-brand-purple text-brand-purple hover:bg-brand-purple hover:text-white">
                <Link to="/#categories">
                  View All Categories
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center text-brand-purple hover:text-brand-purple-dark transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Continue Shopping
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-3xl font-bold text-foreground mb-4 sm:mb-0">
              Shopping Cart ({itemCount} {itemCount === 1 ? 'item' : 'items'})
            </h1>
            
            {items.length > 0 && (
              <Button
                variant="outline"
                onClick={clearCart}
                className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Cart
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {items.map((item) => (
              <div key={`${item.id}-${item.rentalDates.startDate}`} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Product Image */}
                  <div className="w-full sm:w-32 h-48 sm:h-32 flex-shrink-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <div>
                        <h3 className="font-semibold text-lg text-foreground">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">{item.category}</p>
                        {item.size && (
                          <p className="text-sm text-muted-foreground">Size: {item.size}</p>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 self-start"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Rental Dates */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(item.rentalDates.startDate).toLocaleDateString()} - {' '}
                        {new Date(item.rentalDates.endDate).toLocaleDateString()} 
                        ({item.rentalDates.days} {item.rentalDates.days === 1 ? 'day' : 'days'})
                      </span>
                    </div>

                    {/* Price and Quantity */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold text-brand-purple">
                              £{item.price}
                            </span>
                            <span className="text-sm text-muted-foreground">/day</span>
                            {item.originalPrice && (
                              <span className="text-sm text-muted-foreground line-through">
                                £{item.originalPrice}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Total: £{item.price * item.quantity * item.rentalDates.days}
                          </div>
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">Qty:</span>
                        <div className="flex items-center border border-gray-300 rounded-lg">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="h-8 w-8 p-0 hover:bg-gray-100"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="px-3 py-1 text-sm font-medium w-12 text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="h-8 w-8 p-0 hover:bg-gray-100"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-foreground mb-6">Order Summary</h2>

              {/* Promo Code */}
              <div className="mb-6">
                <label htmlFor="promo" className="block text-sm font-medium text-foreground mb-2">
                  Promo Code
                </label>
                <div className="flex gap-2">
                  <Input
                    id="promo"
                    type="text"
                    placeholder="Enter code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={applyPromoCode}
                    className="border-brand-purple text-brand-purple hover:bg-brand-purple hover:text-white"
                  >
                    Apply
                  </Button>
                </div>
                {promoDiscount > 0 && (
                  <p className="text-sm text-brand-emerald mt-2">
                    ✓ {Math.round(promoDiscount * 100)}% discount applied
                  </p>
                )}
              </div>

              {/* Summary Details */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal ({itemCount} items)</span>
                  <span className="font-medium">£{totalAmount.toFixed(2)}</span>
                </div>

                {promoDiscount > 0 && (
                  <div className="flex justify-between text-sm text-brand-emerald">
                    <span>Discount ({Math.round(promoDiscount * 100)}%)</span>
                    <span>-£{discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className="font-medium">
                    {finalAmount > 999 ? 'FREE' : '£50'}
                  </span>
                </div>

                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span className="text-brand-purple">
                      £{finalAmount > 999 ? finalAmount.toFixed(2) : (finalAmount + 50).toFixed(2)}
                    </span>
                  </div>
                  {finalAmount <= 999 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Add £{(999 - finalAmount + 1).toFixed(0)} more for free delivery
                    </p>
                  )}
                </div>
              </div>

              {/* Checkout Button */}
              <Button
                onClick={handleCheckout}
                className="w-full bg-brand-purple hover:bg-brand-purple-dark text-white py-3 text-lg font-semibold"
                size="lg"
              >
                <CreditCard className="h-5 w-5 mr-2" />
                Proceed to Checkout
              </Button>

              {!currentUser && (
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  You'll need to sign in to complete your order
                </p>
              )}

              {/* Security Notice */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-muted-foreground text-center">
                  <span className="font-semibold">Secure Checkout</span><br />
                  Your payment information is encrypted and secure
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Modal */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={closeAuthModal}
          defaultMode={authModalMode}
        />
      </div>
    </div>
  );
}
