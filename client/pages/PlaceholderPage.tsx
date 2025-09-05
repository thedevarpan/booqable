import { Construction, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface PlaceholderPageProps {
  title: string;
}

export default function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="flex flex-col items-center justify-center space-y-6 text-center">
        <div className="rounded-full bg-luxury-purple-100 p-6">
          <Construction className="h-12 w-12 text-luxury-purple-600" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          <p className="text-lg text-muted-foreground max-w-md">
            This page is currently under development. Please check back soon or continue exploring our site.
          </p>
        </div>
        
        <div className="flex space-x-4">
          <Button asChild variant="outline">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          <Button asChild className="bg-luxury-purple-600 hover:bg-luxury-purple-700">
            <Link to="/products">
              Browse Products
            </Link>
          </Button>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Need assistance? Feel free to use our support chat in the bottom right corner.
        </p>
      </div>
    </div>
  );
}
