import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  FileText, 
  LogOut, 
  ShieldCheck,
  ChevronRight,
  X,
  History,
  Tag
} from 'lucide-react';
import Logo from './Logo';

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Products & Equipment', path: '/admin/products', icon: Package },
    { name: 'Articles & Blogs', path: '/admin/blogs', icon: FileText },
    { name: 'Activity Logs', path: '/admin/logs', icon: History },
  ];

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    if (onClose) onClose();
    navigate('/login');
  };

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
      {/* Official Brand Logo */}
      <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1.25rem' }}>
        <div className="brand-logo-card" style={{ flex: 1 }}>
          <Logo variant="full" height={36} />
        </div>
        {onClose && (
          <button 
            className="mobile-sidebar-close-btn" 
            onClick={onClose}
            aria-label="Close Sidebar"
          >
            <X size={20} />
          </button>
        )}
      </div>



      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">MAIN NAVIGATION</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
            >
              <span className="nav-icon-wrapper">
                <Icon size={19} />
              </span>
              <span className="nav-label">{item.name}</span>
            </NavLink>
          );
        })}

        <button
          onClick={() => {
            navigate('/admin/products?action=add-category');
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('open-add-category-modal'));
            }, 50);
            if (onClose) onClose();
          }}
          className="nav-link"
          style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <span className="nav-icon-wrapper">
            <Tag size={19} />
          </span>
          <span className="nav-label">Manage Categories</span>
        </button>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
