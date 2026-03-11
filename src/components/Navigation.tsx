import { Link, useLocation, useNavigate } from 'react-router-dom';
import { QrCode, LayoutDashboard, Settings, Users, UserCog, LogOut } from 'lucide-react';

export default function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();

  const links = [
    { to: '/', label: 'Register', icon: QrCode },
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/attendees', label: 'Attendees', icon: Users },
    { to: '/config', label: 'Settings', icon: Settings },
    { to: '/users', label: 'Users', icon: UserCog },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
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
          <div className="flex items-center">
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
