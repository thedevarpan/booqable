import { useState } from 'react';
import { Calendar, Clock, Package, DollarSign, AlertTriangle, Edit, X, Check, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { toast } from './ui/use-toast';
import { useAuth } from '../contexts/AuthContext';

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  image?: string;
}

interface Order {
  id: string;
  number: string;
  status: string;
  payment_status: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  items: OrderItem[];
  delivery_address?: {
    line1: string;
    line2?: string;
    city: string;
    postcode: string;
    country: string;
  };
  special_instructions?: string;
  created_at: string;
}

interface OrderManagementProps {
  order: Order;
  onOrderUpdate: (updatedOrder: Order) => void;
}

export function OrderManagement({ order, onOrderUpdate }: OrderManagementProps) {
  const { currentUser } = useAuth();
  const [isModifying, setIsModifying] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [newStartDate, setNewStartDate] = useState(order.start_date ? order.start_date.split('T')[0] : '');
  const [newEndDate, setNewEndDate] = useState(order.end_date ? order.end_date.split('T')[0] : '');
  const [cancelReason, setCancelReason] = useState('');
  const [modifiedItems, setModifiedItems] = useState(order.items);
  const [specialInstructions, setSpecialInstructions] = useState(order.special_instructions || '');

  // Business rules
  const orderDate = order.created_at ? new Date(order.created_at) : new Date();
  const rentalStart = order.start_date ? new Date(order.start_date) : new Date();
  const now = new Date();
  const daysUntilRental = order.start_date ? Math.ceil((rentalStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const canModify = daysUntilRental > 28; // 4 week rule
  const canCancel = daysUntilRental > 28 && order.status !== 'cancelled';
  const canReschedule = daysUntilRental > 14 && order.status === 'confirmed';

  const calculateRefund = () => {
    if (daysUntilRental > 28) return order.total_amount;
    if (daysUntilRental > 14) return order.total_amount * 0.8; // 20% fee
    if (daysUntilRental > 7) return order.total_amount * 0.5; // 50% fee
    return 0; // No refund within 7 days
  };

  const handleModifyOrder = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/orders/${order.id}/modify`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          start_date: newStartDate,
          end_date: newEndDate,
          items: modifiedItems,
          special_instructions: specialInstructions
        })
      });

      if (!response.ok) throw new Error('Failed to modify order');
      
      const updatedOrder = await response.json();
      onOrderUpdate(updatedOrder.data);
      setIsModifying(false);
      toast({
        title: "Order Modified",
        description: "Your order has been successfully updated."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to modify order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: cancelReason,
          refund_amount: calculateRefund()
        })
      });

      if (!response.ok) throw new Error('Failed to cancel order');
      
      const cancelledOrder = await response.json();
      onOrderUpdate(cancelledOrder.data);
      setIsCancelling(false);
      toast({
        title: "Order Cancelled",
        description: `Your order has been cancelled. Refund of £${calculateRefund().toFixed(2)} will be processed within 3-5 business days.`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRescheduleOrder = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/orders/${order.id}/reschedule`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          new_start_date: newStartDate,
          new_end_date: newEndDate
        })
      });

      if (!response.ok) throw new Error('Failed to reschedule order');
      
      const rescheduledOrder = await response.json();
      onOrderUpdate(rescheduledOrder.data);
      setIsRescheduling(false);
      toast({
        title: "Order Rescheduled",
        description: "Your rental dates have been successfully updated."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reschedule order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateItemQuantity = (itemId: string, newQuantity: number) => {
    setModifiedItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, quantity: Math.max(0, newQuantity) } : item
      ).filter(item => item.quantity > 0)
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Order Management</CardTitle>
          <Badge variant={order.status === 'confirmed' ? 'default' : 'secondary'}>
            {order.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Business Rules Alert */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {daysUntilRental > 28 ? (
              "You can modify, reschedule, or cancel this order with full refund."
            ) : daysUntilRental > 14 ? (
              "You can reschedule this order. Cancellation incurs a 20% fee."
            ) : daysUntilRental > 7 ? (
              "Cancellation available with 50% refund. No modifications allowed."
            ) : (
              "No modifications or cancellations allowed within 7 days of rental."
            )}
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {canModify && (
            <Dialog open={isModifying} onOpenChange={setIsModifying}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Modify Order
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Modify Order #{order.number}</DialogTitle>
                  <DialogDescription>
                    Update your rental dates, quantities, or special instructions.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* Date Modification */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start-date">Start Date</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={newStartDate}
                        onChange={(e) => setNewStartDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-date">End Date</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={newEndDate}
                        onChange={(e) => setNewEndDate(e.target.value)}
                        min={newStartDate}
                      />
                    </div>
                  </div>

                  {/* Items Modification */}
                  <div>
                    <Label>Order Items</Label>
                    <div className="space-y-2 mt-2">
                      {modifiedItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            {item.image && (
                              <img src={item.image} alt={item.product_name} className="w-12 h-12 rounded object-cover" />
                            )}
                            <div>
                              <p className="font-medium">{item.product_name}</p>
                              <p className="text-sm text-muted-foreground">£{item.price}/day</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                            >
                              -
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                            >
                              +
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => updateItemQuantity(item.id, 0)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Special Instructions */}
                  <div>
                    <Label htmlFor="instructions">Special Instructions</Label>
                    <Textarea
                      id="instructions"
                      placeholder="Add any special sizing notes, delivery instructions, or other requirements..."
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsModifying(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleModifyOrder} disabled={loading}>
                    {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                    Save Changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {canReschedule && (
            <Dialog open={isRescheduling} onOpenChange={setIsRescheduling}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  Reschedule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reschedule Order #{order.number}</DialogTitle>
                  <DialogDescription>
                    Change your rental dates (subject to availability).
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="new-start-date">New Start Date</Label>
                    <Input
                      id="new-start-date"
                      type="date"
                      value={newStartDate}
                      onChange={(e) => setNewStartDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-end-date">New End Date</Label>
                    <Input
                      id="new-end-date"
                      type="date"
                      value={newEndDate}
                      onChange={(e) => setNewEndDate(e.target.value)}
                      min={newStartDate}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsRescheduling(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleRescheduleOrder} disabled={loading}>
                    {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                    Reschedule
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {canCancel && (
            <Dialog open={isCancelling} onOpenChange={setIsCancelling}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <X className="h-4 w-4 mr-2" />
                  Cancel Order
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cancel Order #{order.number}</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to cancel this order?
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <Alert>
                    <DollarSign className="h-4 w-4" />
                    <AlertDescription>
                      Refund amount: £{calculateRefund().toFixed(2)} ({Math.round((calculateRefund() / order.total_amount) * 100)}% of original payment)
                    </AlertDescription>
                  </Alert>
                  
                  <div>
                    <Label htmlFor="cancel-reason">Reason for Cancellation (Optional)</Label>
                    <Textarea
                      id="cancel-reason"
                      placeholder="Help us improve by sharing why you're cancelling..."
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCancelling(false)}>
                    Keep Order
                  </Button>
                  <Button variant="destructive" onClick={handleCancelOrder} disabled={loading}>
                    {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <X className="h-4 w-4 mr-2" />}
                    Cancel Order
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Order Timeline */}
        <Separator />
        <div className="text-sm text-muted-foreground">
          <p>Order placed: {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'Unknown'}</p>
          <p>Rental period: {order.start_date && order.end_date ? `${new Date(order.start_date).toLocaleDateString()} - ${new Date(order.end_date).toLocaleDateString()}` : 'Dates not set'}</p>
          <p>Days until rental: {daysUntilRental} days</p>
        </div>
      </CardContent>
    </Card>
  );
}
