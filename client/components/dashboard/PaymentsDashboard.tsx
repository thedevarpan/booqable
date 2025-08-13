import React, { useState, useEffect } from 'react';
import { CreditCard, Download, DollarSign, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { toast } from 'sonner';
import { booqableAPI, type Booking } from '../../lib/booqable';

interface Payment {
  id: string;
  orderNumber: string;
  amount: number;
  type: 'deposit' | 'full' | 'balance';
  status: 'paid' | 'pending' | 'failed';
  date: string;
  method: string;
  receiptUrl?: string;
}

interface OutstandingBalance {
  orderNumber: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  dueDate: string;
  description: string;
}


export default function PaymentsDashboard() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [outstandingBalances, setOutstandingBalances] = useState<OutstandingBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Load payment data from Booqable API
  const loadPaymentData = async (showRefreshToast = false) => {
    try {
      setLoading(true);
      if (showRefreshToast) setRefreshing(true);

      const bookings = await booqableAPI.getBookings();

      // Convert bookings to payment records
      const paymentRecords: Payment[] = bookings.map(booking => ({
        id: booking.id,
        orderNumber: booking.orderNumber,
        amount: booking.paidAmount,
        type: booking.paidAmount >= booking.totalAmount ? 'full' : 'deposit',
        status: 'paid' as const,
        date: booking.createdAt.split('T')[0],
        method: 'Credit Card', // This would come from payment processor
        receiptUrl: booking.invoiceUrl
      }));

      // Calculate outstanding balances
      const outstandingBalanceRecords: OutstandingBalance[] = bookings
        .filter(booking => booking.paidAmount < booking.totalAmount)
        .map(booking => ({
          orderNumber: booking.orderNumber,
          totalAmount: booking.totalAmount,
          paidAmount: booking.paidAmount,
          balanceAmount: booking.totalAmount - booking.paidAmount,
          dueDate: booking.rentalDates.start, // Due before rental start
          description: `Final payment for ${booking.items.map(item => item.name).join(', ')}`
        }));

      setPayments(paymentRecords);
      setOutstandingBalances(outstandingBalanceRecords);

      if (showRefreshToast) {
        toast.success(`Loaded ${paymentRecords.length} payments from Booqable`);
      }
    } catch (error) {
      console.error('Error loading payment data:', error);
      toast.error('Failed to load payment data from Booqable API.');
      setPayments([]);
      setOutstandingBalances([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPaymentData();
  }, []);

  const handlePayBalance = async (balance: OutstandingBalance) => {
    setIsProcessingPayment(true);
    
    try {
      // Integrate with Stripe here
      console.log('Processing payment for:', balance.orderNumber);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('Payment processed successfully!');
      // Remove from outstanding balances and add to payments
      
    } catch (error) {
      toast.error('Payment failed. Please try again.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const downloadReceipt = (payment: Payment) => {
    if (payment.receiptUrl) {
      const link = document.createElement('a');
      link.href = payment.receiptUrl;
      link.download = `receipt-${payment.orderNumber}.pdf`;
      link.click();
    }
  };

  const getPaymentStatusBadge = (status: Payment['status']) => {
    const statusConfig = {
      paid: { label: 'Paid', className: 'bg-green-100 text-green-800' },
      pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
      failed: { label: 'Failed', className: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[status];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const totalPaid = payments.reduce((sum, payment) => payment.status === 'paid' ? sum + payment.amount : sum, 0);
  const totalOutstanding = outstandingBalances.reduce((sum, balance) => sum + balance.balanceAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payments Dashboard</h1>
          <p className="text-muted-foreground">Manage your payments and outstanding balances</p>
        </div>
        <Button
          variant="outline"
          onClick={() => loadPaymentData(true)}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
                <p className="text-2xl font-bold text-green-600">{loading ? '-' : `£${totalPaid.toLocaleString()}`}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold text-orange-600">{loading ? '-' : `£${totalOutstanding.toLocaleString()}`}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-brand-purple" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
                <p className="text-2xl font-bold">{loading ? '-' : payments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Balances */}
      {(loading || outstandingBalances.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Outstanding Balances
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="mx-auto h-8 w-8 text-muted-foreground animate-spin" />
                <p className="mt-2 text-sm text-muted-foreground">Loading outstanding balances...</p>
              </div>
            ) : outstandingBalances.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
                <h3 className="mt-2 text-sm font-semibold text-foreground">No outstanding balances</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  All your payments are up to date!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
              {outstandingBalances.map((balance, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{balance.orderNumber}</h3>
                      <p className="text-muted-foreground text-sm mb-2">{balance.description}</p>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Total Amount:</p>
                          <p className="font-medium">£{balance.totalAmount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Paid:</p>
                          <p className="font-medium text-green-600">£{balance.paidAmount.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="mt-2">
                        <p className="text-muted-foreground text-sm">Due Date:</p>
                        <p className="font-medium">{new Date(balance.dueDate).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">Amount Due</p>
                      <p className="text-2xl font-bold text-orange-600 mb-4">
                        £{balance.balanceAmount.toLocaleString()}
                      </p>
                      
                      <Button
                        onClick={() => handlePayBalance(balance)}
                        disabled={isProcessingPayment}
                        className="bg-brand-purple hover:bg-brand-purple-dark"
                      >
                        {isProcessingPayment ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4 mr-2" />
                            Pay Now
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="mx-auto h-8 w-8 text-muted-foreground animate-spin" />
              <p className="mt-2 text-sm text-muted-foreground">Loading payment history...</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold text-foreground">No payments yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Your payment history will appear here once you make your first booking.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div key={payment.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{payment.orderNumber}</h3>
                        {getPaymentStatusBadge(payment.status)}
                        <Badge variant="outline" className="text-xs">
                          {payment.type.charAt(0).toUpperCase() + payment.type.slice(1)} Payment
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Amount:</p>
                          <p className="font-semibold text-lg">£{payment.amount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Payment Method:</p>
                          <p className="font-medium">{payment.method}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Date:</p>
                          <p className="font-medium">{new Date(payment.date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Transaction ID:</p>
                          <p className="font-mono text-xs">{payment.id}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {payment.receiptUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadReceipt(payment)}
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Receipt
                        </Button>
                      )}
                      
                      {payment.status === 'failed' && (
                        <Button
                          size="sm"
                          className="bg-brand-purple hover:bg-brand-purple-dark"
                        >
                          Retry Payment
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Saved Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CreditCard className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold text-foreground">No saved payment methods</h3>
            <p className="mt-1 text-sm text-muted-foreground mb-4">
              Add a payment method for faster checkout.
            </p>
            <Button variant="outline">
              <CreditCard className="h-4 w-4 mr-2" />
              Add Payment Method
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
