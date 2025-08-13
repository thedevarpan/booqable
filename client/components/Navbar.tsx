import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShoppingCart, User, ChevronDown, Menu, X, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { AuthModal } from './AuthModal';
import { NotificationMenu } from './NotificationMenu';
import { booqableAPI, type ProductGroup } from '../lib/booqable';
import { toast } from 'sonner';

interface NavbarProps {}

export function Navbar({}: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

  const { currentUser, logout } = useAuth();
  const { itemCount } = useCart();

  const [collections, setCollections] = useState<ProductGroup[]>([]);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      const productGroups = await booqableAPI.getProductGroups();
      setCollections(productGroups);
    } catch (error) {
      console.error('Error loading collections for navbar:', error);
      // Keep empty array on error
      setCollections([]);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to search results page with query parameter
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  const handleLogin = () => {
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
  };

  const handleSignup = () => {
    setAuthModalMode('signup');
    setIsAuthModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Successfully logged out!');
    } catch (error) {
      toast.error('Failed to logout. Please try again.');
    }
  };

  return (
    <>
      <header className="bg-white shadow-md border-b border-border">
      {/* Top bar with promotional text */}
      <div className="bg-brand-purple text-white text-center py-2 text-sm">
        🎭 Free delivery on orders above £999 | 🎪 Book your perfect costume today!
      </div>
      
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-brand-purple to-brand-emerald rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">C</span>
              </div>
              <span className="text-xl font-bold text-brand-purple">CostumeRent</span>
            </Link>
          </div>

          {/* Collections Dropdown - Desktop */}
          <div className="hidden lg:flex items-center space-x-6">
            <Link
              to="/products"
              className="text-foreground hover:text-brand-purple font-medium transition-colors"
            >
              Products
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-1 text-foreground hover:text-brand-purple">
                  <span>Collections</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                {collections.length > 0 ? (
                  collections.map((collection) => (
                    <DropdownMenuItem key={collection.id} asChild>
                      <Link to={`/products?collection=${collection.slug}`}>
                        {collection.name}
                      </Link>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>
                    Loading collections...
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-xl mx-8">
            <form onSubmit={handleSearch} className="w-full relative">
              <Input
                type="text"
                placeholder="Search for costumes, themes, occasions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-12 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-brand-purple focus:border-transparent"
              />
              <Button
                type="submit"
                size="sm"
                className="absolute right-1 top-1 bottom-1 px-4 bg-brand-purple hover:bg-brand-purple-dark rounded-full"
              >
                <Search className="h-4 w-4" />
              </Button>
            </form>
          </div>

          {/* Right side - Notifications, Cart and Auth */}
          <div className="flex items-center space-x-2">
            {/* Notifications - only show when logged in */}
            {currentUser && (
              <NotificationMenu className="hidden sm:block" />
            )}

            {/* Cart Icon */}
            <Link to="/cart" className="relative p-2 text-foreground hover:text-brand-purple transition-colors">
              <ShoppingCart className="h-6 w-6" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-brand-gold text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Link>

            {/* Auth Area */}
            {currentUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 p-2">
                    <div className="w-8 h-8 bg-brand-purple rounded-full flex items-center justify-center">
                      {currentUser.photoURL ? (
                        <img
                          src={currentUser.photoURL}
                          alt={currentUser.displayName || 'User'}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-white text-sm font-semibold">
                          {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="hidden sm:block text-sm font-medium max-w-32 truncate">
                      {currentUser.displayName || currentUser.email?.split('@')[0]}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{currentUser.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{currentUser.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/orders" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      My Orders
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  onClick={handleLogin}
                  className="text-brand-purple hover:text-brand-purple-dark hover:bg-brand-purple/10"
                >
                  Login
                </Button>
                <Button
                  onClick={handleSignup}
                  className="bg-brand-purple hover:bg-brand-purple-dark"
                >
                  <User className="h-4 w-4 mr-2" />
                  Sign Up
                </Button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 py-4">
            {/* Mobile Search */}
            <div className="mb-4">
              <form onSubmit={handleSearch} className="relative">
                <Input
                  type="text"
                  placeholder="Search costumes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-12 py-2"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="absolute right-1 top-1 bottom-1 px-4 bg-brand-purple hover:bg-brand-purple-dark"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </form>
            </div>

            {/* Mobile Notifications - show when logged in */}
            {currentUser && (
              <div className="mb-4 sm:hidden">
                <div className="font-semibold text-foreground mb-2">Notifications</div>
                <NotificationMenu className="w-full justify-start" />
              </div>
            )}

            {/* Mobile Collections */}
            <div className="space-y-2">
              <div className="font-semibold text-foreground mb-2">Collections</div>
              {collections.length > 0 ? (
                collections.map((collection) => (
                  <Link
                    key={collection.id}
                    to={`/products?collection=${collection.slug}`}
                    className="block py-2 text-sm text-muted-foreground hover:text-brand-purple"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {collection.name}
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-2">Loading collections...</p>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>

    {/* Auth Modal */}
    <AuthModal
      isOpen={isAuthModalOpen}
      onClose={() => setIsAuthModalOpen(false)}
      defaultMode={authModalMode}
    />
    </>
  );
}
