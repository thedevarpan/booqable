import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Lock, Bell, CreditCard, Trash2, Save, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '../contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';

interface UserProfileData {
  displayName: string;
  email: string;
  phone: string;
  address: {
    line1: string;
    line2: string;
    city: string;
    postcode: string;
    country: string;
  };
  preferences: {
    notifications: boolean;
    newsletter: boolean;
  };
}

export default function Settings() {
  const { currentUser, userProfile, updateUserProfile, updateUserPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<UserProfileData>({
    displayName: '',
    email: '',
    phone: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      postcode: '',
      country: 'GB'
    },
    preferences: {
      notifications: true,
      newsletter: false
    }
  });

  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  // Load user data
  useEffect(() => {
    if (userProfile && currentUser) {
      setFormData({
        displayName: userProfile.displayName || '',
        email: currentUser.email || '',
        phone: userProfile.phone || '',
        address: {
          line1: userProfile.address?.line1 || '',
          line2: userProfile.address?.line2 || '',
          city: userProfile.address?.city || '',
          postcode: userProfile.address?.postcode || '',
          country: userProfile.address?.country || 'GB'
        },
        preferences: {
          notifications: userProfile.preferences?.notifications ?? true,
          newsletter: userProfile.preferences?.newsletter ?? false
        }
      });
    }
  }, [userProfile, currentUser]);

  // Load billing payment methods
  useEffect(() => {
    const loadPaymentMethods = async () => {
      if (!currentUser || !userProfile?.booqableCustomerId) return;
      try {
        setBillingLoading(true);
        const token = await currentUser.getIdToken();
        const res = await fetch(`/api/customers/${userProfile.booqableCustomerId}/payment-methods`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setPaymentMethods(Array.isArray(data.data) ? data.data : []);
        }
      } catch (e) {
        console.error('Failed to load payment methods', e);
      } finally {
        setBillingLoading(false);
      }
    };
    loadPaymentMethods();
  }, [currentUser, userProfile?.booqableCustomerId]);

  // Handle profile form changes
  const handleFormChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof UserProfileData],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  // Save profile changes
  const saveProfile = async () => {
    try {
      setLoading(true);
      
      await updateUserProfile({
        displayName: formData.displayName,
        phone: formData.phone,
        address: formData.address,
        preferences: formData.preferences
      });

      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Change password
  const changePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    try {
      setPasswordLoading(true);
      await updateUserPassword(passwordForm.currentPassword, passwordForm.newPassword);
      toast({
        title: "Password Changed",
        description: "Your password has been successfully updated.",
      });

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Please log in to access settings</h1>
        <Button asChild>
          <Link to="/login">Login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <p className="text-lg text-muted-foreground">
          Manage your account preferences and security settings
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={userProfile?.photoURL || ''} />
                  <AvatarFallback className="text-lg">
                    {formData.displayName?.charAt(0) || formData.email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <input id="photo-input" type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 1024 * 1024) {
                      toast({ title: 'Image too large', description: 'Max 1MB', variant: 'destructive' });
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = async () => {
                      try {
                        await updateUserProfile({ photoURL: reader.result as string });
                        toast({ title: 'Photo updated' });
                      } catch (err) {
                        toast({ title: 'Failed to update photo', variant: 'destructive' });
                      }
                    };
                    reader.readAsDataURL(file);
                  }} />
                  <Button variant="outline" size="sm" onClick={() => document.getElementById('photo-input')?.click()}>
                    Change Photo
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG or GIF. 1MB max.
                  </p>
                </div>
              </div>

              <Separator />

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Full Name</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => handleFormChange('displayName', e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed here. Contact support if needed.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleFormChange('phone', e.target.value)}
                    placeholder="+44 123 456 7890"
                  />
                </div>
              </div>

              <Separator />

              {/* Address */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Address
                </h3>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="line1">Address Line 1</Label>
                    <Input
                      id="line1"
                      value={formData.address.line1}
                      onChange={(e) => handleFormChange('address.line1', e.target.value)}
                      placeholder="Street address"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="line2">Address Line 2 (Optional)</Label>
                    <Input
                      id="line2"
                      value={formData.address.line2}
                      onChange={(e) => handleFormChange('address.line2', e.target.value)}
                      placeholder="Apartment, suite, etc."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.address.city}
                        onChange={(e) => handleFormChange('address.city', e.target.value)}
                        placeholder="City"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="postcode">Postcode</Label>
                      <Input
                        id="postcode"
                        value={formData.address.postcode}
                        onChange={(e) => handleFormChange('address.postcode', e.target.value)}
                        placeholder="SW1A 1AA"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={formData.address.country}
                        onChange={(e) => handleFormChange('address.country', e.target.value)}
                        placeholder="United Kingdom"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveProfile} disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Enter current password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                  >
                    {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Enter new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                  >
                    {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                  >
                    {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button onClick={changePassword} disabled={passwordLoading} className="w-full">
                {passwordLoading ? 'Changing Password...' : 'Change Password'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose what notifications you'd like to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-base font-medium">Order Updates</div>
                  <div className="text-sm text-muted-foreground">
                    Get notified about order confirmations, shipping updates, and delivery status
                  </div>
                </div>
                <Switch
                  checked={formData.preferences.notifications}
                  onCheckedChange={(checked) => handleFormChange('preferences.notifications', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-base font-medium">Newsletter</div>
                  <div className="text-sm text-muted-foreground">
                    Receive our weekly newsletter with new arrivals and special offers
                  </div>
                </div>
                <Switch
                  checked={formData.preferences.newsletter}
                  onCheckedChange={(checked) => handleFormChange('preferences.newsletter', checked)}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={saveProfile} disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Billing Information
              </CardTitle>
              <CardDescription>
                Manage your payment methods and billing details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {billingLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Loading payment methods...
                </div>
              ) : paymentMethods.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No payment methods saved</h3>
                  <p className="text-muted-foreground mb-4">
                    Add a payment method to make checkout faster
                  </p>
                  <Button onClick={() => toast({ title: 'Add Payment Method', description: 'Payment method setup will be completed at checkout.' })}>Add Payment Method</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {paymentMethods.map((pm) => (
                    <div key={pm.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium capitalize">{pm.type} ••���• {pm.card?.last4}</div>
                        <div className="text-sm text-muted-foreground">{pm.card?.brand?.toUpperCase()} · Expires {pm.card?.exp_month}/{pm.card?.exp_year}</div>
                      </div>
                      {pm.is_default && <Badge>Default</Badge>}
                    </div>
                  ))}
                  <Button variant="outline" onClick={() => toast({ title: 'Add Payment Method', description: 'Payment method setup will be completed at checkout.' })}>Add Payment Method</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertDescription>
                  Once you delete your account, there is no going back. Please be certain.
                </AlertDescription>
              </Alert>
              
              <Button variant="destructive" className="mt-4">
                Delete Account
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
