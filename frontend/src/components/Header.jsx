import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ArrowLeft } from 'lucide-react';

const Header = ({ onToggleSidebar, isSidebarOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const getPageInfo = () => {
    switch (location.pathname) {
      case '/admin/dashboard':
        return { title: 'Dashboard Overview', subtitle: 'Parani Mill Stores operations & performance' };
      case '/admin/products':
        return { title: 'Products & Equipment Catalog', subtitle: 'Manage Agricultural Machinery, Power Generators, Construction Equipment' };
      case '/admin/blogs':
        return { title: 'Blog Articles & News', subtitle: 'Publish equipment guides and company updates' };
      default:
        return { title: 'Parani Mill Stores Admin', subtitle: 'Quality Products | Trusted Service | Since 1960' };
    }
  };

  const { title, subtitle } = getPageInfo();

  return (
    <header className="admin-header">
      <div className="header-left">
        <button 
          className="mobile-menu-btn" 
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
        >
          {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {location.pathname !== '/admin/dashboard' && (
          <button 
            className="back-nav-btn" 
            onClick={() => navigate(-1)}
            title="Go Back"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '50px', width: '38px', height: '38px', marginRight: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
          >
            <ArrowLeft size={18} color="#0f172a" />
          </button>
        )}

        <div className="header-title-wrap">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
    </header>
  );
};

export default Header;
