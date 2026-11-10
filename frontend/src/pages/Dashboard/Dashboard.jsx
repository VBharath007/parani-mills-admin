import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { productsAPI, blogsAPI, categoriesAPI } from '../../services/api';
import { 
  Package, 
  FileText, 
  ArrowRight,
  Clock,
  TrendingUp,
  Star,
  Trash2,
  Layers,
  Search
} from 'lucide-react';
import { getDisplayCategory, PRODUCT_CATEGORIES } from '../Products/Products';

const Dashboard = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categorySearch, setCategorySearch] = useState('');

  useEffect(() => {
    // Fetch live products
    productsAPI.getAll()
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setProducts(data.data);
        }
      })
      .catch((err) => console.error("Failed to fetch products for dashboard:", err));

    // Fetch live blogs
    blogsAPI.getAll()
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setBlogs(data.data);
        }
      })
      .catch((err) => console.error("Failed to fetch blogs for dashboard:", err));

    // Fetch live categories from database
    categoriesAPI.getAll()
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setCategories(data.data);
        }
      })
      .catch((err) => console.error("Failed to fetch categories for dashboard:", err));
  }, []);

  const [deleteId, setDeleteId] = useState(null);

  const handleDeleteProduct = async () => {
    if (!deleteId) return;
    try {
      const data = await productsAPI.delete(deleteId);
      if (data.success) {
        setProducts(products.filter(p => (p._id || p.id) !== deleteId));
      } else {
        alert('Failed to delete product');
      }
    } catch (err) {
      alert('Error deleting product');
    }
    setDeleteId(null);
  };

  const stats = [
    { title: 'Total Equipment & Products', value: products.length || 0, icon: Package, color: '#0a5c36' },
    { title: 'Published Blog Insights', value: blogs.length || 0, icon: FileText, color: '#b91c1c' },
  ];

  // Get top 5 recent items
  const recentProducts = [...products].reverse().slice(0, 5);
  const recentBlogs = [...blogs].reverse().slice(0, 4);

  // 20 Vibrant Curated Modern Colors for Categories
  const CATEGORY_COLORS = [
    '#2563eb', // Royal Blue
    '#10b981', // Emerald Green
    '#f59e0b', // Amber Orange
    '#ef4444', // Red Rose
    '#8b5cf6', // Violet
    '#06b6d4', // Cyan
    '#ec4899', // Hot Pink
    '#14b8a6', // Teal
    '#f97316', // Orange
    '#6366f1', // Indigo
    '#84cc16', // Lime
    '#d97706', // Gold Amber
    '#0284c7', // Sky Blue
    '#a855f7', // Purple
    '#059669', // Dark Emerald
    '#e11d48', // Crimson
    '#64748b', // Slate
    '#b45309', // Warm Cinnamon
    '#4f46e5', // Deep Indigo
    '#0d9488', // Deep Teal
  ];

  // Prepare chart data & all category breakdown dynamically
  const categoryCounts = {};

  // 1. Register active database categories
  if (categories && categories.length > 0) {
    categories.forEach(c => {
      if (c.name && c.name.trim()) {
        categoryCounts[c.name.trim()] = 0;
      }
    });
  } else {
    // Fallback to standard catalog categories only if DB categories haven't loaded
    (PRODUCT_CATEGORIES || []).forEach(catName => {
      if (categoryCounts[catName] === undefined) {
        categoryCounts[catName] = 0;
      }
    });
  }

  // 2. Count products dynamically across active categories
  products.forEach(p => {
    let cat = getDisplayCategory(p);
    if (!cat) cat = 'Other';
    
    if (categoryCounts[cat] !== undefined) {
      categoryCounts[cat]++;
    }
  });

  // 4. Compute full category objects with percentages and stable colors
  const allCategoryData = Object.keys(categoryCounts)
    .map((name, idx) => {
      const count = categoryCounts[name];
      const pct = products.length > 0 ? ((count / products.length) * 100).toFixed(1) : '0';
      return {
        name,
        value: count,
        percentage: pct,
        color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
      };
    })
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));

  // 5. Chart data: only categories that have products > 0 (for clean pie rendering)
  const chartData = allCategoryData.filter(d => d.value > 0);

  // Top category
  const topCategory = chartData.length > 0 ? chartData[0] : null;

  // Filtered categories for the category grid search
  const filteredCategories = allCategoryData.filter(item => 
    item.name.toLowerCase().includes(categorySearch.toLowerCase().trim())
  );

  // Custom modern tooltip for Donut Chart
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          background: '#0f172a',
          color: '#ffffff',
          padding: '0.6rem 0.85rem',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.35)',
          border: '1px solid rgba(255,255,255,0.15)',
          fontSize: '0.85rem',
          minWidth: '140px',
          pointerEvents: 'none'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: data.color, flexShrink: 0 }}></span>
            <strong style={{ fontSize: '0.88rem', color: '#ffffff' }}>{data.name}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.8rem' }}>
            <span>Products:</span>
            <span style={{ color: '#ffffff', fontWeight: '800' }}>{data.value}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <>
    <div className="dashboard-container">
      {/* Stats Cards */}
      <div className="stats-grid-responsive">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="stat-card premium-stat-card">
              <div className="stat-card-content" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div className="stat-info" style={{ minWidth: 0, flex: 1 }}>
                  <span className="stat-card-title">{stat.title}</span>
                  <h3 className="stat-value" style={{ color: stat.color, margin: '0.35rem 0 0 0', fontWeight: '900', lineHeight: '1', textShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>{stat.value}</h3>
                </div>
                <div className="stat-icon-badge" style={{ backgroundColor: stat.color, color: '#ffffff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${stat.color}40`, flexShrink: 0 }}>
                  <Icon size={20} strokeWidth={2.5} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modern Product Distribution Section */}
      <div className="distribution-overview-card">
        <div className="distribution-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0a5c36 0%, #16a34a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(10, 92, 54, 0.25)',
              flexShrink: 0
            }}>
              <Layers size={20} />
            </div>
            <div>
              <h3 className="distribution-title">
                Product Distribution Overview
              </h3>
              <p className="distribution-subtitle">
                Real-time inventory breakdown across all <strong>{allCategoryData.length}</strong> categories
              </p>
            </div>
          </div>

          <div className="distribution-header-badges">
            <span style={{
              background: '#ecfdf5',
              color: '#065f46',
              border: '1px solid #a7f3d0',
              padding: '0.4rem 0.85rem',
              borderRadius: '50px',
              fontSize: '0.82rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
              Live Synced
            </span>
            <span style={{
              background: '#eff6ff',
              color: '#1e40af',
              border: '1px solid #bfdbfe',
              padding: '0.4rem 0.85rem',
              borderRadius: '50px',
              fontSize: '0.82rem',
              fontWeight: '700'
            }}>
              {products.length} Total Equipment
            </span>
            <span style={{
              background: '#f8fafc',
              color: '#475569',
              border: '1px solid #e2e8f0',
              padding: '0.4rem 0.85rem',
              borderRadius: '50px',
              fontSize: '0.82rem',
              fontWeight: '700'
            }}>
              {allCategoryData.length} Categories
            </span>
          </div>
        </div>

        {/* Main Grid: Left Donut Chart + Right All Categories */}
        <div className="distribution-main-grid">
          
          {/* Left: Donut Chart Card */}
          <div className="distribution-chart-card">
            <div style={{ width: '100%', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Category Donut Breakdown
              </span>
            </div>

            {/* Chart with center hole count */}
            <div className="donut-chart-wrapper">
              {/* Center text hole */}
              <div className="donut-center-hole">
                <span className="donut-center-count">{products.length}</span>
                <span className="donut-center-label">TOTAL ITEMS</span>
              </div>

              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50} style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '100%' }}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="#ffffff"
                      strokeWidth={2}
                    >
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color} 
                          style={{ outline: 'none', filter: 'drop-shadow(0px 3px 6px rgba(0,0,0,0.1))', cursor: 'pointer' }}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 9999 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                  No product data to plot
                </div>
              )}
            </div>

            {/* Top category highlight banner */}
            {topCategory && (
              <div className="distribution-top-cat-banner">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                  <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>🏆</span>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>Top Category</span>
                    <strong style={{ fontSize: '0.92rem', color: '#14532d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{topCategory.name}</strong>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#15803d' }}>{topCategory.value}</span>
                  <span style={{ fontSize: '0.75rem', color: '#166534', display: 'block', fontWeight: '700' }}>Products</span>
                </div>
              </div>
            )}
          </div>

          {/* Right: All Categories Grid */}
          <div className="distribution-categories-container">
            <div className="distribution-categories-header">
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  All Catalog Categories ({allCategoryData.length})
                </h4>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
                  Click any category to view and filter equipment
                </p>
              </div>

              {/* Quick Search */}
              <div className="distribution-search-input">
                <Search size={15} color="#94a3b8" />
                <input 
                  type="text"
                  placeholder="Search category..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                />
                {categorySearch && (
                  <button 
                    onClick={() => setCategorySearch('')}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', fontSize: '0.85rem', padding: 0 }}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Category Grid */}
            <div className="distribution-cats-scroll">
              {filteredCategories.length > 0 ? (
                filteredCategories.map((item, index) => {
                  return (
                    <div 
                      key={index} 
                      className="category-stat-pill-card"
                      onClick={() => navigate('/admin/products')}
                      title={`View ${item.name} products in catalog`}
                      style={{ minHeight: '56px', flexShrink: 0, boxSizing: 'border-box' }}
                    >
                      {/* Top row: Color dot + name + count */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                          <span style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: item.color,
                            flexShrink: 0,
                            boxShadow: `0 0 8px ${item.color}80`
                          }}></span>
                          <span style={{
                            fontSize: '0.9rem',
                            fontWeight: '700',
                            color: '#0f172a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {item.name}
                          </span>
                        </div>
                        <span style={{
                          fontSize: '0.78rem',
                          fontWeight: '800',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '50px',
                          backgroundColor: `${item.color}15`,
                          color: item.color,
                          flexShrink: 0
                        }}>
                          {item.value} {item.value === 1 ? 'Product' : 'Products'}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ gridColumn: '1 / -1', padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
                  No categories match "{categorySearch}"
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Real Data Tables */}
      <div className="dashboard-grid-two">
        {/* Recent Products */}
        <div className="content-card premium-card">
          <div className="content-card-header" style={{ padding: '1.5rem 1.5rem 1rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: '700', margin: 0 }}>Recently Added</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>Latest machinery in catalog</p>
            </div>
            <button className="outline-pill-btn" onClick={() => navigate('/admin/products')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem', borderRadius: '50px', border: 'none', background: '#0a5c36', color: '#ffffff', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 10px rgba(10, 92, 54, 0.2)' }}>
              <span>View All</span>
              <ArrowRight size={14} />
            </button>
          </div>
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', width: '10%' }}>S.No</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', width: '45%' }}>Product Name</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', width: '25%' }}>Category</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', width: '20%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentProducts.length > 0 ? recentProducts.map((prod, index) => (
                  <tr key={prod._id || prod.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#64748b', fontSize: '0.85rem' }}>{index + 1}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#0f172a', wordBreak: 'break-word' }}>{prod.name}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>
                      <span style={{ 
                        background: '#e0f2fe', 
                        color: '#0369a1', 
                        padding: '0.35rem 0.75rem', 
                        borderRadius: '50px', 
                        fontWeight: '700', 
                        fontSize: '0.75rem',
                        display: 'inline-block',
                        letterSpacing: '0.02em'
                      }}>
                        {getDisplayCategory(prod)}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <button 
                        onClick={() => setDeleteId(prod._id || prod.id)}
                        style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#ef4444', padding: '0.4rem 0.6rem', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = 'white'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; }}
                        title="Delete Product"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                          <Package size={32} strokeWidth={1.5} />
                        </div>
                        <span style={{ color: '#64748b', fontWeight: '500' }}>No products found. Start adding some!</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Blogs */}
        <div className="content-card premium-card">
          <div className="content-card-header" style={{ padding: '1.5rem 1.5rem 1rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: '700', margin: 0 }}>Latest Blogs</h3>
            </div>
            <button className="outline-pill-btn" onClick={() => navigate('/admin/blogs')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem', borderRadius: '50px', border: 'none', background: '#0a5c36', color: '#ffffff', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 10px rgba(10, 92, 54, 0.2)' }}>
              <span>Manage</span>
              <ArrowRight size={14} />
            </button>
          </div>
          <div className="recent-list" style={{ padding: '1rem 1.5rem' }}>
            {recentBlogs.length > 0 ? recentBlogs.map((blog, index) => (
              <div key={blog._id || index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: index !== recentBlogs.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: '#0f172a', margin: 0 }}>{blog.title}</h4>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={12} /> {new Date(blog.createdAt || Date.now()).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                    <FileText size={28} strokeWidth={1.5} />
                  </div>
                  <span style={{ color: '#64748b', fontWeight: '500', fontSize: '0.9rem' }}>No blogs written yet.</span>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      {/* Neon Glow Delete Modal */}
      {deleteId && (
        <div className="neon-glow-overlay">
          <div className="neon-blue-glow-flow">
            <h3 style={{ fontSize: '1.4rem', color: '#0f172a', fontWeight: '800', marginBottom: '0.5rem' }}>Confirm Delete</h3>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.95rem' }}>Are you sure you want to delete this product from the catalog? This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                onClick={() => setDeleteId(null)}
                style={{ padding: '0.6rem 1.25rem', borderRadius: '50px', background: '#f1f5f9', color: '#64748b', fontWeight: '600', border: 'none', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteProduct}
                style={{ padding: '0.6rem 1.25rem', borderRadius: '50px', background: '#ef4444', color: 'white', fontWeight: '600', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}
              >
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Dashboard;

