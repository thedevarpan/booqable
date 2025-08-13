import React, { useState, useEffect } from 'react';
import { MessageCircle, Mail, Phone, Clock, Send } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

interface SupportTicket {
  id: string;
  subject: string;
  status: 'open' | 'in-progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  lastUpdate: string;
}

const mockTickets: SupportTicket[] = [
  {
    id: 'TK-001',
    subject: 'Issue with costume sizing',
    status: 'in-progress',
    priority: 'medium',
    createdAt: '2024-02-20',
    lastUpdate: '2024-02-21'
  }
];

export default function SupportContact() {
  const [tickets] = useState<SupportTicket[]>(mockTickets);
  const [contactForm, setContactForm] = useState({
    subject: '',
    message: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chatWidget, setChatWidget] = useState(false);

  // Initialize live chat widget (Tawk.to or Crisp)
  useEffect(() => {
    // Example Tawk.to integration
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://embed.tawk.to/YOUR_TAWK_ID/YOUR_WIDGET_ID';
    script.charset = 'UTF-8';
    script.setAttribute('crossorigin', '*');
    
    // Uncomment below to actually load the widget
    // document.head.appendChild(script);

    setChatWidget(true);
    
    return () => {
      // Cleanup if needed
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contactForm.subject.trim() || !contactForm.message.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // Submit to your backend/email service
      console.log('Submitting support ticket:', contactForm);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success('Support ticket submitted successfully! We\'ll get back to you soon.');
      setContactForm({ subject: '', message: '', priority: 'medium' });
    } catch (error) {
      toast.error('Failed to submit ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: SupportTicket['status']) => {
    const statusConfig = {
      'open': { label: 'Open', className: 'bg-blue-100 text-blue-800' },
      'in-progress': { label: 'In Progress', className: 'bg-yellow-100 text-yellow-800' },
      'resolved': { label: 'Resolved', className: 'bg-green-100 text-green-800' }
    };

    const config = statusConfig[status];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: SupportTicket['priority']) => {
    const priorityConfig = {
      'low': { label: 'Low', className: 'bg-gray-100 text-gray-800' },
      'medium': { label: 'Medium', className: 'bg-orange-100 text-orange-800' },
      'high': { label: 'High', className: 'bg-red-100 text-red-800' }
    };

    const config = priorityConfig[priority];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Quick Support Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.Tawk_API?.toggle()}>
          <CardContent className="p-6 text-center">
            <MessageCircle className="h-8 w-8 text-brand-purple mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Live Chat</h3>
            <p className="text-sm text-muted-foreground">
              Get instant help from our support team
            </p>
            <div className="flex items-center justify-center gap-1 mt-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-green-600">Online now</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Mail className="h-8 w-8 text-brand-emerald mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Email Support</h3>
            <p className="text-sm text-muted-foreground mb-2">
              support@costumerent.com
            </p>
            <p className="text-xs text-muted-foreground">
              Response within 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Phone className="h-8 w-8 text-brand-gold mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Phone Support</h3>
            <p className="text-sm text-muted-foreground mb-2">
              +91 123-456-7890
            </p>
            <p className="text-xs text-muted-foreground">
              Mon-Fri 9AM-6PM IST
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Existing Tickets */}
      {tickets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Your Support Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{ticket.id}</h3>
                        {getStatusBadge(ticket.status)}
                        {getPriorityBadge(ticket.priority)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{ticket.subject}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                        <span>Last update: {new Date(ticket.lastUpdate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contact Form */}
      <Card>
        <CardHeader>
          <CardTitle>Submit a Support Request</CardTitle>
          <p className="text-sm text-muted-foreground">
            Describe your issue and we'll help you resolve it quickly
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitTicket} className="space-y-4">
            <div>
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                placeholder="Brief description of your issue"
                value={contactForm.subject}
                onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                value={contactForm.priority}
                onChange={(e) => setContactForm(prev => ({ ...prev, priority: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-purple focus:border-transparent"
              >
                <option value="low">Low - General question</option>
                <option value="medium">Medium - Issue affecting service</option>
                <option value="high">High - Urgent issue</option>
              </select>
            </div>

            <div>
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                placeholder="Please provide as much detail as possible about your issue..."
                rows={6}
                value={contactForm.message}
                onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                required
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Before submitting:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Check our FAQ section for common issues</li>
                <li>• Include your order number if this relates to a booking</li>
                <li>• Attach screenshots if applicable</li>
                <li>• Provide your contact phone number for urgent issues</li>
              </ul>
            </div>

            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-brand-purple hover:bg-brand-purple-dark"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Request
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <details className="border border-gray-200 rounded-lg p-4">
              <summary className="font-medium cursor-pointer">How do I modify my booking?</summary>
              <p className="text-sm text-muted-foreground mt-2">
                You can modify your booking dates and quantities through the Booking Management section 
                in your dashboard, provided it's at least 24 hours before your pickup date.
              </p>
            </details>
            
            <details className="border border-gray-200 rounded-lg p-4">
              <summary className="font-medium cursor-pointer">What's your cancellation policy?</summary>
              <p className="text-sm text-muted-foreground mt-2">
                Cancellations made 7+ days before rental: 100% refund<br/>
                3-6 days before: 50% refund<br/>
                1-2 days before: 25% refund<br/>
                Same day: No refund
              </p>
            </details>
            
            <details className="border border-gray-200 rounded-lg p-4">
              <summary className="font-medium cursor-pointer">How do I track my order?</summary>
              <p className="text-sm text-muted-foreground mt-2">
                You can track your order status in the Account Portal section. You'll also receive 
                SMS and email updates about pickup, delivery, and return schedules.
              </p>
            </details>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
