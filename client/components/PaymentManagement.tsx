import { useState, useEffect } from 'react';
import { CreditCard, DollarSign, Clock, Check, AlertTriangle, Receipt, Download } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { toast } from './ui/use-toast';
import { useAuth } from '../contexts/AuthContext';

interface PaymentSchedule {
  deposit_amount: number;
  deposit_due_date: string;
  deposit_paid: boolean;
  deposit_paid_date?: string;
  final_amount: number;
  final_due_date: string;
  final_paid: boolean;
  final_paid_date?: string;
  total_amount: number;
}

interface Invoice {
  id: string;
  type: 'deposit' | 'final' | 'full';
  amount: number;
  issued_date: string;
  due_date: string;
  paid_date?: string;
  status: 'pending' | 'paid' | 'overdue';
  stripe_payment_intent_id?: string;
  download_url?: string;
}

interface OutstandingBalance {
  amount: number;
  due_date: string;
  type: 'deposit' | 'final';
  days_overdue?: number;
}

interface PaymentManagementProps {
  orderId: string;
  orderTotal: number;
  orderStatus: string;
  rentalStartDate: string;
}

export function PaymentManagement({ orderId, orderTotal, orderStatus, rentalStartDate }: PaymentManagementProps) {
  const { currentUser } = useAuth();
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentSchedule | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [outstandingBalance, setOutstandingBalance] = useState<OutstandingBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    fetchPaymentDetails();
  }, [orderId]);

  const fetchPaymentDetails = async () => {
    if (!currentUser) return;

    if (!orderId) {
      console.error('No orderId provided to PaymentManagement');
      toast({
        title: "Error",
        description: "Order ID is missing",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const token = await currentUser.getIdToken();

      const url = `${window.location.origin}/api/orders/${orderId}/payments`;
      console.log('Fetching payment details for order:', orderId, 'URL:', url);

      let response: Response;
      try {
        response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          },
          // ensure same-origin credentials allowed if needed
          credentials: 'same-origin'
        } as any);
      } catch (networkError) {
        console.error('Network error while fetching payment details:', networkError);
        console.error('navigator.onLine:', typeof navigator !== 'undefined' ? navigator.onLine : 'unknown');

        // Additional diagnostics: try an unauthenticated request to see if the endpoint is reachable
        try {
          const unauthResp = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
          console.warn('Unauthenticated request status:', unauthResp.status);
          try { const txt = await unauthResp.text(); console.warn('Unauthenticated response text:', txt); } catch (e) { console.warn('Failed to read unauthenticated response text', e); }
        } catch (e) {
          console.warn('Unauthenticated request also failed:', e);
        }

        // Try a simple ping to /api/ping
        try {
          const pingUrl = `${window.location.origin}/api/ping`;
          const pingResp = await fetch(pingUrl);
          console.warn('/api/ping status:', pingResp.status);
        } catch (e) {
          console.warn('Ping failed:', e);
        }

        throw networkError;
      }

      console.log('Payment details response status:', response.status);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: Failed to fetch payment details`;

        // Read the raw text once, then attempt to parse JSON from it. This avoids "body stream already read" errors.
        let raw: string | null = null;
        try {
          raw = await response.text();
        } catch (textError) {
          console.error('Failed to read error response text:', textError);
        }

        if (raw) {
          try {
            const errorData = JSON.parse(raw);
            console.error('Payment details error response (parsed):', JSON.stringify(errorData, null, 2));
            errorMessage = errorData.error || errorData.message || errorData.details || (errorData.errors && errorData.errors[0]) || raw || errorMessage;
          } catch (jsonParseError) {
            // Not JSON, use raw text
            console.error('Error response is not JSON, raw:', raw);
            errorMessage = raw || errorMessage;
          }
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Payment details response data:', data);

      if (data.success) {
        setPaymentSchedule(data.data?.schedule || null);
        setInvoices(data.data?.invoices || []);
        setOutstandingBalance(data.data?.outstanding_balance || null);
      } else {
        throw new Error(data.error || 'API returned unsuccessful response');
      }
    } catch (error) {
      console.error('Error fetching payment details:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load payment details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async (type: 'deposit' | 'final', amount: number) => {
    if (!currentUser) return;

    try {
      if (!currentUser) {
        throw new Error('You must be logged in to make a payment');
      }

      setPaymentLoading(true);
      const token = await currentUser.getIdToken();

      const url = `${window.location.origin}/api/orders/${orderId}/pay`;

      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'same-origin',
          body: JSON.stringify({
            payment_type: type,
            amount: amount
          })
        } as any);
      } catch (networkErr) {
        console.error('Network error while creating payment:', networkErr);
        toast({ title: 'Payment Error', description: `Network error: ${networkErr instanceof Error ? networkErr.message : String(networkErr)}`, variant: 'destructive' });
        return;
      }

      if (!response.ok) {
        // Read text safely
        let raw = '';
        try { raw = await response.text(); } catch (e) { /* ignore */ }
        console.error('Payment creation failed:', response.status, raw);
        const serverMsg = raw || response.statusText || 'Failed to create payment';
        toast({ title: 'Payment Error', description: serverMsg, variant: 'destructive' });
        return;
      }

      const data = await response.json();

      if (data.success && data.data.checkout_url) {
        // Redirect to Stripe Checkout
        window.location.href = data.data.checkout_url;
      } else {
        console.error('Unexpected payment response:', data);
        toast({ title: 'Payment Error', description: 'Unexpected server response when creating payment', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error in processPayment:', error);
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : 'Failed to process payment',
        variant: "destructive"
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  const downloadInvoice = async (invoiceId: string) => {
    if (!currentUser) return;

    try {
      const token = await currentUser.getIdToken();
      
      const response = await fetch(`/api/invoices/${invoiceId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to download invoice');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Download Error",
        description: "Failed to download invoice",
        variant: "destructive"
      });
    }
  };

  const getPaymentProgress = () => {
    if (!paymentSchedule) return 0;
    
    let paidAmount = 0;
    if (paymentSchedule.deposit_paid) paidAmount += paymentSchedule.deposit_amount;
    if (paymentSchedule.final_paid) paidAmount += paymentSchedule.final_amount;
    
    return (paidAmount / paymentSchedule.total_amount) * 100;
  };

  const getDaysUntilDue = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500 hover:bg-green-600">Paid</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Management
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Payment Progress */}
        {paymentSchedule && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Payment Progress</span>
              <span className="text-sm text-muted-foreground">
                £{((paymentSchedule.total_amount * getPaymentProgress()) / 100).toFixed(2)} / £{paymentSchedule.total_amount.toFixed(2)}
              </span>
            </div>
            <Progress value={getPaymentProgress()} className="h-2" />
          </div>
        )}

        {/* Outstanding Balance Alert */}
        {outstandingBalance && (
          <Alert variant={outstandingBalance.days_overdue ? "destructive" : "default"}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <div>
                  Outstanding {outstandingBalance.type} payment: £{outstandingBalance.amount.toFixed(2)}
                  {outstandingBalance.days_overdue ? (
                    <span className="text-red-600 ml-2">({outstandingBalance.days_overdue} days overdue)</span>
                  ) : (
                    <span className="ml-2">Due: {new Date(outstandingBalance.due_date).toLocaleDateString()}</span>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => processPayment(outstandingBalance.type, outstandingBalance.amount)}
                  disabled={paymentLoading}
                  className="ml-4"
                >
                  Pay Now
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Payment Schedule */}
        {paymentSchedule && (
          <div className="space-y-4">
            <h4 className="font-medium">Payment Schedule</h4>
            
            {/* Deposit */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${paymentSchedule.deposit_paid ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <div>
                  <div className="font-medium">Deposit Payment</div>
                  <div className="text-sm text-muted-foreground">
                    Due: {new Date(paymentSchedule.deposit_due_date).toLocaleDateString()}
                    {paymentSchedule.deposit_paid && paymentSchedule.deposit_paid_date && (
                      <span className="ml-2 text-green-600">
                        (Paid: {new Date(paymentSchedule.deposit_paid_date).toLocaleDateString()})
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="font-medium">£{paymentSchedule.deposit_amount.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">
                    {Math.round((paymentSchedule.deposit_amount / paymentSchedule.total_amount) * 100)}% of total
                  </div>
                </div>
                {!paymentSchedule.deposit_paid && (
                  <Button
                    size="sm"
                    onClick={() => processPayment('deposit', paymentSchedule.deposit_amount)}
                    disabled={paymentLoading}
                  >
                    Pay Deposit
                  </Button>
                )}
                {paymentSchedule.deposit_paid && (
                  <Badge className="bg-green-500">
                    <Check className="h-3 w-3 mr-1" />
                    Paid
                  </Badge>
                )}
              </div>
            </div>

            {/* Final Payment */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${paymentSchedule.final_paid ? 'bg-green-500' : paymentSchedule.deposit_paid ? 'bg-yellow-500' : 'bg-gray-300'}`} />
                <div>
                  <div className="font-medium">Final Payment</div>
                  <div className="text-sm text-muted-foreground">
                    Due: {new Date(paymentSchedule.final_due_date).toLocaleDateString()}
                    {paymentSchedule.final_paid && paymentSchedule.final_paid_date && (
                      <span className="ml-2 text-green-600">
                        (Paid: {new Date(paymentSchedule.final_paid_date).toLocaleDateString()})
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="font-medium">£{paymentSchedule.final_amount.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">
                    {Math.round((paymentSchedule.final_amount / paymentSchedule.total_amount) * 100)}% of total
                  </div>
                </div>
                {!paymentSchedule.final_paid && paymentSchedule.deposit_paid && (
                  <Button
                    size="sm"
                    onClick={() => processPayment('final', paymentSchedule.final_amount)}
                    disabled={paymentLoading}
                  >
                    Pay Final
                  </Button>
                )}
                {paymentSchedule.final_paid && (
                  <Badge className="bg-green-500">
                    <Check className="h-3 w-3 mr-1" />
                    Paid
                  </Badge>
                )}
                {!paymentSchedule.deposit_paid && (
                  <Badge variant="outline">Awaiting Deposit</Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Invoices & Receipts */}
        {invoices.length > 0 && (
          <>
            <Separator />
            <div className="space-y-4">
              <h4 className="font-medium">Invoices & Receipts</h4>
              <div className="space-y-2">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium capitalize">{invoice.type} {invoice.type === 'full' ? 'Payment' : 'Payment'}</div>
                        <div className="text-sm text-muted-foreground">
                          Issued: {new Date(invoice.issued_date).toLocaleDateString()}
                          {invoice.paid_date && (
                            <span className="ml-2">• Paid: {new Date(invoice.paid_date).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-medium">£{invoice.amount.toFixed(2)}</div>
                        {getPaymentStatusBadge(invoice.status)}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadInvoice(invoice.id)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Payment Terms */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <h5 className="font-medium mb-1">Payment Terms:</h5>
          <ul className="space-y-1">
            <li>• Deposit (30%) required within 24 hours of booking confirmation</li>
            <li>• Final payment (70%) due 7 days before rental start date</li>
            <li>• Late payment fees may apply for overdue payments</li>
            <li>• All payments are processed securely through Stripe</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
