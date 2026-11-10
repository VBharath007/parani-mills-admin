const BASE_HOST = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || 'http://localhost:5001';
const API_BASE_URL = BASE_HOST.endsWith('/api') ? BASE_HOST : `${BASE_HOST}/api`;

/**
 * Retrieves the stored JWT authentication token from localStorage.
 */
const getAuthToken = () => {
  return localStorage.getItem('token');
};

/**
 * Generic API request helper with automatic Authorization header and 401 token refresh retry
 */
const request = async (endpoint, options = {}, isRetry = false) => {
  const token = await getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // If token is invalid or expired (401), clear authentication and redirect to login
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('admin');
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = data.message || `Request failed with status ${response.status}`;
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

// Authentication API
export const authAPI = {
  login: async (credentials) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || 'Login failed');
    }
    return data;
  },
};

// Products API (CRUD)
export const productsAPI = {
  getAll: (params = '') => request(`/products${params ? `?${params}` : ''}`),
  getById: (id) => request(`/products/${id}`),
  create: (productData) =>
    request('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    }),
  update: (id, updateData) =>
    request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    }),
  delete: (id) =>
    request(`/products/${id}`, {
      method: 'DELETE',
    }),
};

// Blogs API (CRUD)
export const blogsAPI = {
  getAll: (params = '') => request(`/blogs${params ? `?${params}` : ''}`),
  getById: (id) => request(`/blogs/${id}`),
  create: (blogData) =>
    request('/blogs', {
      method: 'POST',
      body: JSON.stringify(blogData),
    }),
  update: (id, updateData) =>
    request(`/blogs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    }),
  delete: (id) =>
    request(`/blogs/${id}`, {
      method: 'DELETE',
    }),
};

// Cloudinary Media Upload API
export const uploadAPI = {
  uploadFile: async (file, folder = 'parani_mill_stores', isRetry = false) => {
    const token = await getAuthToken();
    const formData = new FormData();
    formData.append('image', file);
    formData.append('folder', folder);

    const res = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (res.status === 401 && !isRetry) {
      localStorage.removeItem('token');
      await getAuthToken(true);
      return uploadAPI.uploadFile(file, folder, true);
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || 'Image upload failed');
    }
    return data;
  },

  uploadMultipleFiles: async (files, folder = 'parani_mill_stores') => {
    const token = await getAuthToken();
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('images', file));
      formData.append('folder', folder);

      const res = await fetch(`${API_BASE_URL}/upload/multiple`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          return data;
        }
      }
    } catch (e) {
      console.warn('Batch upload failed, falling back to parallel single upload:', e.message);
    }

    // Fallback: parallel single uploads
    const results = await Promise.all(
      files.map((file) => uploadAPI.uploadFile(file, folder))
    );
    return {
      success: true,
      data: results.map((r) => r.data),
    };
  },

  deleteImage: async (publicId) => {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE_URL}/upload/${encodeURIComponent(publicId)}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || 'Image deletion failed');
    }
    return data;
  },
};

// Categories API
export const categoriesAPI = {
  getAll: () => request('/categories'),
  create: (categoryData) =>
    request('/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    }),
  update: (id, categoryData) =>
    request(`/categories/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    }),
  delete: (id) =>
    request(`/categories/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
};

// Blog Topics API (Completely separate from Store Product Categories!)
export const blogTopicsAPI = {
  getAll: () => request('/blogs/topics'),
  create: (topicData) =>
    request('/blogs/topics', {
      method: 'POST',
      body: JSON.stringify(topicData),
    }),
  update: (id, topicData) =>
    request(`/blogs/topics/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(topicData),
    }),
  delete: (id) =>
    request(`/blogs/topics/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
};

export default {
  authAPI,
  productsAPI,
  categoriesAPI,
  blogsAPI,
  blogTopicsAPI,
  uploadAPI,
};


