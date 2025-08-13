import React, { useState, useEffect } from 'react';
import { Calendar, Download, Eye, Filter, Search, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { booqableAPI, type Booking, type BookingStats } from '../../lib/booqable';
import { toast } from 'sonner';



export default function AccountPortal() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [bookingStats, setBookingStats] = useState<BookingStats>({ totalBookings: 0, activeRentals: 0, totalSpent: 0, upcomingBookings: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load data from Booqable API
  const loadBookingData = async (showRefreshToast = false) => {
    try {
      setLoading(true);
      if (showRefreshToast) setRefreshing(true);

      const [bookingsData, statsData] = await Promise.all([
        booqableAPI.getBookings(),
        booqableAPI.getBookingStats()
      ]);

      setBookings(bookingsData);
      setBookingStats(statsData);

      if (showRefreshToast) {
        toast.success(`Loaded ${bookingsData.length} bookings from Booqable`);
      }
    } catch (error) {
      console.error('Error loading booking data:', error);
      toast.error('Failed to load booking data from Booqable API.');
      // Set empty arrays instead of fallback data
      setBookings([]);
      setBookingStats({ totalBookings: 0, activeRentals: 0, totalSpent: 0, upcomingBookings: 0 });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadBookingData();
  }, []);

  // Filter bookings based on search and status
  useEffect(() => {
    let filtered = bookings;

    if (searchTerm) {
      filtered = filtered.filter(booking =>
        booking.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    setFilteredBookings(filtered);
  }, [bookings, searchTerm, statusFilter]);

  const getStatusBadge = (status: Booking['status']) => {
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

  const handleDownloadInvoice = async (booking: Booking) => {
    try {
      if (booking.invoiceUrl) {
        // If we have a direct URL, download it
        const link = document.createElement('a');
        link.href = booking.invoiceUrl;
        link.download = `invoice-${booking.orderNumber}.pdf`;
        link.click();
        toast.success('Invoice download started');
      } else {
        // In a real implementation, you would call Booqable API to generate/fetch invoice
        toast.info('Invoice generation in progress...');
      }
    } catch (error) {
      toast.error('Failed to download invoice');
    }
  };

  const handleDownloadPackingSlip = async (booking: Booking) => {
    try {
      if (booking.packingSlipUrl) {
        const link = document.createElement('a');
        link.href = booking.packingSlipUrl;
        link.download = `packing-slip-${booking.orderNumber}.pdf`;
        link.click();
        toast.success('Packing slip download started');
      } else {
        toast.info('Packing slip generation in progress...');
      }
    } catch (error) {
      toast.error('Failed to download packing slip');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Account Portal</h1>
          <p className="text-muted-foreground">Manage your bookings and rental history</p>
        </div>
        <Button
          variant="outline"
          onClick={() => loadBookingData(true)}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-brand-purple" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold">{loading ? '-' : bookingStats.totalBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-brand-emerald" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Rentals</p>
                <p className="text-2xl font-bold">
                  {loading ? '-' : bookingStats.activeRentals}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-brand-gold" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold">
                  {loading ? '-' : `£${bookingStats.totalSpent.toLocaleString()}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold">
                  {loading ? '-' : bookingStats.upcomingBookings}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Booking History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by order number or costume name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-purple focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="confirmed">Confirmed</option>
                <option value="delivered">Delivered</option>
                <option value="returned">Returned</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Bookings List */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="mx-auto h-12 w-12 text-muted-foreground animate-spin" />
                <h3 className="mt-2 text-sm font-semibold text-foreground">Loading bookings...</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Fetching your booking data from Booqable
                </p>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold text-foreground">No bookings found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filters.' 
                    : 'Start browsing costumes to make your first booking!'}
                </p>
              </div>
            ) : (
              filteredBookings.map((booking) => (
                <div key={booking.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <h3 className="text-lg font-semibold text-foreground">
                          {booking.orderNumber}
                        </h3>
                        {getStatusBadge(booking.status)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Items:</p>
                          {booking.items.map((item, index) => (
                            <div key={index} className="flex items-center gap-3 mt-2">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-12 h-12 object-cover rounded-lg"
                              />
                              <div>
                                <p className="font-medium text-sm">{item.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Qty: {item.quantity} × £{item.pricePerDay}/day
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground">Rental Period:</p>
                          <p className="font-medium">
                            {new Date(booking.rentalDates.start).toLocaleDateString()} - {' '}
                            {new Date(booking.rentalDates.end).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            ({booking.rentalDates.days} days)
                          </p>
                          
                          <div className="mt-2">
                            <p className="text-sm text-muted-foreground">Total Amount:</p>
                            <p className="font-semibold text-brand-purple">£{booking.totalAmount.toLocaleString()}</p>
                            {booking.paidAmount < booking.totalAmount && (
                              <p className="text-sm text-orange-600">
                                Paid: £{booking.paidAmount.toLocaleString()}
                                (Balance: £{(booking.totalAmount - booking.paidAmount).toLocaleString()})
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      {booking.invoiceUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadInvoice(booking)}
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Invoice
                        </Button>
                      )}
                      {booking.packingSlipUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadPackingSlip(booking)}
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Packing Slip
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
