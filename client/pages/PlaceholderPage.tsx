import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Construction, MessageCircle } from 'lucide-react';
import { Button } from '../components/ui/button';

interface PlaceholderPageProps {
  pageTitle: string;
}

export default function PlaceholderPage({ pageTitle }: PlaceholderPageProps) {
  const params = useParams();
  
  const getPageDescription = () => {
    switch (pageTitle) {
      case 'Category':
        return `Browse costumes in the ${params.categoryId?.replace('-', ' ')} category`;
      case 'All Categories':
        return 'Explore all costume categories and find the perfect outfit for your event';
      case 'Shopping Cart':
        return 'Review your selected costumes and proceed to checkout';
      case 'My Orders':
        return 'View your rental history and track current orders';
      case 'Settings':
        return 'Manage your account preferences and profile information';
      default:
        return 'This page is coming soon. We\'re working hard to bring you amazing features!';
    }
  };

  const getSuggestedActions = () => {
    switch (pageTitle) {
      case 'Category':
      case 'All Categories':
        return [
          { text: 'Browse Featured Costumes', link: '/#featured' },
          { text: 'View Trending Items', link: '/#trending' },
        ];
      case 'Shopping Cart':
        return [
          { text: 'Continue Shopping', link: '/' },
          { text: 'View Featured Items', link: '/#featured' },
        ];
      case 'My Orders':
      case 'Settings':
        return [
          { text: 'Go to Homepage', link: '/' },
          { text: 'Browse Costumes', link: '/#categories' },
        ];
      default:
        return [
          { text: 'Go to Homepage', link: '/' },
          { text: 'Browse Categories', link: '/#categories' },
        ];
    }
  };

  return (
    <div className="min-h-screen bg-background pt-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center text-brand-purple hover:text-brand-purple-dark transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </div>

        {/* Main Content */}
        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-brand-purple-light to-brand-emerald-light rounded-full flex items-center justify-center">
            <Construction className="h-12 w-12 text-brand-purple" />
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {pageTitle}
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {getPageDescription()}
          </p>

          <div className="bg-brand-purple-light/20 border border-brand-purple-light rounded-xl p-8 mb-8 max-w-2xl mx-auto">
            <div className="flex items-center justify-center mb-4">
              <MessageCircle className="h-6 w-6 text-brand-purple mr-2" />
              <span className="font-semibold text-brand-purple">Coming Soon!</span>
            </div>
            <p className="text-muted-foreground">
              This page is currently under development. Please continue exploring our homepage 
              or try one of the suggestions below. If you need specific features for this page, 
              feel free to ask and we'll prioritize building it for you!
            </p>
          </div>

          {/* Suggested Actions */}
          <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
            {getSuggestedActions().map((action, index) => (
              <Button
                key={index}
                asChild
                variant={index === 0 ? 'default' : 'outline'}
                size="lg"
                className={index === 0 ? 'bg-brand-purple hover:bg-brand-purple-dark' : 'border-brand-purple text-brand-purple hover:bg-brand-purple hover:text-white'}
              >
                <Link to={action.link}>
                  {action.text}
                </Link>
              </Button>
            ))}
          </div>

          {/* Additional Info */}
          <div className="mt-12 text-sm text-muted-foreground">
            <p>Need help or have questions? Our customer support team is here to assist you.</p>
            <p className="mt-2">
              <span className="font-semibold">Email:</span> support@costumerent.com | 
              <span className="font-semibold ml-4">Phone:</span> +91 123-456-7890
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-12 border-t border-border">
          <div className="text-center">
            <div className="text-3xl font-bold text-brand-purple mb-2">5000+</div>
            <div className="text-muted-foreground">Happy Customers</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-brand-purple mb-2">1500+</div>
            <div className="text-muted-foreground">Costume Collection</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-brand-purple mb-2">50+</div>
            <div className="text-muted-foreground">Cities Served</div>
          </div>
        </div>
      </div>
    </div>
  );
}
