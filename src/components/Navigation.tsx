import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Barcode, LayoutDashboard, Settings, Users, UserCog, LogOut, Menu, X } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useState } from 'react';

export default function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const links = [
    { to: '/', label: 'Register', icon: Barcode },
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/attendees', label: 'Attendees', icon: Users },
    { to: '/config', label: 'Settings', icon: Settings },
    { to: '/users', label: 'Users', icon: UserCog },
  ];

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="RAISA Logo" 
                className="h-10 w-auto object-contain"
                style={{ 
                  imageRendering: 'crisp-edges',
                  filter: 'contrast(1.1) saturate(1.1)'
                }}
                onError={(e) => {
                  // Fallback if logo.png is not found
                  e.currentTarget.style.display = 'none';
                }}
              />
              <span className="text-xl font-bold text-indigo-600 hidden sm:block">RAISA</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {links.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive
                        ? 'border-indigo-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="hidden sm:flex items-center">
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu, show/hide based on menu state. */}
      {isMobileMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                    isActive
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                      : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center">
                    <Icon className="w-5 h-5 mr-3" />
                    {link.label}
                  </div>
                </Link>
              );
            })}
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                handleLogout();
              }}
              className="w-full text-left block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
            >
              <div className="flex items-center">
                <LogOut className="w-5 h-5 mr-3" />
                Logout
              </div>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
