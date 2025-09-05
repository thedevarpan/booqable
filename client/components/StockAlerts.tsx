import { useState, useEffect } from 'react';
import { safeFetch } from '@/lib/safeFetch';
import { Bell, Calendar, Mail, Trash2, Check, Plus, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { toast } from './ui/use-toast';
import { useAuth } from '../contexts/AuthContext';

interface StockAlert {
  id: string;
  product_id: string;
  product_name: string;
  product_image: string;
  start_date: string;
  end_date: string;
  email: string;
  phone?: string;
  created_at: string;
  triggered_at?: string;
  status: 'active' | 'triggered' | 'expired';
}

interface StockAlertsProps {
  productId?: string;
  productName?: string;
  productImage?: string;
  className?: string;
}

export function StockAlerts({ productId, productName, productImage, className }: StockAlertsProps) {
  const { currentUser } = useAuth();
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Form state for creating new alert
  const [alertForm, setAlertForm] = useState({
    start_date: '',
    end_date: '',
    email: currentUser?.email || '',
    phone: ''
  });

  useEffect(() => {
    if (currentUser) {
      fetchUserAlerts();
    }
  }, [currentUser]);

  const fetchUserAlerts = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const token = await currentUser.getIdToken();
      
      const response = await safeFetch('/api/user/stock-alerts', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        timeoutMs: 8000
      });

      if (!response || !response.ok) throw new Error('Failed to fetch alerts');

      const data = await response.json().catch(() => null);
      
      if (data.success) {
        setAlerts(data.data.alerts);
      }
    } catch (error) {
      console.error('Error fetching stock alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const createStockAlert = async () => {
    if (!currentUser || !productId) return;

    if (!alertForm.start_date || !alertForm.end_date || !alertForm.email) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (new Date(alertForm.start_date) >= new Date(alertForm.end_date)) {
      toast({
        title: "Invalid Dates",
        description: "End date must be after start date",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const token = await currentUser.getIdToken();
      
      const response = await safeFetch('/api/stock-alerts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_id: productId,
          product_name: productName,
          product_image: productImage,
          start_date: alertForm.start_date,
          end_date: alertForm.end_date,
          email: alertForm.email,
          phone: alertForm.phone
        }),
        timeoutMs: 10000
      });

      if (!response || !response.ok) throw new Error('Failed to create alert');

      const data = await response.json().catch(() => null);
      
      if (data.success) {
        setAlerts(prev => [...prev, data.data.alert]);
        setShowCreateDialog(false);
        setAlertForm({
          start_date: '',
          end_date: '',
          email: currentUser?.email || '',
          phone: ''
        });
        
        toast({
          title: "Alert Created",
          description: "You'll be notified when this item becomes available for your dates"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create stock alert",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteStockAlert = async (alertId: string) => {
    if (!currentUser) return;

    try {
      const token = await currentUser.getIdToken();
      
      const response = await safeFetch(`/api/stock-alerts/${alertId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeoutMs: 8000
      });

      if (!response || !response.ok) throw new Error('Failed to delete alert');

      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      
      toast({
        title: "Alert Deleted",
        description: "Stock alert has been removed"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete alert",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Active</Badge>;
      case 'triggered':
        return <Badge className="bg-green-500 hover:bg-green-600">Notified</Badge>;
      case 'expired':
        return <Badge variant="secondary">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Filter alerts for current product if productId is provided
  const filteredAlerts = productId 
    ? alerts.filter(alert => alert.product_id === productId)
    : alerts;

  return (
    <div className={className}>
      {/* Create Alert Button (for specific product) */}
      {productId && (
        <div className="mb-4">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Bell className="h-4 w-4 mr-2" />
                Get Notified When Available
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Stock Alert</DialogTitle>
                <DialogDescription>
                  We'll notify you when "{productName}" becomes available for your desired dates.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={alertForm.start_date}
                      onChange={(e) => setAlertForm(prev => ({ ...prev, start_date: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={alertForm.end_date}
                      onChange={(e) => setAlertForm(prev => ({ ...prev, end_date: e.target.value }))}
                      min={alertForm.start_date || new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={alertForm.email}
                    onChange={(e) => setAlertForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="your@email.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone Number (Optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={alertForm.phone}
                    onChange={(e) => setAlertForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+44 7XXX XXXXXX"
                  />
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You'll receive an email notification as soon as this item becomes available for your selected dates.
                  </AlertDescription>
                </Alert>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={createStockAlert} disabled={loading}>
                  <Bell className="h-4 w-4 mr-2" />
                  Create Alert
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Alerts List */}
      {filteredAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5" />
              {productId ? 'Your Alerts for This Item' : 'Stock Alerts'}
              <Badge variant="outline">{filteredAlerts.length}</Badge>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {filteredAlerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  {alert.product_image && (
                    <img
                      src={alert.product_image}
                      alt={alert.product_name}
                      className="w-12 h-12 rounded object-cover"
                    />
                  )}
                  <div>
                    <div className="font-medium">{alert.product_name}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(alert.start_date)} - {formatDate(alert.end_date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {alert.email}
                      </span>
                    </div>
                    {alert.triggered_at && (
                      <div className="text-xs text-green-600 mt-1">
                        Notified on {formatDate(alert.triggered_at)}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {getStatusBadge(alert.status)}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteStockAlert(alert.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {filteredAlerts.length === 0 && !productId && (
        <Card>
          <CardContent className="p-8 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Stock Alerts</h3>
            <p className="text-muted-foreground mb-4">
              Create alerts to get notified when items become available for your desired dates.
            </p>
            <Button asChild>
              <a href="/products">Browse Products</a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Standalone Stock Alerts Management Page Component
export function StockAlertsPage() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Please log in to manage your stock alerts</h1>
        <Button asChild>
          <a href="/login">Login</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Stock Alerts</h1>
        <p className="text-lg text-muted-foreground">
          Manage your notifications for when items become available
        </p>
      </div>

      <StockAlerts />
      
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>How Stock Alerts Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-luxury-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Plus className="h-6 w-6 text-luxury-purple-600" />
                </div>
                <h3 className="font-medium mb-2">1. Create Alert</h3>
                <p className="text-sm text-muted-foreground">
                  Set up alerts for specific items and date ranges when browsing products
                </p>
              </div>
              
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-luxury-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Bell className="h-6 w-6 text-luxury-emerald-600" />
                </div>
                <h3 className="font-medium mb-2">2. Get Notified</h3>
                <p className="text-sm text-muted-foreground">
                  Receive email notifications when items become available for your dates
                </p>
              </div>
              
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-luxury-gold-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check className="h-6 w-6 text-luxury-gold-600" />
                </div>
                <h3 className="font-medium mb-2">3. Book Fast</h3>
                <p className="text-sm text-muted-foreground">
                  Click the link in your notification to quickly reserve the item
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
