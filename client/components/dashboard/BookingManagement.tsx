import React, { useState, useEffect } from 'react';
import { Calendar, Edit, Trash2, RefreshCw, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { booqableAPI, type ModifiableBooking } from '../../lib/booqable';



export default function BookingManagement() {
  const [bookings, setBookings] = useState<ModifiableBooking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<ModifiableBooking | null>(null);
  const [isModifyDialogOpen, setIsModifyDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modifying, setModifying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [modificationForm, setModificationForm] = useState({
    startDate: '',
    endDate: '',
    quantities: {} as Record<string, number>
  });

  // Load modifiable bookings from Booqable API
  const loadBookings = async (showRefreshToast = false) => {
    try {
      setLoading(true);
      if (showRefreshToast) setRefreshing(true);

      const bookingsData = await booqableAPI.getModifiableBookings();
      setBookings(bookingsData);

      if (showRefreshToast) {
        toast.success(`Loaded ${bookingsData.length} modifiable bookings from Booqable`);
      }
    } catch (error) {
      console.error('Error loading modifiable bookings:', error);
      toast.error('Failed to load booking data from Booqable API.');
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const calculateRefundAmount = (booking: ModifiableBooking) => {
    const daysUntilRental = Math.floor((new Date(booking.rentalDates.start).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilRental >= booking.cancellationPolicy.fullRefund) {
      return { amount: booking.totalAmount, percentage: 100 };
    } else if (daysUntilRental >= booking.cancellationPolicy.partialRefund) {
      return { amount: booking.totalAmount * 0.5, percentage: 50 };
    } else if (daysUntilRental >= booking.cancellationPolicy.noRefund) {
      return { amount: booking.totalAmount * 0.25, percentage: 25 };
    } else {
      return { amount: 0, percentage: 0 };
    }
  };

  const handleModifyBooking = (booking: ModifiableBooking) => {
    setSelectedBooking(booking);
    setModificationForm({
      startDate: booking.rentalDates.start,
      endDate: booking.rentalDates.end,
      quantities: booking.items.reduce((acc, item) => ({
        ...acc,
        [item.id]: item.quantity
      }), {})
    });
    setIsModifyDialogOpen(true);
  };

  const handleCancelBooking = (booking: ModifiableBooking) => {
    setSelectedBooking(booking);
    setIsCancelDialogOpen(true);
  };

  const submitModification = async () => {
    if (!selectedBooking) return;

    try {
      setModifying(true);

      // Call Booqable API to modify booking
      const modifiedBooking = await booqableAPI.modifyBooking(selectedBooking.id, {
        startDate: modificationForm.startDate,
        endDate: modificationForm.endDate,
        quantities: modificationForm.quantities
      });

      // Update local state
      setBookings(prev => prev.map(booking =>
        booking.id === selectedBooking.id ? modifiedBooking : booking
      ));

      toast.success('Booking modified successfully!');
      setIsModifyDialogOpen(false);

      // Refresh the bookings list to get latest data
      setTimeout(() => loadBookings(), 1000);
    } catch (error) {
      console.error('Error modifying booking:', error);
      toast.error('Failed to modify booking. Please try again.');
    } finally {
      setModifying(false);
    }
  };

  const submitCancellation = async () => {
    if (!selectedBooking) return;

    try {
      setCancelling(true);
      const refundInfo = calculateRefundAmount(selectedBooking);

      // Call Booqable API to cancel booking
      const result = await booqableAPI.cancelBooking(selectedBooking.id);

      if (result.success) {
        // Update local state
        setBookings(prev => prev.map(booking =>
          booking.id === selectedBooking.id
            ? { ...booking, status: 'cancelled' as const }
            : booking
        ));

        toast.success(`Booking cancelled successfully. Refund of £${refundInfo.amount.toLocaleString()} will be processed within 5-7 business days.`);
        setIsCancelDialogOpen(false);

        // Refresh the bookings list
        setTimeout(() => loadBookings(), 1000);
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('Failed to cancel booking. Please contact support.');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status: ModifiableBooking['status']) => {
    const statusConfig = {
      confirmed: { label: 'Confirmed', className: 'bg-blue-100 text-blue-800' },
      delivered: { label: 'Delivered', className: 'bg-green-100 text-green-800' },
      returned: { label: 'Returned', className: 'bg-gray-100 text-gray-800' },
      cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[status];
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Manage Your Bookings
              </CardTitle>
              <p className="text-muted-foreground">
                Modify dates, quantities, or cancel your upcoming rentals
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => loadBookings(true)}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Bookings List */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="text-center py-12">
              <RefreshCw className="mx-auto h-12 w-12 text-muted-foreground animate-spin" />
              <h3 className="mt-2 text-sm font-semibold text-foreground">Loading modifiable bookings...</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Fetching your booking data from Booqable
              </p>
            </CardContent>
          </Card>
        ) : bookings.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold text-foreground">No modifiable bookings</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                You don't have any upcoming bookings that can be modified.
              </p>
            </CardContent>
          </Card>
        ) : (
          bookings.map((booking) => {
            const refundInfo = calculateRefundAmount(booking);
            const daysUntilRental = Math.floor((new Date(booking.rentalDates.start).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            
            return (
              <Card key={booking.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <h3 className="text-lg font-semibold text-foreground">
                          {booking.orderNumber}
                        </h3>
                        {getStatusBadge(booking.status)}
                        {daysUntilRental <= 3 && booking.status === 'confirmed' && (
                          <Badge className="bg-orange-100 text-orange-800">
                            <Clock className="h-3 w-3 mr-1" />
                            Rental Soon
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium mb-2">Items:</h4>
                          {booking.items.map((item, index) => (
                            <div key={index} className="flex items-center gap-3 mb-2">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-12 h-12 object-cover rounded-lg"
                              />
                              <div className="flex-1">
                                <p className="font-medium text-sm">{item.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Qty: {item.quantity} × £{item.pricePerDay}/day
                                </p>
                                {!item.available && (
                                  <p className="text-xs text-red-600">Currently unavailable</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">Rental Details:</h4>
                          <div className="space-y-2">
                            <div>
                              <p className="text-sm text-muted-foreground">Pickup Date:</p>
                              <p className="font-medium">{new Date(booking.rentalDates.start).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Return Date:</p>
                              <p className="font-medium">{new Date(booking.rentalDates.end).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Duration:</p>
                              <p className="font-medium">{booking.rentalDates.days} days</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Total Amount:</p>
                              <p className="font-semibold text-brand-purple">£{booking.totalAmount.toLocaleString()}</p>
                            </div>
                          </div>

                          {/* Modification/Cancellation Info */}
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Modification deadline:</p>
                            <p className="text-sm font-medium">{new Date(booking.modificationDeadline).toLocaleDateString()}</p>
                            
                            {booking.canCancel && (
                              <div className="mt-2">
                                <p className="text-xs text-muted-foreground">Cancellation refund:</p>
                                <p className="text-sm font-medium text-brand-emerald">
                                  £{refundInfo.amount.toLocaleString()} ({refundInfo.percentage}%)
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      {booking.canModify && booking.status === 'confirmed' && (
                        <Button
                          variant="outline"
                          onClick={() => handleModifyBooking(booking)}
                          className="flex items-center gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Modify Booking
                        </Button>
                      )}

                      {booking.canCancel && booking.status === 'confirmed' && (
                        <Button
                          variant="outline"
                          onClick={() => handleCancelBooking(booking)}
                          className="flex items-center gap-2 text-red-600 border-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Cancel Booking
                        </Button>
                      )}

                      {booking.status === 'delivered' && (
                        <Button
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Request Extension
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Modification Dialog */}
      <Dialog open={isModifyDialogOpen} onOpenChange={setIsModifyDialogOpen}>
        {selectedBooking && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Modify Booking {selectedBooking.orderNumber}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Pickup Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={modificationForm.startDate}
                    onChange={(e) => setModificationForm(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Return Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={modificationForm.endDate}
                    onChange={(e) => setModificationForm(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label>Item Quantities</Label>
                {selectedBooking.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2">
                    <span className="text-sm">{item.name}</span>
                    <Input
                      type="number"
                      min="1"
                      value={modificationForm.quantities[item.id] || item.quantity}
                      onChange={(e) => setModificationForm(prev => ({
                        ...prev,
                        quantities: {
                          ...prev.quantities,
                          [item.id]: parseInt(e.target.value) || 1
                        }
                      }))}
                      className="w-20"
                    />
                  </div>
                ))}
              </div>

              <div className="bg-yellow-50 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800">Modification Policy</p>
                    <p className="text-yellow-700 mt-1">
                      Changes must be made at least 24 hours before your pickup date.
                      Additional charges may apply for date changes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={submitModification}
                  className="flex-1"
                  disabled={modifying}
                >
                  {modifying ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Confirm Changes'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsModifyDialogOpen(false)}
                  disabled={modifying}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Cancellation Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        {selectedBooking && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Cancel Booking {selectedBooking.orderNumber}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Cancellation Details</p>
                    <p className="text-sm text-red-700 mt-1">
                      You will receive a refund of £{calculateRefundAmount(selectedBooking).amount.toLocaleString()}
                      ({calculateRefundAmount(selectedBooking).percentage}% of total amount).
                    </p>
                    <p className="text-sm text-red-700 mt-2">
                      This action cannot be undone. The refund will be processed within 5-7 business days.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  onClick={submitCancellation}
                  className="flex-1"
                  disabled={cancelling}
                >
                  {cancelling ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    'Confirm Cancellation'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsCancelDialogOpen(false)}
                  disabled={cancelling}
                >
                  Keep Booking
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
