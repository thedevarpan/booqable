import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, ShoppingCart, Bell, User, Menu, X, LogOut, Settings, Package, Heart } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { firebaseAvailable } from '../lib/firebase';
import { NotificationDropdown } from './NotificationDropdown';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { state: cartState } = useCart();
  const { currentUser, userProfile, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <picture>
                <source srcSet="https://cdn.builder.io/api/v1/image/assets%2Ff9cc215e3ca54996a89f271179969b20%2F7c4a0ea236e141439a6888c80fdba58c?format=webp&width=800" type="image/webp" />
                <img src="https://cdn.builder.io/api/v1/image/assets%2Ff9cc215e3ca54996a89f271179969b20%2F7c4a0ea236e141439a6888c80fdba58c?format=webp&width=800" alt="Dance Costumes For Hire" className="h-8 w-8 rounded-md object-cover" />
              </picture>
              <span className="hidden font-bold text-luxury-purple-700 sm:inline-block">
                Dance Costumes For Hire
              </span>
            </Link>

            {/* Desktop Search Bar */}
            <div className="hidden flex-1 max-w-md mx-8 md:flex">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search costumes..."
                  className="pl-10 bg-muted/50 border-luxury-purple-200 focus:border-luxury-purple-500"
                />
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden space-x-6 md:flex">
              <Link
                to="/products"
                className={`text-sm font-medium transition-colors hover:text-luxury-purple-600 ${
                  isActive('/products') ? 'text-luxury-purple-600' : 'text-foreground'
                }`}
              >
                Products
              </Link>
            </nav>

            {/* Right Side Icons */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <NotificationDropdown />

              {/* Cart */}
              <Button variant="ghost" size="sm" className="relative" asChild>
                <Link to="/cart">
                  <ShoppingCart className="h-5 w-5" />
                  {cartState.totalItems > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs bg-luxury-emerald-500 text-white">
                      {cartState.totalItems}
                    </Badge>
                  )}
                </Link>
              </Button>

              {/* Profile/Login */}
              {currentUser ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="relative">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={userProfile?.photoURL || ''} />
                        <AvatarFallback>
                          {userProfile?.displayName?.charAt(0) || currentUser.email?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {userProfile?.displayName || 'User'}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {currentUser.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="w-full">
                        <User className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/orders" className="w-full">
                        <Package className="mr-2 h-4 w-4" />
                        My Orders
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/wishlist" className="w-full">
                        <Heart className="mr-2 h-4 w-4" />
                        Wishlist
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="w-full">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="hidden space-x-2 sm:flex">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/login">Login</Link>
                  </Button>
                  <Button size="sm" className="bg-luxury-purple-600 hover:bg-luxury-purple-700" asChild>
                    <Link to="/register">Sign Up</Link>
                  </Button>
                </div>
              )}

              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Search Bar */}
          <div className="pb-4 md:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search costumes..."
                className="pl-10 bg-muted/50 border-luxury-purple-200 focus:border-luxury-purple-500"
              />
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="border-t border-border/40 py-4 md:hidden">
              <nav className="flex flex-col space-y-4">
                <Link
                  to="/products"
                  className={`text-sm font-medium transition-colors hover:text-luxury-purple-600 ${
                    isActive('/products') ? 'text-luxury-purple-600' : 'text-foreground'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Products
                </Link>
                {currentUser ? (
                  <div className="flex flex-col space-y-2 pt-4 border-t">
                    <div className="flex items-center space-x-3 px-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={userProfile?.photoURL || ''} />
                        <AvatarFallback>
                          {userProfile?.displayName?.charAt(0) || currentUser.email?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {userProfile?.displayName || 'User'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {currentUser.email}
                        </p>
                      </div>
                    </div>
                    <Link
                      to="/dashboard"
                      className="text-sm font-medium hover:text-luxury-purple-600 px-2 py-1"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/orders"
                      className="text-sm font-medium hover:text-luxury-purple-600 px-2 py-1"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      My Orders
                    </Link>
                    <Link
                      to="/wishlist"
                      className="text-sm font-medium hover:text-luxury-purple-600 px-2 py-1"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Wishlist
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        logout();
                        setIsMenuOpen(false);
                      }}
                      className="justify-start text-red-600 hover:text-red-700"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </Button>
                  </div>
                ) : (
                  <div className="flex space-x-2 pt-2">
                    <Button variant="ghost" size="sm" className="flex-1" asChild>
                      <Link to="/login" onClick={() => setIsMenuOpen(false)}>Login</Link>
                    </Button>
                    <Button size="sm" className="flex-1 bg-luxury-purple-600 hover:bg-luxury-purple-700" asChild>
                      <Link to="/register" onClick={() => setIsMenuOpen(false)}>Sign Up</Link>
                    </Button>
                  </div>
                )}
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t bg-muted/50">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <img src="https://cdn.builder.io/api/v1/image/assets%2Ff9cc215e3ca54996a89f271179969b20%2F7c4a0ea236e141439a6888c80fdba58c?format=webp&width=800" alt="Dance Costumes For Hire" className="h-6 w-6 rounded-md object-cover" />
                <span className="font-bold text-luxury-purple-700">Dance Costumes For Hire</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Premium costume rentals for every occasion. Quality guaranteed.
              </p>
            </div>
            
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">About</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/about" className="hover:text-foreground">Our Story</Link></li>
                <li><Link to="/quality" className="hover:text-foreground">Quality Promise</Link></li>
                <li><Link to="/sustainability" className="hover:text-foreground">Sustainability</Link></li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/contact" className="hover:text-foreground">Contact Us</Link></li>
                <li><Link to="/faq" className="hover:text-foreground">FAQ</Link></li>
                <li><Link to="/size-guide" className="hover:text-foreground">Size Guide</Link></li>
                <li><Link to="/care-instructions" className="hover:text-foreground">Care Instructions</Link></li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Policies</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/rental-terms" className="hover:text-foreground">Rental Terms</Link></li>
                <li><Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
                <li><Link to="/returns" className="hover:text-foreground">Returns & Refunds</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 Costume Rental. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Floating Support Chat Button */}
      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-luxury-gold-500 shadow-lg hover:bg-luxury-gold-600 hover:shadow-xl"
        size="sm"
      >
        <svg
          className="h-6 w-6 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </Button>
    </div>
  );
}
