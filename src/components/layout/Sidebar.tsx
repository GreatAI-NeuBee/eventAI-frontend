import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Plus, User, X } from 'lucide-react';
import Logo from '../common/Logo';

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, setOpen }) => {
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
    { name: 'New Event', href: '/new-event', icon: Plus },
    { name: 'Profile', href: '/user', icon: User },
  ];

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <Link to="/">
              <Logo size="md" />
            </Link>
            <button
              className="p-1 rounded-md hover:bg-gray-100"
              onClick={() => setOpen(false)}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => {
                    // Close sidebar on mobile when clicking nav links
                    if (window.innerWidth < 768) {
                      setOpen(false);
                    }
                  }}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              AI-powered crowd simulation for better event planning
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
