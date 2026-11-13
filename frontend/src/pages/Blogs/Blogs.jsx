import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Calendar, 
  User, 
  Eye, 
  BookOpen,
  X,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Star,
  ChevronRight,
  Tag,
} from 'lucide-react';
import { blogsAPI, uploadAPI, blogTopicsAPI } from '../../services/api';
import AlertToast from '../../components/AlertToast';
import fallbackImage from '../../assets/products/weeders/power-weeder-700g.png';
import { logActivity } from '../../utils/logger';
import aiVoice from '../../utils/voiceAssistant';

const Blogs = () => {
  const [blogs, setBlogs] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [alert, setAlert] = useState(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create', 'edit', 'view'
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, blog: null, step: 1 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Topic / Category Manager States
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryNameInput, setEditCategoryNameInput] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [deletingCategoryName, setDeletingCategoryName] = useState(null);
  const [categoryDeleteDialog, setCategoryDeleteDialog] = useState({ open: false, category: null });

  // Form Fields
  const [formData, setFormData] = useState({
    title: '',
    category: 'Agriculture',
    excerpt: '',
    content: '',
    author: 'Admin',
    isPublished: true,
    isFeatured: false,
    coverImage: '',
  });

  const [uploadingImage, setUploadingImage] = useState(false);

  // Cloudinary image upload handler for blog cover
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAlert({
        type: 'error',
        message: 'Please choose a valid image file (JPG, PNG, WEBP).',
      });
      return;
    }

    setUploadingImage(true);
    try {
      const res = await uploadAPI.uploadFile(file, 'parani_mill_stores/blogs');
      if (res.success && res.data?.url) {
        setFormData((prev) => ({
          ...prev,
          coverImage: res.data.url,
        }));
        setAlert({
          type: 'success',
          message: 'Cover image uploaded successfully!',
        });
      }
    } catch (err) {
      console.error('Blog cover upload failed:', err);
      setAlert({
        type: 'error',
        message: err.message || 'Image upload failed. Check connection.',
      });
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  // Remove cover image
  const handleRemoveImage = () => {
    setFormData((prev) => ({
      ...prev,
      coverImage: '',
    }));
    setAlert({
      type: 'info',
      message: 'Cover image removed from article draft.',
    });
  };

  // Fetch blogs from backend
  const fetchBlogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await blogsAPI.getAll();
      if (res.success && Array.isArray(res.data)) {
        setBlogs(res.data);
      }
    } catch (err) {
      console.warn('Backend fetch blogs failed:', err.message);
      setBlogs([]);
      setAlert({
        type: 'error',
        message: 'Failed to fetch blogs from database.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await blogTopicsAPI.getAll();
      if (res.success && Array.isArray(res.data)) {
        setCategoriesList(res.data.map((c) => (typeof c === 'string' ? c : c.name || '')).filter(Boolean));
      }
    } catch (err) {
      console.warn('Failed to load blog topics:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchBlogs();
    fetchCategories();
  }, [fetchBlogs, fetchCategories]);

  // Handle creating new topic (Completely isolated from Products!)
  const handleCreateCategory = async (name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      setAlert({ type: 'error', message: 'Topic name cannot be empty.' });
      return;
    }
    setIsCreatingCategory(true);
    try {
      const res = await blogTopicsAPI.create({ name: trimmed });
      if (res.success) {
        setAlert({ type: 'success', message: `Blog Topic "${trimmed}" added successfully!` });
        setNewCategoryName('');
        await Promise.all([fetchCategories(), fetchBlogs()]);
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to add topic.' });
    } finally {
      setIsCreatingCategory(false);
    }
  };

  // Handle renaming existing topic (Only affects Blogs!)
  const handleUpdateCategory = async (oldName, newName) => {
    const trimmed = (newName || '').trim();
    if (!trimmed) {
      setAlert({ type: 'error', message: 'Topic name cannot be empty.' });
      return;
    }
    if (trimmed.toLowerCase() === oldName.toLowerCase()) {
      setEditingCategory(null);
      return;
    }
    setIsUpdatingCategory(true);
    try {
      const res = await blogTopicsAPI.update(oldName, { name: trimmed });
      if (res.success) {
        setAlert({ type: 'success', message: `Blog Topic renamed to "${trimmed}" successfully!` });
        setEditingCategory(null);
        await Promise.all([fetchCategories(), fetchBlogs()]);
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to update topic.' });
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  // Handle deleting topic (Only affects Blogs - NEVER touches Products!)
  const confirmDeleteCategory = async () => {
    const catName = categoryDeleteDialog.category;
    if (!catName) return;

    setDeletingCategoryName(catName);
    try {
      const res = await blogTopicsAPI.delete(catName);
      if (res.success) {
        setAlert({ type: 'success', message: `Blog Topic "${catName}" deleted! (Articles moved to General)` });
        setCategoryDeleteDialog({ open: false, category: null });
        await Promise.all([fetchCategories(), fetchBlogs()]);
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to delete topic.' });
    } finally {
      setDeletingCategoryName(null);
    }
  };

  // Compute clean blog topics list (Completely independent from product categories!)
  const availableCategories = Array.from(
    new Set([
      'General',
      'Equipment Guides',
      'Farming Tips',
      'Maintenance & Service',
      'Buying Guide',
      'Technical Reviews',
      ...categoriesList,
      ...blogs.map((b) => b.category).filter(Boolean),
    ])
  ).sort();

  // Open Create Modal
  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedBlog(null);
    setIsCustomCategory(false);
    setFormData({
      title: '',
      category: availableCategories[0] || 'General',
      excerpt: '',
      content: '',
      author: 'Admin',
      isPublished: true,
      isFeatured: false,
      coverImage: '',
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (blog) => {
    aiVoice.notifyEditStep1(blog.title);
    setModalMode('edit');
    setSelectedBlog(blog);
    setIsCustomCategory(false);
    setFormData({
      title: blog.title || '',
      category: blog.category || availableCategories[0] || 'General',
      excerpt: blog.excerpt || '',
      content: blog.content || '',
      author: blog.author || 'Admin',
      isPublished: blog.isPublished !== undefined ? blog.isPublished : true,
      isFeatured: blog.isFeatured !== undefined ? blog.isFeatured : false,
      coverImage: blog.coverImage || '',
    });
    setIsModalOpen(true);
  };

  // Open View Modal
  const handleOpenView = (blog) => {
    setModalMode('view');
    setSelectedBlog(blog);
    setIsModalOpen(true);
  };

  // Form submit
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        title: formData.title.trim(),
        category: formData.category,
        excerpt: formData.excerpt.trim(),
        content: formData.content.trim(),
        author: formData.author.trim() || 'Admin',
        isPublished: formData.isPublished,
        isFeatured: formData.isFeatured,
        coverImage: formData.coverImage || '',
      };

      if (modalMode === 'create') {
        const res = await blogsAPI.create(payload);
        if (res.success) {
          aiVoice.notifySuccess('கட்டுரை வெற்றிகரமாக வெளியிடப்பட்டது.', 'Article published successfully.');
          setAlert({
            type: 'success',
            message: `Article "${res.data.title}" published successfully!`,
          });
          logActivity('CREATE', 'Published new article', res.data.title, res.data.coverImage, res.data.category);
          setIsModalOpen(false);
          fetchBlogs();
        }
      } else if (modalMode === 'edit') {
        if (selectedBlog._id) {
          const res = await blogsAPI.update(selectedBlog._id, payload);
          if (res.success) {
            aiVoice.notifySuccess('கட்டுரை வெற்றிகரமாக மாற்றப்பட்டது.', 'Article updated successfully.');
            setAlert({
              type: 'success',
              message: `Article "${res.data.title}" updated successfully!`,
            });
            logActivity('UPDATE', 'Updated article', res.data.title, res.data.coverImage, res.data.category);
            setIsModalOpen(false);
            fetchBlogs();
          }
        } else {
          setBlogs((prev) =>
            prev.map((b) => (b.title === selectedBlog.title ? { ...b, ...payload } : b))
          );
          aiVoice.notifySuccess('கட்டுரை வெற்றிகரமாக மாற்றப்பட்டது.', 'Article updated successfully.');
          setAlert({
            type: 'success',
            message: `Article "${payload.title}" updated!`,
          });
          logActivity('UPDATE', 'Updated article', payload.title, payload.coverImage, payload.category);
          setIsModalOpen(false);
        }
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.message || 'Operation failed. Check backend connection.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete
  const handleDeleteClick = (blog) => {
    aiVoice.notifyDeleteStep1(blog.title);
    setDeleteDialog({ open: true, blog, step: 1 });
  };

  const confirmDeleteStep1 = () => {
    aiVoice.notifyDeleteStep2();
    setDeleteDialog(prev => ({ ...prev, step: 2 }));
  };

  const confirmDelete = async () => {
    const blog = deleteDialog.blog;
    if (!blog) return;

    setIsSubmitting(true);
    try {
      if (blog._id) {
        await blogsAPI.delete(blog._id);
        aiVoice.notifySuccess('கட்டுரை வெற்றிகரமாக நீக்கப்பட்டது.', 'Article deleted successfully.');
        setAlert({
          type: 'success',
          message: `Article "${blog.title}" deleted successfully!`,
        });
        logActivity('DELETE', 'Deleted article', blog.title, blog.coverImage, blog.category);
        fetchBlogs();
      } else {
        aiVoice.notifySuccess('கட்டுரை வெற்றிகரமாக நீக்கப்பட்டது.', 'Article deleted successfully.');
        setBlogs((prev) => prev.filter((b) => b.title !== blog.title));
        setAlert({
          type: 'success',
          message: `Article "${blog.title}" deleted!`,
        });
        logActivity('DELETE', 'Deleted article', blog.title, blog.coverImage, blog.category);
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.message || 'Delete operation failed.',
      });
    } finally {
      setIsSubmitting(false);
      setDeleteDialog({ open: false, blog: null, step: 1 });
    }
  };

  const filteredBlogs = blogs.filter((b) =>
    (b.title && b.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (b.category && b.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getBlogImage = (blog) => {
    let imgPath = blog?.coverImage;
    if (imgPath) {
      if (imgPath.startsWith('http') || imgPath.startsWith('data:')) return imgPath;
      const cleanPath = imgPath.startsWith('/') ? imgPath : `/${imgPath}`;
      return `https://paranimillstore.pages.dev${cleanPath}`;
    }
    return fallbackImage;
  };

  return (
    <div className="page-container">
      {/* Alert Toast Notification */}
      <AlertToast alert={alert} onClose={() => setAlert(null)} />

      {/* Page Header */}
      <div className="page-header-actions">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--green-deep)' }}>
            Equipment Guides & Blogs
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Publish guides, technical reviews, and farming tips
          </p>
        </div>

        <div className="page-actions-group">
          <button 
            className="outline-pill-btn" 
            onClick={fetchBlogs} 
            title="Refresh blogs"
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'spinning-icon' : ''} />
            <span>Refresh</span>
          </button>

          <button 
            className="outline-pill-btn" 
            onClick={() => setIsCategoryModalOpen(true)} 
            title="Manage Topics"
            style={{ background: '#f8fafc', borderColor: '#cbd5e1', color: '#1e293b' }}
          >
            <Tag size={15} color="var(--green-primary)" />
            <span>Manage Topics ({availableCategories.length})</span>
          </button>

          <button className="primary-green-btn" onClick={handleOpenCreate}>
            <Plus size={18} />
            <span>Write New Article</span>
          </button>
        </div>
      </div>

      {/* Search Filter */}
      <div className="search-box-wrap" style={{ maxWidth: '340px' }}>
        <Search size={16} className="search-box-icon" />
        <input 
          type="text" 
          placeholder="Search articles by title or tag..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-box-input"
          style={{ width: '100%' }}
        />
      </div>

      {/* Blogs Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <Loader2 size={36} className="spinning-icon" style={{ color: 'var(--green-primary)', margin: '0 auto' }} />
          <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>Loading...</p>
        </div>
      ) : (
        <div className="blogs-grid">
          {filteredBlogs.map((blog, index) => {
            const isPub = blog.isPublished !== false;
            return (
              <article key={blog._id || index} className="blog-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {blog.coverImage && (
                  <div 
                    style={{ 
                      width: 'calc(100% + 3rem)', 
                      height: '160px', 
                      overflow: 'hidden', 
                      margin: '-1.5rem -1.5rem 1rem -1.5rem',
                      cursor: 'pointer',
                      background: '#f1f5f9'
                    }}
                    onClick={() => handleOpenView(blog)}
                  >
                    <img 
                      src={getBlogImage(blog)} 
                      alt={blog.title}
                      onError={(e) => { e.target.src = fallbackImage; }} 
                      style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#ffffff' }} 
                    />
                  </div>
                )}
                <div className="blog-card-header">
                  <span className="blog-category-badge">{blog.category || 'Article'}</span>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {blog.isFeatured && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: '50px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', gap: '0.2rem', border: '1px solid #fde68a' }}>
                        <Star size={11} fill="currentColor" /> Featured
                      </span>
                    )}
                    <span className={`status-badge status-${isPub ? 'published' : 'draft'}`}>
                      {isPub ? 'Published' : 'Draft'}
                    </span>
                  </div>
                </div>

                <h3 
                  className="blog-card-title" 
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleOpenView(blog)}
                >
                  {blog.title}
                </h3>
                
                <p className="blog-card-excerpt">
                  {blog.excerpt || (blog.content ? blog.content.substring(0, 110) + '...' : '')}
                </p>

                <div className="blog-card-meta">
                  <div className="meta-item">
                    <User size={14} color="#3b82f6" />
                    <span><b>Author:</b> {blog.author || 'Admin'}</span>
                  </div>
                  <div className="meta-item">
                    <Calendar size={14} color="#f97316" />
                    <span><b>Published:</b> {new Date(blog.createdAt || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>

                <div className="blog-card-footer" style={{ justifyContent: 'space-between' }}>
                  <button 
                    className="text-action-btn read" 
                    onClick={() => handleOpenView(blog)}
                  >
                    <BookOpen size={14} />
                    <span>Read</span>
                  </button>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className="text-action-btn edit" 
                      onClick={() => handleOpenEdit(blog)}
                    >
                      <Edit2 size={14} />
                      <span>Edit</span>
                    </button>
                    <button 
                      className="text-action-btn delete" 
                      onClick={() => handleDeleteClick(blog)}
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}

          {filteredBlogs.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '5rem 2rem', background: '#fff', borderRadius: '16px', border: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                <BookOpen size={32} strokeWidth={1.5} />
              </div>
              <div>
                <h3 style={{ color: '#0f172a', fontSize: '1.2rem', marginBottom: '0.25rem' }}>No articles found</h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                  {searchTerm ? `No results match "${searchTerm}".` : 'You haven\'t published any articles yet. Click "Write New Article" to get started!'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT / VIEW BLOG MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <BookOpen size={22} color="var(--green-primary)" />
                <h3>
                  {modalMode === 'create' && 'Write New Article'}
                  {modalMode === 'edit' && 'Edit Article'}
                  {modalMode === 'view' && 'Article Preview'}
                </h3>
              </div>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {modalMode === 'view' && selectedBlog ? (
              <div className="modal-view-body">
                {selectedBlog.coverImage && (
                  <div style={{ width: '100%', height: '220px', borderRadius: '10px', overflow: 'hidden', marginBottom: '1.25rem', background: '#f1f5f9' }}>
                    <img 
                      src={getBlogImage(selectedBlog)} 
                      alt={selectedBlog.title} 
                      onError={(e) => { e.target.src = fallbackImage; }}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#ffffff' }} 
                    />
                  </div>
                )}
                <span className="blog-category-badge" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>
                  {selectedBlog.category || 'Guide'}
                </span>
                <h2 style={{ fontSize: '1.4rem', color: 'var(--green-deep)', fontWeight: 800, marginBottom: '0.5rem' }}>
                  {selectedBlog.title}
                </h2>
                <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
                  <span>By {selectedBlog.author || 'Admin'}</span>
                  <span>•</span>
                  <span>{new Date(selectedBlog.createdAt || Date.now()).toLocaleDateString('en-GB')}</span>
                </div>

                <div style={{ fontSize: '0.92rem', lineHeight: 1.7, color: 'var(--text-body)', background: '#f8faf9', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontWeight: 600, color: 'var(--green-deep)', marginBottom: '0.75rem' }}>
                    {selectedBlog.excerpt}
                  </p>
                  <p>{selectedBlog.content}</p>
                </div>

                <div className="modal-footer" style={{ marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                  <button className="outline-pill-btn" onClick={() => setIsModalOpen(false)}>
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitForm} className="modal-form">
                <div className="form-group">
                  <label>Article Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Guide to Power Tillers and Crop Sprayers"
                    className="modal-input"
                  />
                </div>

                {/* Cloudinary Cover Image Uploader */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label style={{ margin: 0, fontWeight: 600 }}>Cover Image</label>
                    {formData.coverImage && (
                      <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <CheckCircle2 size={13} /> Uploaded
                      </span>
                    )}
                  </div>

                  {formData.coverImage ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '0.75rem 1rem',
                      background: '#f8fafc',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '10px'
                    }}>
                      <div style={{ width: '80px', height: '60px', borderRadius: '6px', overflow: 'hidden', background: '#e2e8f0', flexShrink: 0 }}>
                        <img 
                          src={getBlogImage({ coverImage: formData.coverImage })} 
                          alt="Cover preview" 
                          style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#ffffff' }}
                          onError={(e) => { e.target.src = fallbackImage; }}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#1e293b', fontWeight: 700 }}>
                          Image Preview
                        </p>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.72rem', color: '#64748b', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {formData.coverImage}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                        <label 
                          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', borderRadius: '50px', cursor: 'pointer', padding: '0.35rem 0.65rem', fontSize: '0.75rem', fontWeight: 600 }}
                        >
                          <Edit2 size={13} />
                          <span>Change</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleImageUpload} 
                            style={{ display: 'none' }} 
                            disabled={uploadingImage}
                          />
                        </label>
                        <button 
                          type="button" 
                          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: '50px', padding: '0.35rem 0.65rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                          onClick={handleRemoveImage}
                          disabled={uploadingImage}
                        >
                          <Trash2 size={13} />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '1.25rem 1rem',
                      border: '2px dashed #94a3b8',
                      borderRadius: '10px',
                      cursor: uploadingImage ? 'not-allowed' : 'pointer',
                      background: '#f8fafc',
                      transition: 'all 0.2s',
                    }}>
                      {uploadingImage ? (
                        <>
                          <Loader2 size={24} className="spinning-icon" style={{ color: 'var(--green-primary)' }} />
                          <span style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                            Uploading cover image...
                          </span>
                        </>
                      ) : (
                        <>
                          <Upload size={24} style={{ color: 'var(--green-primary)', marginBottom: '0.35rem' }} />
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                            Click to Upload Cover Image
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                            Supports JPG, PNG, WEBP
                          </span>
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                        style={{ display: 'none' }} 
                        disabled={uploadingImage}
                      />
                    </label>
                  )}
                </div>

                <div className="form-row-grid">
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label style={{ margin: 0 }}>Category *</label>
                      <button
                        type="button"
                        onClick={() => setIsCustomCategory(!isCustomCategory)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--green-primary)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          padding: '0.1rem 0.35rem',
                          borderRadius: '4px',
                          textDecoration: 'underline'
                        }}
                      >
                        {isCustomCategory ? '← Choose from Categories list' : '+ Type Custom Category'}
                      </button>
                    </div>

                    {isCustomCategory ? (
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="Type new category name..."
                        className="modal-input"
                        required
                        autoFocus
                      />
                    ) : (
                      <select
                        value={formData.category}
                        onChange={(e) => {
                          if (e.target.value === '__CUSTOM__') {
                            setIsCustomCategory(true);
                          } else {
                            setFormData({ ...formData, category: e.target.value });
                          }
                        }}
                        className="modal-input"
                        required
                      >
                        <option value="" disabled>-- Select a Category --</option>
                        {formData.category && !availableCategories.includes(formData.category) && (
                          <option value={formData.category}>
                            {formData.category}
                          </option>
                        )}
                        {availableCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                        <option value="__CUSTOM__">➕ + Type Custom Category...</option>
                      </select>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Author</label>
                    <input
                      type="text"
                      value={formData.author}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      placeholder="Admin"
                      className="modal-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Short Excerpt / Summary</label>
                  <input
                    type="text"
                    value={formData.excerpt}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                    placeholder="Brief 1-2 sentence overview of the article..."
                    className="modal-input"
                  />
                </div>

                <div className="form-group">
                  <label>Full Content *</label>
                  <textarea
                    rows={5}
                    required
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Write your article content here..."
                    className="modal-input"
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1.5px solid #cbd5e1' }}>
                    <input
                      type="checkbox"
                      checked={formData.isFeatured}
                      onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                      style={{ width: '1.2rem', height: '1.2rem' }}
                    />
                    <div>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', display: 'block' }}>Set as Featured Article</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Highlight this article as the main feature on the public blog page</span>
                    </div>
                  </label>
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.isPublished}
                      onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                    />
                    <span style={{ fontSize: '0.85rem' }}>Publish Immediately (Visible to public)</span>
                  </label>
                </div>

                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="outline-pill-btn" 
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>

                  <button 
                    type="submit" 
                    className="primary-red-btn" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="spinning-icon" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>{modalMode === 'create' ? 'Publish Article' : 'Update Article'}</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL / ALERT (2-STEP WITH AI VOICE) */}
      {deleteDialog.open && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setDeleteDialog({ open: false, blog: null, step: 1 })}>
          <div className="modal-card" style={{ maxWidth: '460px', height: 'auto', padding: '2rem 1.75rem', textAlign: 'center', borderRadius: '16px', boxShadow: '0 20px 45px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
            {deleteDialog.step === 1 ? (
              <>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#fef3c7', color: '#b45309', padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.04em', marginBottom: '1.25rem', textTransform: 'uppercase' }}>
                  <span>⚠️ Step 1 of 2 : Safety Check</span>
                </div>
                
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fffbeb', border: '3px solid #fef3c7', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', boxShadow: '0 0 25px rgba(245, 158, 11, 0.25)' }}>
                  <AlertTriangle size={32} />
                </div>

                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.6rem' }}>
                  Delete Article?
                </h3>
                
                <p style={{ fontSize: '0.92rem', color: '#64748b', lineHeight: '1.5', marginBottom: '1.75rem' }}>
                  Are you sure you want to delete <strong style={{ color: '#0f172a' }}>"{deleteDialog.blog?.title}"</strong>?
                  <br />
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'block', marginTop: '0.5rem' }}>
                    Category: {deleteDialog.blog?.category || 'News'}
                  </span>
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="outline-pill-btn"
                    style={{ padding: '0.65rem 1.4rem', borderRadius: '8px', fontWeight: 600 }}
                    onClick={() => setDeleteDialog({ open: false, blog: null, step: 1 })}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="primary-green-btn"
                    style={{ background: '#f59e0b', borderColor: '#d97706', padding: '0.65rem 1.4rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    onClick={confirmDeleteStep1}
                  >
                    <span>Continue to Step 2</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#fee2e2', color: '#dc2626', padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.04em', marginBottom: '1.25rem', textTransform: 'uppercase' }}>
                  <span>🚨 Step 2 of 2 : Final Warning</span>
                </div>

                <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: '#fef2f2', border: '3px solid #fecaca', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', boxShadow: '0 0 30px rgba(220, 38, 38, 0.4)' }}>
                  <Trash2 size={34} />
                </div>

                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#991b1b', marginBottom: '0.6rem' }}>
                  Final Warning: Permanent Delete!
                </h3>

                <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: '1.5', marginBottom: '1.75rem' }}>
                  This article <strong style={{ color: '#dc2626' }}>"{deleteDialog.blog?.title}"</strong> will be permanently removed from the website!
                  <br />
                  <span style={{ fontSize: '0.82rem', color: '#ef4444', fontWeight: 600, display: 'block', marginTop: '0.4rem' }}>
                    Are you 100% sure you want to proceed?
                  </span>
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="outline-pill-btn"
                    style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', fontWeight: 600 }}
                    onClick={() => setDeleteDialog(prev => ({ ...prev, step: 1 }))}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    className="primary-green-btn"
                    style={{ background: '#dc2626', borderColor: '#b91c1c', padding: '0.65rem 1.4rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(220, 38, 38, 0.35)' }}
                    disabled={isSubmitting}
                    onClick={confirmDelete}
                  >
                    {isSubmitting ? <Loader2 size={16} className="spinner" /> : <Trash2 size={16} />}
                    <span>Yes, Permanently Delete</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* MANAGE TOPICS / CATEGORIES MODAL */}
      {isCategoryModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1050 }} onClick={() => setIsCategoryModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '650px', height: 'auto', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Tag size={22} color="var(--green-primary)" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Manage Blog Topics & Categories</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setIsCategoryModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-view-body" style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              {/* Add New Topic Input Box */}
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
                  + Add New Topic / Category
                </label>
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <input
                    type="text"
                    className="modal-input"
                    placeholder="e.g., Organic Farming, Buying Guide, Harvest Tips..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateCategory(newCategoryName);
                      }
                    }}
                    style={{ flex: 1, padding: '0.65rem 0.85rem', fontSize: '0.9rem' }}
                  />
                  <button
                    type="button"
                    className="primary-green-btn"
                    disabled={isCreatingCategory || !newCategoryName.trim()}
                    style={{ borderRadius: '8px', padding: '0.65rem 1.25rem', whiteSpace: 'nowrap' }}
                    onClick={() => handleCreateCategory(newCategoryName)}
                  >
                    {isCreatingCategory ? <Loader2 size={16} className="spinning-icon" /> : '+ Add Topic'}
                  </button>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.45rem', marginBottom: 0 }}>
                  💡 New topics will immediately appear in the article dropdown and sync with the public website!
                </p>
              </div>

              {/* Topics List */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  Available Topics ({availableCategories.length}) - Edit or Delete
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', maxHeight: '420px', overflowY: 'auto', padding: '0.6rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  {availableCategories.map((cat) => {
                    const count = blogs.filter(b => (b.category || '').toLowerCase() === cat.toLowerCase()).length;
                    const isEditing = editingCategory === cat;
                    const isDeleting = deletingCategoryName === cat;

                    if (isEditing) {
                      return (
                        <div 
                          key={cat} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem', 
                            background: '#ffffff', 
                            border: '2px solid #059669', 
                            padding: '0.45rem 0.75rem', 
                            borderRadius: '8px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                          }}
                        >
                          <input
                            type="text"
                            className="modal-input"
                            style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                            value={editCategoryNameInput}
                            onChange={(e) => setEditCategoryNameInput(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleUpdateCategory(cat, editCategoryNameInput);
                              } else if (e.key === 'Escape') {
                                setEditingCategory(null);
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="primary-green-btn"
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px' }}
                            disabled={isUpdatingCategory}
                            onClick={() => handleUpdateCategory(cat, editCategoryNameInput)}
                            title="Save changes"
                          >
                            {isUpdatingCategory ? <Loader2 size={13} className="spinning-icon" /> : 'Save'}
                          </button>
                          <button
                            type="button"
                            className="outline-pill-btn"
                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px' }}
                            onClick={() => setEditingCategory(null)}
                            title="Cancel"
                          >
                            Cancel
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={cat}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          padding: '0.55rem 0.85rem',
                          borderRadius: '8px',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
                            {cat}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: count > 0 ? '#059669' : '#64748b', background: count > 0 ? '#ecfdf5' : '#f1f5f9', padding: '0.15rem 0.5rem', borderRadius: '20px', fontWeight: 700 }}>
                            {count} {count === 1 ? 'article' : 'articles'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategory(cat);
                              setEditCategoryNameInput(cat);
                            }}
                            title={`Edit "${cat}"`}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              color: '#334155',
                              padding: '0.35rem 0.65rem',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                            }}
                          >
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setCategoryDeleteDialog({ open: true, category: cat })}
                            disabled={isDeleting}
                            title={`Delete "${cat}"`}
                            style={{
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              color: '#dc2626',
                              padding: '0.35rem 0.65rem',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                            }}
                          >
                            {isDeleting ? <Loader2 size={13} className="spinning-icon" /> : <Trash2 size={13} />}
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'flex-end', background: '#ffffff', flexShrink: 0 }}>
              <button className="primary-green-btn" style={{ borderRadius: '8px', padding: '0.6rem 1.5rem' }} onClick={() => setIsCategoryModalOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOPIC DELETE CONFIRMATION DIALOG */}
      {categoryDeleteDialog.open && (
        <div className="modal-overlay" style={{ zIndex: 1150 }} onClick={() => setCategoryDeleteDialog({ open: false, category: null })}>
          <div className="modal-card" style={{ maxWidth: '440px', height: 'auto', padding: '2rem 1.75rem', textAlign: 'center', borderRadius: '16px', boxShadow: '0 20px 45px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fee2e2', border: '2px solid #fecaca', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
              <Trash2 size={26} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>
              Delete Topic?
            </h3>
            
            <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: '1.5', marginBottom: '1.5rem' }}>
              Are you sure you want to delete <strong style={{ color: '#0f172a' }}>"{categoryDeleteDialog.category}"</strong>?
              <br />
              <span style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginTop: '0.4rem' }}>
                Any articles under this topic will be safely reassigned to 'General'.
              </span>
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                className="outline-pill-btn"
                style={{ padding: '0.6rem 1.25rem', borderRadius: '8px' }}
                onClick={() => setCategoryDeleteDialog({ open: false, category: null })}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-green-btn"
                style={{ background: '#dc2626', borderColor: '#b91c1c', padding: '0.6rem 1.25rem', borderRadius: '8px' }}
                disabled={Boolean(deletingCategoryName)}
                onClick={confirmDeleteCategory}
              >
                {deletingCategoryName ? <Loader2 size={15} className="spinning-icon" /> : <Trash2 size={15} />}
                <span>Yes, Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Blogs;
