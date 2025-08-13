import React, { useState } from 'react';
import { Bell, Plus, Trash2, Mail, MessageSquare, Calendar } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { toast } from 'sonner';

interface Alert {
  id: string;
  costumeName: string;
  dates: string[];
  emailEnabled: boolean;
  smsEnabled: boolean;
  createdAt: string;
}

interface NotificationSettings {
  bookingConfirmations: { email: boolean; sms: boolean };
  pickupReminders: { email: boolean; sms: boolean };
  returnReminders: { email: boolean; sms: boolean };
  paymentDue: { email: boolean; sms: boolean };
  specialOffers: { email: boolean; sms: boolean };
}

export default function AlertsNotifications() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isAddAlertOpen, setIsAddAlertOpen] = useState(false);
  const [newAlert, setNewAlert] = useState({
    costumeName: '',
    dates: [''],
    emailEnabled: true,
    smsEnabled: false
  });
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    bookingConfirmations: { email: true, sms: true },
    pickupReminders: { email: true, sms: false },
    returnReminders: { email: true, sms: false },
    paymentDue: { email: true, sms: true },
    specialOffers: { email: false, sms: false }
  });

  const addAlert = () => {
    if (!newAlert.costumeName.trim()) {
      toast.error('Please enter a costume name');
      return;
    }

    const alert: Alert = {
      id: Date.now().toString(),
      costumeName: newAlert.costumeName,
      dates: newAlert.dates.filter(date => date.trim()),
      emailEnabled: newAlert.emailEnabled,
      smsEnabled: newAlert.smsEnabled,
      createdAt: new Date().toISOString()
    };

    setAlerts(prev => [...prev, alert]);
    setNewAlert({
      costumeName: '',
      dates: [''],
      emailEnabled: true,
      smsEnabled: false
    });
    setIsAddAlertOpen(false);
    toast.success('Alert created successfully!');
  };

  const removeAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    toast.success('Alert removed');
  };

  const updateNotificationSetting = (category: keyof NotificationSettings, type: 'email' | 'sms', value: boolean) => {
    setNotificationSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [type]: value
      }
    }));
  };

  return (
    <div className="space-y-6">
      {/* Costume Alerts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Costume Alerts
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Get notified when your favorite costumes become available
              </p>
            </div>
            <Dialog open={isAddAlertOpen} onOpenChange={setIsAddAlertOpen}>
              <DialogTrigger asChild>
                <Button className="bg-brand-purple hover:bg-brand-purple-dark">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Alert
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Costume Alert</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="costumeName">Costume Name</Label>
                    <Input
                      id="costumeName"
                      placeholder="e.g., Royal Maharaja Wedding Costume"
                      value={newAlert.costumeName}
                      onChange={(e) => setNewAlert(prev => ({ ...prev, costumeName: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label>Preferred Dates (Optional)</Label>
                    {newAlert.dates.map((date, index) => (
                      <div key={index} className="flex gap-2 mt-2">
                        <Input
                          type="date"
                          value={date}
                          onChange={(e) => {
                            const newDates = [...newAlert.dates];
                            newDates[index] = e.target.value;
                            setNewAlert(prev => ({ ...prev, dates: newDates }));
                          }}
                        />
                        {index === newAlert.dates.length - 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setNewAlert(prev => ({ ...prev, dates: [...prev.dates, ''] }))}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <Label>Notification Methods</Label>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Email notifications</span>
                      <Switch
                        checked={newAlert.emailEnabled}
                        onCheckedChange={(checked) => setNewAlert(prev => ({ ...prev, emailEnabled: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">SMS notifications</span>
                      <Switch
                        checked={newAlert.smsEnabled}
                        onCheckedChange={(checked) => setNewAlert(prev => ({ ...prev, smsEnabled: checked }))}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={addAlert} className="flex-1">
                      Create Alert
                    </Button>
                    <Button variant="outline" onClick={() => setIsAddAlertOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold text-foreground">No alerts set</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create alerts to be notified when costumes become available.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div key={alert.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{alert.costumeName}</h3>
                      {alert.dates.length > 0 && alert.dates[0] && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Preferred dates: {alert.dates.join(', ')}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2">
                        {alert.emailEnabled && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            Email
                          </div>
                        )}
                        {alert.smsEnabled && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MessageSquare className="h-3 w-3" />
                            SMS
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAlert(alert.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose how you want to receive notifications
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(notificationSettings).map(([category, settings]) => (
              <div key={category} className="border-b border-gray-200 pb-4 last:border-b-0">
                <h4 className="font-medium mb-3 capitalize">
                  {category.replace(/([A-Z])/g, ' $1').trim()}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Email</span>
                    </div>
                    <Switch
                      checked={settings.email}
                      onCheckedChange={(checked) => updateNotificationSetting(category as keyof NotificationSettings, 'email', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">SMS</span>
                    </div>
                    <Switch
                      checked={settings.sms}
                      onCheckedChange={(checked) => updateNotificationSetting(category as keyof NotificationSettings, 'sms', checked)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <Button className="bg-brand-purple hover:bg-brand-purple-dark">
              Save Preferences
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
