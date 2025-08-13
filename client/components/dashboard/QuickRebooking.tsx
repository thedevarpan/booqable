import React, { useState, useEffect } from 'react';
import { RefreshCw, Calendar, Edit, ShoppingCart } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { useCart } from '../../contexts/CartContext';
import { toast } from 'sonner';
import { booqableAPI, type Booking } from '../../lib/booqable';

type PreviousOrder = Booking;


export default function QuickRebooking() {
  const [previousOrders, setPreviousOrders] = useState<PreviousOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PreviousOrder | null>(null);
  const [isRebookDialogOpen, setIsRebookDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rebookingForm, setRebookingForm] = useState({
    startDate: '',
    endDate: '',
    quantities: {} as Record<string, number>,
    specialInstructions: ''
  });
  const { addItem } = useCart();

  // Load completed bookings from Booqable API
  const loadPreviousOrders = async (showRefreshToast = false) => {
    try {
      setLoading(true);
      if (showRefreshToast) setRefreshing(true);

      const bookings = await booqableAPI.getBookings();
      // Filter to only show completed/returned orders for rebooking
      const completedOrders = bookings.filter(booking =>
        booking.status === 'returned' || booking.status === 'cancelled'
      );

      setPreviousOrders(completedOrders);

      if (showRefreshToast) {
        toast.success(`Loaded ${completedOrders.length} previous orders from Booqable`);
      }
    } catch (error) {
      console.error('Error loading previous orders:', error);
      toast.error('Failed to load previous orders from Booqable API.');
      setPreviousOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPreviousOrders();
  }, []);

  const handleQuickRebook = (order: PreviousOrder) => {
    // Quick rebook with same details, but new dates (7 days from today)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 7);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7 + order.rentalDates.days);

    order.items.forEach(item => {
      const cartItem = {
        id: item.id,
        name: item.name,
        image: item.image,
        price: item.pricePerDay,
        category: 'Previous Order',
        rentalDates: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          days: order.rentalDates.days
        }
      };
      
      // Add each item separately to maintain quantities
      for (let i = 0; i < item.quantity; i++) {
        addItem(cartItem);
      }
    });

    toast.success(`Added ${order.items.length} items from previous order to cart!`);
  };

  const handleCustomRebook = (order: PreviousOrder) => {
    setSelectedOrder(order);
    
    // Initialize form with previous order data
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 7);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7 + order.rentalDates.days);

    setRebookingForm({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      quantities: order.items.reduce((acc, item) => ({
        ...acc,
        [item.id]: item.quantity
      }), {}),
      specialInstructions: ''
    });
    
    setIsRebookDialogOpen(true);
  };

  const submitCustomRebook = () => {
    if (!selectedOrder) return;

    const days = Math.floor((new Date(rebookingForm.endDate).getTime() - new Date(rebookingForm.startDate).getTime()) / (1000 * 60 * 60 * 24));

    selectedOrder.items.forEach(item => {
      const quantity = rebookingForm.quantities[item.id] || 0;
      if (quantity > 0) {
        const cartItem = {
          id: item.id,
          name: item.name,
          image: item.image,
          price: item.pricePerDay,
          category: 'Previous Order',
          rentalDates: {
            startDate: rebookingForm.startDate,
            endDate: rebookingForm.endDate,
            days: days
          }
        };
        
        // Add each item separately to maintain quantities
        for (let i = 0; i < quantity; i++) {
          addItem(cartItem);
        }
      }
    });

    toast.success('Custom rebooking added to cart successfully!');
    setIsRebookDialogOpen(false);
  };

  const calculateNewTotal = () => {
    if (!selectedOrder) return 0;
    
    const days = Math.floor((new Date(rebookingForm.endDate).getTime() - new Date(rebookingForm.startDate).getTime()) / (1000 * 60 * 60 * 24));
    
    return selectedOrder.items.reduce((total, item) => {
      const quantity = rebookingForm.quantities[item.id] || 0;
      return total + (item.pricePerDay * quantity * days);
    }, 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Quick Rebooking
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Easily book the same costumes from your previous orders
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => loadPreviousOrders(true)}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Previous Orders */}
      {loading ? (
        <Card>
          <CardContent className="text-center py-12">
            <RefreshCw className="mx-auto h-12 w-12 text-muted-foreground animate-spin" />
            <h3 className="mt-2 text-sm font-semibold text-foreground">Loading previous orders...</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Fetching your order history from Booqable
            </p>
          </CardContent>
        </Card>
      ) : previousOrders.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <RefreshCw className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold text-foreground">No previous orders</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete your first rental to use quick rebooking.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {previousOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold">{order.orderNumber}</h3>
                      <span className="text-sm text-muted-foreground">
                        Completed on {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Items Preview */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Items:</h4>
                      <div className="flex flex-wrap gap-3">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-10 h-10 object-cover rounded"
                            />
                            <div>
                              <p className="text-sm font-medium">{item.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Qty: {item.quantity} × £{item.pricePerDay}/day
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Original Rental Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Original Dates:</p>
                        <p className="font-medium">
                          {new Date(order.rentalDates.start).toLocaleDateString()} - {' '}
                          {new Date(order.rentalDates.end).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Duration:</p>
                        <p className="font-medium">{order.rentalDates.days} days</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Items:</p>
                        <p className="font-medium">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Original Total:</p>
                        <p className="font-semibold text-brand-purple">£{order.totalAmount.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 min-w-[200px]">
                    <Button
                      onClick={() => handleQuickRebook(order)}
                      className="bg-brand-purple hover:bg-brand-purple-dark"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Quick Rebook
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => handleCustomRebook(order)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Customize & Rebook
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Custom Rebooking Dialog */}
      <Dialog open={isRebookDialogOpen} onOpenChange={setIsRebookDialogOpen}>
        {selectedOrder && (
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customize Rebooking - {selectedOrder.orderNumber}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Date Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rebookStartDate">Pickup Date</Label>
                <Input
                  id="rebookStartDate"
                  type="date"
                  value={rebookingForm.startDate}
                  onChange={(e) => setRebookingForm(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="rebookEndDate">Return Date</Label>
                <Input
                  id="rebookEndDate"
                  type="date"
                  value={rebookingForm.endDate}
                  onChange={(e) => setRebookingForm(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>

            {/* Item Quantities */}
            <div>
              <Label>Adjust Quantities</Label>
              <div className="space-y-3 mt-2">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">£{item.pricePerDay}/day</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`qty-${item.id}`} className="sr-only">Quantity</Label>
                      <Input
                        id={`qty-${item.id}`}
                        type="number"
                        min="0"
                        max="10"
                        value={rebookingForm.quantities[item.id] || 0}
                        onChange={(e) => setRebookingForm(prev => ({
                          ...prev,
                          quantities: {
                            ...prev.quantities,
                            [item.id]: parseInt(e.target.value) || 0
                          }
                        }))}
                        className="w-20"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Special Instructions */}
            <div>
              <Label htmlFor="specialInstructions">Special Instructions (Optional)</Label>
              <textarea
                id="specialInstructions"
                rows={3}
                value={rebookingForm.specialInstructions}
                onChange={(e) => setRebookingForm(prev => ({ ...prev, specialInstructions: e.target.value }))}
                placeholder="Any special requests for this rental..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-purple focus:border-transparent"
              />
            </div>

            {/* New Total */}
            <div className="bg-brand-purple-light/20 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium">Estimated Total:</span>
                <span className="text-xl font-bold text-brand-purple">
                  £{calculateNewTotal().toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Final price may vary based on availability and current rates
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button 
                onClick={submitCustomRebook} 
                className="flex-1 bg-brand-purple hover:bg-brand-purple-dark"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add to Cart
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsRebookDialogOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
