import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Eye, 
  Edit2, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  X,
  AlertTriangle,
  HelpCircle,
  Loader2,
  RefreshCw,
  Package,
  CheckCircle2,
  Upload,
  Image as ImageIcon,
  Star,
  Images,
  PlusCircle,
  Download,
  Tag,
  ExternalLink
} from 'lucide-react';
import { productsAPI, uploadAPI, categoriesAPI } from '../../services/api';
import AlertToast from '../../components/AlertToast';
import { logActivity } from '../../utils/logger';
import aiVoice from '../../utils/voiceAssistant';

// Import Categorized Product Images
import knapsackSprayer from '../../assets/products/sprayers/knapsack-sprayer.png';
import portableBatterySprayer from '../../assets/products/sprayers/portable-battery-sprayer.png';
import powerWeeder700g from '../../assets/products/weeders/power-weeder-700g.png';
import miniTiller3800g from '../../assets/products/weeders/mini-tiller-3800g.png';
import brushCutter4s from '../../assets/products/brush-cutters/brush-cutter-4s.png';
import trolleyBrushCutter from '../../assets/products/brush-cutters/trolley-brush-cutter.png';
import petrolWaterPump from '../../assets/products/pumps/petrol-water-pump-wa30.png';
import waterPump30r from '../../assets/products/pumps/water-pump-30r.png';
import dieselGenerator from '../../assets/products/machinery/diesel-generator.jpg';
import woodChipper from '../../assets/products/machinery/wood-chipper-192g.png';
import earthAuger from '../../assets/products/machinery/earth-auger-6310.png';
import chaffCutter from '../../assets/products/machinery/chaff-cutter-9zp.png';

// Fallback images map for default catalog items
const defaultImagesMap = {
  'Diesel Generator 10 KVA': dieselGenerator,
  'Centrifugal Water Pump WA30': petrolWaterPump,
  'High-Performance Crop Sprayer': knapsackSprayer,
  'Heavy Duty Brush Cutter': brushCutter4s,
  'Industrial Earth Auger 63CC': earthAuger,
  'High Discharge Water Pump 30R': waterPump30r,
  'Power Weeder & Tiller Machine': powerWeeder700g,
  'Portable Battery Sprayer': portableBatterySprayer,
  'Heavy Wood Chipper Machine': woodChipper,
  'Commercial Chaff Cutter Machine': chaffCutter,
};

// The 8 Main Catalog Categories in sync with customer store UI (Paranimill)
export const PRODUCT_CATEGORIES = [
  'Brush Cutter',
  'Chaff Cutter & Wood Chipper',
  'Earth Augur',
  'Engines',
  'Honda Products',
  'Sprayer',
  'Water Pump',
  'Weeder',
];

export const getDisplayCategory = (product) => {
  if (!product) return 'Other';
  const rawCat = (product.category || '').trim();

  if (rawCat) {
    const matched = PRODUCT_CATEGORIES.find(c => c.toLowerCase() === rawCat.toLowerCase());
    if (matched) return matched;
    if (rawCat.toLowerCase() !== 'all') return rawCat;
  }

  const name = (product.name || '').toUpperCase();
  const folder = (product.folder || '').toUpperCase();

  if (name.includes('HONDA') || folder.includes('HONDA')) return 'Honda Products';
  if (name.includes('BRUSH CUTTER') || folder.includes('BRUSH CUTTER')) return 'Brush Cutter';
  if (name.includes('CHAFF') || name.includes('CHIPPER') || folder.includes('CHAFF') || folder.includes('CHIPPER')) return 'Chaff Cutter & Wood Chipper';
  if (name.includes('AUGER') || name.includes('AUGUR') || folder.includes('AUGER') || folder.includes('AUGUR')) return 'Earth Augur';
  if (folder.includes('WEEDER') || name.includes('WEEDER') || name.includes('TILLER')) return 'Weeder';
  if (folder.includes('SPRAYER') || name.includes('SPRAYER') || name.includes('HTP')) return 'Sprayer';
  if (folder.includes('WATER PUMP') || name.includes('WATER PUMP') || (name.includes('PUMP') && !name.includes('HTP'))) return 'Water Pump';
  if (folder.includes('ENGINE') || name.includes('ENGINE')) return 'Engines';

  return rawCat || 'Other';
};

// Web Audio + AI Voice Assistant helper
const playSoundEffect = (type, phrase) => {
  aiVoice.notify(type, phrase);
};

const Products = () => {
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [categoriesList, setCategoriesList] = useState(PRODUCT_CATEGORIES);
  const [rawCategories, setRawCategories] = useState([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryNameInput, setEditCategoryNameInput] = useState('');
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [deletingCategoryName, setDeletingCategoryName] = useState(null);
  const [categoryDeleteDialog, setCategoryDeleteDialog] = useState({ open: false, category: null, step: 1 });
  const [categoryEditDialog, setCategoryEditDialog] = useState({ open: false, oldName: null, newName: null, step: 1 });
  const [showInlineNewCategory, setShowInlineNewCategory] = useState(false);
  const [inlineCategoryInput, setInlineCategoryInput] = useState('');

  // Alert Toast State
  const [alert, setAlert] = useState(null);

  // Modal States (Add / Edit / View)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create', 'edit', 'view'
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [viewActiveImage, setViewActiveImage] = useState('');

  // Confirmation Popups: Edit & Delete
  const [editConfirmDialog, setEditConfirmDialog] = useState({ open: false, product: null });
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState({ open: false, product: null, step: 1 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    category: 'Brush Cutter',
    price: '',
    stock: '',
    description: '',
    isActive: true,
    thumbnail: '',
    images: [],
  });

  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  // Single Thumbnail Upload handler
  const handleThumbnailUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAlert({
        type: 'error',
        message: 'Please choose a valid image file (JPG, PNG, WEBP).',
      });
      return;
    }

    setUploadingThumbnail(true);
    try {
      const res = await uploadAPI.uploadFile(file, 'parani_mill_stores/thumbnails');
      if (res.success && res.data?.url) {
        setFormData((prev) => ({
          ...prev,
          thumbnail: res.data.url,
        }));
        setAlert({
          type: 'success',
          message: 'Product thumbnail uploaded successfully!',
        });
      }
    } catch (err) {
      console.error('Thumbnail upload failed:', err);
      setAlert({
        type: 'error',
        message: err.message || 'Thumbnail upload failed. Check connection.',
      });
    } finally {
      setUploadingThumbnail(false);
      e.target.value = '';
    }
  };

  const handleRemoveThumbnail = () => {
    setFormData((prev) => ({
      ...prev,
      thumbnail: '',
    }));
    setAlert({
      type: 'info',
      message: 'Product thumbnail removed.',
    });
  };

  // Multiple Gallery Images Upload handler
  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const validFiles = files.filter((f) => f.type.startsWith('image/'));
    if (!validFiles.length) {
      setAlert({
        type: 'error',
        message: 'Please choose valid image files (JPG, PNG, WEBP).',
      });
      return;
    }

    setUploadingGallery(true);
    try {
      const res = await uploadAPI.uploadMultipleFiles(validFiles, 'parani_mill_stores/products');
      if (res.success && Array.isArray(res.data)) {
        const uploadedUrls = res.data.map((item) => item.url).filter(Boolean);
        setFormData((prev) => {
          const currentImages = prev.images || [];
          const combined = [...currentImages];
          uploadedUrls.forEach((url) => {
            if (!combined.includes(url)) combined.push(url);
          });
          return {
            ...prev,
            images: combined,
            // If user hasn't set a thumbnail yet, use the first image as thumbnail
            thumbnail: prev.thumbnail || combined[0] || '',
          };
        });
        setAlert({
          type: 'success',
          message: `${uploadedUrls.length} image(s) added to gallery!`,
        });
      }
    } catch (err) {
      console.error('Gallery images upload failed:', err);
      setAlert({
        type: 'error',
        message: err.message || 'Gallery upload failed. Check connection.',
      });
    } finally {
      setUploadingGallery(false);
      e.target.value = '';
    }
  };

  // Remove single image from gallery
  const handleRemoveGalleryImage = (indexToRemove) => {
    setFormData((prev) => {
      const targetUrl = prev.images?.[indexToRemove];
      const filtered = (prev.images || []).filter((_, idx) => idx !== indexToRemove);
      let updatedThumbnail = prev.thumbnail;
      if (prev.thumbnail === targetUrl) {
        updatedThumbnail = filtered[0] || '';
      }
      return {
        ...prev,
        images: filtered,
        thumbnail: updatedThumbnail,
      };
    });
    setAlert({
      type: 'info',
      message: 'Gallery image removed.',
    });
  };

  // Set any gallery image as the primary thumbnail
  const handleSetAsThumbnail = (imageUrl) => {
    setFormData((prev) => ({
      ...prev,
      thumbnail: imageUrl,
    }));
    setAlert({
      type: 'success',
      message: 'Selected image set as primary thumbnail!',
    });
  };

  // Fetch Products from Backend
  const fetchProducts = useCallback(async (showSuccessAlert = false) => {
    setLoading(true);
    try {
      const res = await productsAPI.getAll();
      if (res.success && Array.isArray(res.data)) {
        setProducts(res.data);
        if (showSuccessAlert) {
          setAlert({
            type: 'success',
            message: `Refreshed successfully! Loaded ${res.data.length} products.`,
          });
        }
      }
    } catch (err) {
      console.warn('Backend fetch failed:', err.message);
      setAlert({
        type: 'error',
        message: `Failed to load products: ${err.message}`,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch dynamic categories
  const fetchCategories = useCallback(async () => {
    try {
      const res = await categoriesAPI.getAll();
      if (res.success && Array.isArray(res.data)) {
        setRawCategories(res.data);
        const filtered = res.data
          .map((c) => c.name)
          .filter((name) => name && !['Power Generators', 'Agricultural Machinery', 'Construction Equipment', 'Maintenance & Service'].includes(name));
        setCategoriesList(filtered.length > 0 ? filtered : PRODUCT_CATEGORIES);
      }
    } catch (err) {
      console.warn('Could not load categories:', err.message);
    }
  }, []);

  // Create new category handler
  const handleCreateCategory = async (nameToCreate) => {
    const trimmed = (nameToCreate || '').trim();
    if (!trimmed) {
      setAlert({ type: 'error', message: 'Please enter a category name.' });
      return null;
    }

    setIsCreatingCategory(true);
    try {
      const res = await categoriesAPI.create({ name: trimmed });
      if (res.success) {
        setAlert({ type: 'success', message: `Category "${trimmed}" created successfully!` });
        setNewCategoryName('');
        await fetchCategories();
        setFormData(prev => ({ ...prev, category: trimmed }));
        return trimmed;
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to create category.' });
    } finally {
      setIsCreatingCategory(false);
    }
    return null;
  };

  // Prompt update category with Step 1 Review & Sound
  const promptUpdateCategory = (oldName, newName) => {
    const trimmed = (newName || '').trim();
    if (!trimmed) {
      setAlert({ type: 'error', message: 'Category name cannot be empty.' });
      return;
    }
    if (trimmed.toLowerCase() === oldName.toLowerCase()) {
      setEditingCategory(null);
      return;
    }
    aiVoice.notifyEditStep1(`category "${oldName}"`);
    setCategoryEditDialog({ open: true, oldName, newName: trimmed, step: 1 });
  };

  // Confirm update category handler (Executes API after Step 2)
  const confirmUpdateCategory = async () => {
    const { oldName, newName } = categoryEditDialog;
    if (!oldName || !newName) return;

    setIsUpdatingCategory(true);
    try {
      const raw = rawCategories.find(c => c.name.toLowerCase() === oldName.toLowerCase());
      const idToUpdate = raw?.id || oldName;

      const res = await categoriesAPI.update(idToUpdate, { name: newName });
      if (res.success) {
        aiVoice.notifySuccess('பிரிவு வெற்றிகரமாக மாற்றப்பட்டது.', 'Category updated successfully.');
        setAlert({ type: 'success', message: `Category updated to "${newName}" successfully!` });
        setEditingCategory(null);
        if (selectedCategoryFilter === oldName) {
          setSelectedCategoryFilter(newName);
        }
        setCategoryEditDialog({ open: false, oldName: null, newName: null, step: 1 });
        await Promise.all([fetchCategories(), fetchProducts()]);
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to update category.' });
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  // Confirm delete category handler (Executes API after Step 2)
  const confirmDeleteCategory = async () => {
    const catName = categoryDeleteDialog.category;
    if (!catName) return;

    setDeletingCategoryName(catName);
    try {
      const raw = rawCategories.find(c => c.name.toLowerCase() === catName.toLowerCase());
      const idToDelete = raw?.id || catName;

      const res = await categoriesAPI.delete(idToDelete);
      if (res.success) {
        aiVoice.notifySuccess('பிரிவு வெற்றிகரமாக நீக்கப்பட்டது.', 'Category deleted successfully.');
        setAlert({ type: 'success', message: `Category "${catName}" deleted successfully!` });
        if (selectedCategoryFilter === catName) {
          setSelectedCategoryFilter('All');
        }
        setCategoryDeleteDialog({ open: false, category: null, step: 1 });
        await Promise.all([fetchCategories(), fetchProducts()]);
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to delete category.' });
    } finally {
      setDeletingCategoryName(null);
    }
  };

  // Prompt delete category with Step 1 Warning & Sound
  const handleDeleteCategory = (catName) => {
    aiVoice.notifyDeleteStep1(`category "${catName}"`);
    setCategoryDeleteDialog({ open: true, category: catName, step: 1 });
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  // Listen to both navigation URL action and window custom event
  useEffect(() => {
    const handleOpenCatModal = () => {
      setIsCategoryModalOpen(true);
    };

    window.addEventListener('open-add-category-modal', handleOpenCatModal);

    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'add-category') {
      setIsCategoryModalOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    return () => {
      window.removeEventListener('open-add-category-modal', handleOpenCatModal);
    };
  }, [location.search]);

  // Prevent mouse wheel scrolling from accidentally changing number input values
  useEffect(() => {
    const preventNumberScroll = () => {
      if (document.activeElement && document.activeElement.type === 'number') {
        document.activeElement.blur();
      }
    };
    window.addEventListener('wheel', preventNumberScroll, { passive: true });
    return () => window.removeEventListener('wheel', preventNumberScroll);
  }, []);

  // Increase / Decrease Stepper handlers for Price and Stock
  const handlePriceStep = (delta) => {
    setFormData((prev) => {
      const current = Number(prev.price) || 0;
      return {
        ...prev,
        price: Math.max(0, current + delta),
      };
    });
  };

  const handleStockStep = (delta) => {
    setFormData((prev) => {
      const current = Number(prev.stock) || 0;
      return {
        ...prev,
        stock: Math.max(0, current + delta),
      };
    });
  };

  // 1. ADD PRODUCT FLOW
  const handleOpenCreate = () => {
    fetchCategories();
    setModalMode('create');
    setSelectedProduct(null);
    setViewActiveImage('');
    setFormData({
      name: '',
      category: 'Brush Cutter',
      price: '',
      stock: '15',
      description: '',
      isActive: true,
      isProductOfTheMonth: false,
      thumbnail: '',
      images: [],
      specs: [],
    });
    setIsModalOpen(true);
  };

  // 2. EDIT PRODUCT FLOW (Step 1: Click -> Ask Confirmation Popup & Voice)
  const handleEditClick = (product) => {
    aiVoice.notifyEditStep1(product.name);
    setEditConfirmDialog({ open: true, product });
  };

  // Step 2: Confirm Edit -> Opens Edit Modal
  const proceedToEditModal = () => {
    aiVoice.notifyEditStep2();
    const product = editConfirmDialog.product;
    setEditConfirmDialog({ open: false, product: null });
    if (!product) return;

    const existingThumbnail = product.thumbnail || (Array.isArray(product.images) && product.images[0]) || '';
    const existingImages = Array.isArray(product.images) ? product.images : (product.images ? [product.images] : []);

    setModalMode('edit');
    setSelectedProduct(product);
    setViewActiveImage(existingThumbnail);
    setFormData({
      name: (product.name || '').toUpperCase(),
      category: product.category && PRODUCT_CATEGORIES.includes(product.category) 
        ? product.category 
        : getDisplayCategory(product),
      price: product.price !== undefined ? product.price : '',
      stock: product.stock !== undefined ? product.stock : '',
      description: product.description || '',
      isActive: product.isActive !== undefined ? product.isActive : true,
      isProductOfTheMonth: product.isProductOfTheMonth !== undefined ? product.isProductOfTheMonth : false,
      thumbnail: existingThumbnail,
      images: existingImages,
      specs: product.specs ? Object.entries(product.specs).map(([k, v]) => ({ key: String(k).toUpperCase(), value: String(v).toUpperCase() })) : [],
    });
    setIsModalOpen(true);

    setAlert({
      type: 'info',
      message: `Editing product: "${product.name}"`,
    });
  };

  const handleDeleteClick = (product) => {
    aiVoice.notifyDeleteStep1(product.name);
    setDeleteConfirmDialog({ open: true, product, step: 1 });
  };

  const confirmDeleteStep1 = () => {
    aiVoice.notifyDeleteStep2();
    setDeleteConfirmDialog(prev => ({ ...prev, step: 2 }));
  };

  // Step 2: Confirm Delete -> Executes DELETE API and shows Success Alert
  const confirmDelete = async () => {
    const product = deleteConfirmDialog.product;
    if (!product) return;

    setIsSubmitting(true);
    try {
      if (product._id) {
        await productsAPI.delete(product._id);
        logActivity('DELETE', 'Deleted product', product.name, product.thumbnail || (product.images && product.images[0]) || '', product.category);
        aiVoice.notifySuccess('தயாரிப்பு வெற்றிகரமாக நீக்கப்பட்டது.', 'Product deleted successfully.');
        setAlert({
          type: 'success',
          message: `Product "${product.name}" deleted successfully!`,
        });
        fetchProducts();
      } else {
        aiVoice.notifySuccess('தயாரிப்பு வெற்றிகரமாக நீக்கப்பட்டது.', 'Product deleted successfully.');
        setProducts((prev) => prev.filter((p) => p.name !== product.name));
        setAlert({
          type: 'success',
          message: `Product "${product.name}" deleted!`,
        });
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.message || 'Delete operation failed. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
      setDeleteConfirmDialog({ open: false, product: null, step: 1 });
    }
  };

  // Quick Remove / Unselect Product of the Month
  const handleRemoveProductOfTheMonth = async (product) => {
    if (!product) return;
    try {
      const id = product._id || product.id;
      await productsAPI.update(id, { isProductOfTheMonth: false });
      setAlert({
        type: 'success',
        message: `"${product.name}" has been removed from Product of the Month!`,
      });
      fetchProducts();
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.message || 'Failed to remove Product of the Month.',
      });
    }
  };

  // 4. VIEW PRODUCT DETAILS
  const handleOpenView = (product) => {
    setModalMode('view');
    setSelectedProduct(product);
    setViewActiveImage(getProductImage(product));
    setIsModalOpen(true);
  };

  // 5. FORM SUBMISSION (Create or Update with Live Alerts)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const chosenThumbnail = formData.thumbnail || (formData.images && formData.images[0]) || '';
      const specsObj = {};
      (formData.specs || []).forEach(spec => {
        if (spec.key && spec.key.trim()) {
          specsObj[spec.key.trim().toUpperCase()] = (spec.value || '').trim().toUpperCase();
        }
      });

      const payload = {
        name: (formData.name || '').trim().toUpperCase(),
        category: formData.category,
        price: Number(formData.price),
        stock: Number(formData.stock),
        description: formData.description.trim(),
        isActive: formData.isActive,
        isProductOfTheMonth: formData.isProductOfTheMonth,
        thumbnail: chosenThumbnail,
        images: formData.images || [],
        specs: specsObj,
      };

      if (modalMode === 'create') {
        const res = await productsAPI.create(payload);
        if (res.success) {
          logActivity('CREATE', 'Added new product', res.data.name, res.data.thumbnail || (res.data.images && res.data.images[0]) || '', res.data.category);
          aiVoice.notifySuccess('புதிய தயாரிப்பு வெற்றிகரமாக சேர்க்கப்பட்டது.', 'New product added successfully.');
          setAlert({
            type: 'success',
            message: `Product "${res.data.name}" added successfully!`,
          });
          setIsModalOpen(false);
          fetchProducts();
        }
      } else if (modalMode === 'edit') {
        if (selectedProduct._id) {
          const res = await productsAPI.update(selectedProduct._id, payload);
          if (res.success) {
            logActivity('UPDATE', 'Updated product details', res.data.name, res.data.thumbnail || (res.data.images && res.data.images[0]) || '', res.data.category);
            aiVoice.notifySuccess('தயாரிப்பு விவரங்கள் வெற்றிகரமாக மாற்றப்பட்டன.', 'Product details updated successfully.');
            setAlert({
              type: 'success',
              message: `Product "${res.data.name}" updated successfully!`,
            });
            setIsModalOpen(false);
            fetchProducts();
          }
        } else {
          setProducts((prev) =>
            prev.map((p) => (p.name === selectedProduct.name ? { ...p, ...payload } : p))
          );
          aiVoice.notifySuccess('தயாரிப்பு விவரங்கள் வெற்றிகரமாக மாற்றப்பட்டன.', 'Product details updated successfully.');
          setAlert({
            type: 'success',
            message: `Product "${payload.name}" updated successfully!`,
          });
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

  // Filter & Pagination Calculations
  const filteredProducts = products.filter((p) => {
    const q = searchTerm.toLowerCase();
    const cat = getDisplayCategory(p);
    const searchMatch = (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      cat.toLowerCase().includes(q)
    );
    
    if (selectedCategoryFilter === 'All') return searchMatch;

    return searchMatch && cat === selectedCategoryFilter;
  }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const totalPages = Math.ceil(filteredProducts.length / entriesPerPage) || 1;
  const startIndex = (currentPage - 1) * entriesPerPage;
  const displayedProducts = filteredProducts.slice(startIndex, startIndex + entriesPerPage);

  const getProductImage = (product) => {
    let imgPath = product?.thumbnail || (product?.images && product.images.length > 0 ? product.images[0] : null);
    if (imgPath) {
      if (imgPath.startsWith('http') || imgPath.startsWith('data:')) return imgPath;
      const cleanImg = imgPath.startsWith('/') ? imgPath.slice(1) : imgPath;
      if (product.folder) {
        const cleanFolder = (product.folder.startsWith('/') ? product.folder.slice(1) : product.folder).replace(/\/+/g, '/');
        return `http://localhost:5173/${cleanFolder}/${cleanImg}`;
      }
      return `http://localhost:5173/${cleanImg}`;
    }
    return defaultImagesMap[product?.name] || null;
  };

  const getStatus = (product) => {
    if (product.stock === 0 || product.isActive === false) return 'Out Of Stock';
    if (product.stock <= 10) return 'Low Stock';
    return 'In Stock';
  };

  const exportToCSV = () => {
    if (!filteredProducts || filteredProducts.length === 0) return;
    
    const headers = ['S.No', 'Product Name', 'Category', 'Price', 'Stock', 'Status'];
    
    const csvRows = filteredProducts.map((p, index) => {
      return [
        index + 1,
        `"${(p.name || '').replace(/"/g, '""')}"`,
        `"${(getDisplayCategory(p) || '').replace(/"/g, '""')}"`,
        p.price || 0,
        p.stock || 0,
        getStatus(p)
      ].join(',');
    });
    
    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `parani_products_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setAlert({ type: 'success', message: 'Products exported successfully!' });
  };

  return (
    <div className="page-container">
      {/* Alert Toast Notification (Slide-in) */}
      <AlertToast alert={alert} onClose={() => setAlert(null)} />

      {/* Page Header */}
      <div className="page-header-actions" style={{ justifyContent: 'flex-end' }}>
        <div className="page-actions-group">
          <button className="primary-green-btn" style={{ borderRadius: '50px' }} onClick={handleOpenCreate}>
            <Plus size={18} />
            <span>Add Product</span>
          </button>

          <button 
            className="outline-pill-btn" 
            onClick={() => { fetchCategories(); setIsCategoryModalOpen(true); }} 
            title="Manage, Edit & Add Categories"
          >
            <Tag size={15} />
            <span>Manage Categories</span>
          </button>

          <button 
            className="outline-pill-btn" 
            onClick={exportToCSV} 
            title="Export to CSV"
            disabled={loading || filteredProducts.length === 0}
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Category Filter Pills Header with Quick Edit/Delete */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Filter by Category
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {selectedCategoryFilter !== 'All' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                type="button"
                onClick={() => {
                  setEditingCategory(selectedCategoryFilter);
                  setEditCategoryNameInput(selectedCategoryFilter);
                  setIsCategoryModalOpen(true);
                }}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
                title={`Edit "${selectedCategoryFilter}"`}
              >
                <Edit2 size={12} />
                <span>Edit "{selectedCategoryFilter}"</span>
              </button>
              <button
                type="button"
                onClick={() => handleDeleteCategory(selectedCategoryFilter)}
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
                title={`Delete "${selectedCategoryFilter}"`}
              >
                <Trash2 size={12} />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="category-filter-pills" style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '0.4rem', scrollbarWidth: 'thin' }}>
        {['All', ...categoriesList].map(cat => {
          const count = cat === 'All' 
            ? products.length 
            : products.filter(p => getDisplayCategory(p) === cat).length;

          return (
          <button
            key={cat}
            onClick={() => { setSelectedCategoryFilter(cat); setCurrentPage(1); }}
            style={{
              padding: '0.6rem 1.2rem',
              borderRadius: '50px',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s',
              border: selectedCategoryFilter === cat ? 'none' : '1px solid #cbd5e1',
              backgroundColor: selectedCategoryFilter === cat ? '#0a5c36' : '#ffffff',
              color: selectedCategoryFilter === cat ? '#ffffff' : '#475569',
              boxShadow: selectedCategoryFilter === cat ? '0 4px 10px rgba(10, 92, 54, 0.2)' : 'none',
            }}
          >
            {cat} 
            <span style={{ 
              opacity: 0.9, 
              fontSize: '0.75rem', 
              background: selectedCategoryFilter === cat ? 'rgba(255,255,255,0.25)' : '#f1f5f9', 
              color: selectedCategoryFilter === cat ? '#ffffff' : '#64748b',
              padding: '0.15rem 0.45rem', 
              borderRadius: '50px', 
              marginLeft: '0.1rem' 
            }}>
              {count} {count === 1 ? 'product' : 'products'}
            </span>
          </button>
        )})}
      </div>

      {/* Controls Bar: Show Entries + Search */}
      <div className="table-controls-bar">
        <div className="entries-dropdown-wrap">
          <span>Show</span>
          <select 
            value={entriesPerPage} 
            onChange={(e) => {
              setEntriesPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="entries-select"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
          <span>entries</span>
        </div>

        <div className="search-box-wrap">
          <Search size={16} className="search-box-icon" />
          <input
            type="text"
            placeholder="Search by name, spec, category..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="search-box-input"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="content-card">
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>S.No</th>
                <th style={{ width: '80px' }}>Image</th>
                <th style={{ width: '100%' }}>Product Details</th>
                <th style={{ width: '220px' }}>Category</th>
                <th style={{ textAlign: 'center', width: '130px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>
                    <Loader2 size={32} className="spinning-icon" style={{ color: 'var(--green-primary)', margin: '0 auto' }} />
                    <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>Loading...</p>
                  </td>
                </tr>
              ) : (
                displayedProducts.map((p, index) => {
                  const status = getStatus(p);
                  return (
                    <tr key={p._id || p.name || index}>
                      <td className="index-cell">{startIndex + index + 1}</td>
                      
                      {/* Product Thumbnail */}
                      <td>
                        <div className="product-thumbnail-box" style={{ position: 'relative' }}>
                          {getProductImage(p) ? (
                            <img 
                              src={getProductImage(p)} 
                              alt={p.name} 
                              className="product-thumbnail-img" 
                              loading="lazy"
                            />
                          ) : (
                            <div 
                              style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#f8fafc',
                                color: '#94a3b8',
                                fontSize: '0.62rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                gap: '3px',
                                borderRadius: '8px'
                              }}
                              title="No image uploaded for this equipment"
                            >
                              <Package size={18} strokeWidth={1.5} color="#94a3b8" />
                              <span style={{ fontSize: '0.6rem', letterSpacing: '0.02em', color: '#94a3b8' }}>No Image</span>
                            </div>
                          )}
                          {p.images && p.images.length > 1 && (
                            <span 
                              className="product-photo-count-pill" 
                              title={`${p.images.length} photos available`}
                            >
                              <Images size={10} />
                              {p.images.length}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Product Details: Name */}
                      <td>
                        <div className="product-details-cell" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                          <span className="product-title">{p.name}</span>
                          {Boolean(p.isProductOfTheMonth) && (
                            <span 
                              style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '6px',
                                background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', 
                                border: '1px solid #fde68a',
                                padding: '2px 4px 2px 9px', 
                                borderRadius: '999px', 
                                boxShadow: '0 2px 5px rgba(245, 158, 11, 0.15)',
                                fontSize: '0.72rem', 
                                fontWeight: 600,
                                color: '#92400e',
                                lineHeight: 1,
                                userSelect: 'none',
                                verticalAlign: 'middle'
                              }}
                              title="Product of the Month — Featured on website blog sidebar"
                            >
                              <Star size={12} fill="#f59e0b" color="#d97706" style={{ flexShrink: 0, filter: 'drop-shadow(0 1px 1px rgba(217, 119, 6, 0.25))' }} />
                              <span style={{ letterSpacing: '0.01em' }}>Product of the Month</span>
                              <span style={{ width: '1px', height: '11px', background: '#fcd34d', margin: '0 1px' }} />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveProductOfTheMonth(p);
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#b45309',
                                  cursor: 'pointer',
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '50%',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: 0,
                                  transition: 'all 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#fee2e2';
                                  e.currentTarget.style.color = '#dc2626';
                                  e.currentTarget.style.transform = 'scale(1.15)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'transparent';
                                  e.currentTarget.style.color = '#b45309';
                                  e.currentTarget.style.transform = 'scale(1)';
                                }}
                                title="Click to unselect from Product of the Month"
                              >
                                <X size={10} strokeWidth={2.5} />
                              </button>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category Pill */}
                      <td>
                        <span className="category-tag">
                          {getDisplayCategory(p)}
                        </span>
                      </td>

                      {/* Actions: View, Edit, Delete */}
                      <td>
                        <div className="action-buttons-group action-center">
                          <button 
                            className="icon-action-btn view" 
                            title="View Product Details"
                            onClick={() => handleOpenView(p)}
                          >
                            <Eye size={15} />
                          </button>
                          <button 
                            className="icon-action-btn edit" 
                            title="Edit Product"
                            onClick={() => handleEditClick(p)}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button 
                            className="icon-action-btn delete" 
                            title="Delete Product"
                            onClick={() => handleDeleteClick(p)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}

              {!loading && displayedProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty-table-cell">
                    No products found matching "{searchTerm}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="table-pagination-footer">
          <span className="pagination-info">
            Showing {filteredProducts.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + entriesPerPage, filteredProducts.length)} of {filteredProducts.length} entries
          </span>

          <div className="pagination-nav">
            <button 
              className="pagination-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                className={`pagination-btn page-num ${currentPage === num ? 'active' : ''}`}
                onClick={() => setCurrentPage(num)}
              >
                {num}
              </button>
            ))}

            <button 
              className="pagination-btn"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL 1: CONFIRM EDIT */}
      {editConfirmDialog.open && (
        <div className="modal-overlay" onClick={() => setEditConfirmDialog({ open: false, product: null })}>
          <div className="modal-card confirmation-card edit-confirm-card" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon-wrap" style={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }}>
              <Edit2 size={32} color="#059669" />
            </div>
            <h3>Edit Product?</h3>
            <p>
              Do you want to edit <strong>"{editConfirmDialog.product?.name}"</strong>? Click proceed to update product details and specifications.
            </p>

            <div className="confirm-buttons-group">
              <button 
                className="outline-pill-btn" 
                onClick={() => setEditConfirmDialog({ open: false, product: null })}
                style={{ background: 'transparent', border: '1.5px solid #cbd5e1', color: '#64748b', animation: 'none', boxShadow: 'none' }}
              >
                Cancel
              </button>

              <button 
                className="primary-green-btn" 
                onClick={proceedToEditModal}
              >
                Yes, Proceed to Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL 2: CONFIRM DELETE */}
      {deleteConfirmDialog.open && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmDialog({ open: false, product: null })}>
          <div className="modal-card confirmation-card" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon-wrap">
              <AlertTriangle size={32} color="#dc2626" />
            </div>
            <h3>{deleteConfirmDialog.step === 1 ? 'Delete Product?' : 'FINAL WARNING'}</h3>
            <p style={{ color: deleteConfirmDialog.step === 2 ? '#dc2626' : '#64748b', fontWeight: deleteConfirmDialog.step === 2 ? 'bold' : 'normal' }}>
              {deleteConfirmDialog.step === 1 
                ? `Are you sure you want to permanently delete "${deleteConfirmDialog.product?.name}"? This action cannot be undone.`
                : `You are about to PERMANENTLY erase "${deleteConfirmDialog.product?.name}" from the database. Are you absolutely certain?`}
            </p>

            <div className="confirm-buttons-group">
              <button 
                className="outline-pill-btn" 
                onClick={() => setDeleteConfirmDialog({ open: false, product: null, step: 1 })}
                disabled={isSubmitting}
                style={{ background: 'transparent', border: '1.5px solid #cbd5e1', color: '#64748b', animation: 'none', boxShadow: 'none' }}
              >
                Cancel
              </button>

              <button 
                className="primary-green-btn" 
                onClick={deleteConfirmDialog.step === 1 ? confirmDeleteStep1 : confirmDelete}
                disabled={isSubmitting}
                style={deleteConfirmDialog.step === 2 ? { background: '#dc2626', color: 'white', border: 'none' } : {}}
              >
                {isSubmitting ? 'Deleting...' : (deleteConfirmDialog.step === 1 ? 'Yes, Delete Product' : 'YES, I AM SURE')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT / VIEW PRODUCT MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', flex: 1 }}>
                <Package size={22} color="var(--green-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <h3 style={{ margin: 0, lineHeight: 1.3, paddingRight: '0.5rem' }}>
                  {modalMode === 'create' && 'Add New Product'}
                  {modalMode === 'edit' && `Edit Product: ${selectedProduct?.name}`}
                  {modalMode === 'view' && 'Product Specifications & Details'}
                </h3>
              </div>
              <button className="modal-close-btn" style={{ flexShrink: 0 }} onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {/* View Mode */}
            {modalMode === 'view' && selectedProduct ? (
              <div className="modal-view-body">
                <div className="form-group">
                  <label>Step 1: Product Name</label>
                  <div className="modal-input" style={{ background: '#f8fafc', color: '#1e293b', fontWeight: 700, border: '1px solid #e2e8f0', padding: '0.65rem 1rem', borderRadius: '8px', textTransform: 'uppercase' }}>
                    {selectedProduct.name}
                  </div>
                </div>

                {/* 1. THUMBNAIL SECTION */}
                <div className="image-section-container">
                  <div className="image-section-header">
                    <div>
                      <div className="image-section-title-wrap">
                        <Star size={16} color="#059669" />
                        <h4 className="image-section-title">Step 2: Product Thumbnail (Cover Image)</h4>
                        {selectedProduct.thumbnail && (
                          <span className="badge-tag-primary">
                            <CheckCircle2 size={12} /> Thumbnail Set
                          </span>
                        )}
                      </div>
                      <p className="image-section-subtitle">
                        Primary thumbnail used across catalog lists and cards.
                      </p>
                    </div>
                  </div>

                  {selectedProduct.thumbnail ? (
                    <div className="thumbnail-preview-card">
                      <div className="thumbnail-preview-img-box">
                        <img 
                          src={getProductImage({ ...selectedProduct, thumbnail: selectedProduct.thumbnail })} 
                          alt="Thumbnail preview" 
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span className="badge-tag-primary" style={{ padding: '0.15rem 0.45rem' }}>
                            <Star size={11} /> Primary Thumbnail
                          </span>
                        </div>
                        <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.72rem', color: '#64748b', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {selectedProduct.thumbnail}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="image-dropzone-box" style={{ cursor: 'default', background: '#f8fafc' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8' }}>No Thumbnail Set</span>
                    </div>
                  )}
                </div>

                {/* 2. GALLERY IMAGES SECTION */}
                <div className="image-section-container">
                  <div className="image-section-header">
                    <div>
                      <div className="image-section-title-wrap">
                        <Images size={16} color="var(--green-primary)" />
                        <h4 className="image-section-title">Step 3: Product Gallery / Additional Images</h4>
                        <span className="badge-tag-count">
                          {selectedProduct.images?.length || 0} {selectedProduct.images?.length === 1 ? 'image' : 'images'}
                        </span>
                      </div>
                      <p className="image-section-subtitle">
                        Additional images for multiple angles and product details.
                      </p>
                    </div>
                  </div>

                  {selectedProduct.images && selectedProduct.images.length > 0 ? (
                    <div className="gallery-grid">
                      {selectedProduct.images.map((imgUrl, idx) => {
                        const isThisThumbnail = selectedProduct.thumbnail === imgUrl;
                        return (
                          <div key={idx} className={`gallery-card ${isThisThumbnail ? 'is-thumbnail' : ''}`} style={{ paddingBottom: '0.75rem' }}>
                            <div className="gallery-card-thumb-wrap">
                              <span className="gallery-card-index">#{idx + 1}</span>
                              {isThisThumbnail && (
                                <span className="gallery-card-thumb-badge">
                                  <Star size={10} /> Thumbnail
                                </span>
                              )}
                              <img src={getProductImage({ ...selectedProduct, thumbnail: imgUrl })} alt={`Product ${idx + 1}`} loading="lazy" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="image-dropzone-box" style={{ cursor: 'default', background: '#f8fafc' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8' }}>No Gallery Images Added</span>
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label>Step 4: Category</label>
                  <div className="modal-input" style={{ background: '#f8fafc', color: '#334155', fontWeight: 600, border: '1px solid #e2e8f0', padding: '0.65rem 1rem', borderRadius: '8px' }}>
                    {getDisplayCategory(selectedProduct)}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label>Step 5: Specifications & Details</label>
                  
                  {selectedProduct.specs && Object.keys(selectedProduct.specs).length > 0 ? (
                    <div style={{ marginTop: '0.5rem', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                      <div style={{ background: '#cb3a3f', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'white' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/></svg>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, letterSpacing: '0.05em' }}>SPECIFICATIONS</h4>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                        <tbody>
                          {Object.entries(selectedProduct.specs).map(([key, val], idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ width: '40%', padding: '0.85rem', background: '#f8fafc', color: '#0f172a', fontWeight: 700, fontSize: '0.85rem', borderRight: '1px solid #e2e8f0', textTransform: 'uppercase' }}>
                                {String(key).toUpperCase()}
                              </td>
                              <td style={{ width: '60%', padding: '0.85rem', background: 'white', color: '#0f172a', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase' }}>
                                {String(val).toUpperCase()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="modal-input" style={{ background: '#f8fafc', color: '#475569', minHeight: '60px', whiteSpace: 'pre-wrap', border: '1px solid #e2e8f0', padding: '0.65rem 1rem', borderRadius: '8px' }}>
                      {selectedProduct.description || selectedProduct.spec || 'No extra description.'}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>PRODUCT ID (FIRESTORE)</label>
                  <div className="modal-input" style={{ background: '#f8fafc', color: '#64748b', fontSize: '0.85rem', fontFamily: 'monospace', border: '1px solid #e2e8f0', padding: '0.65rem 1rem', borderRadius: '8px' }}>
                    {selectedProduct._id || 'Stored in DB'}
                  </div>
                </div>

                <div className="modal-footer" style={{ marginTop: '2rem' }}>
                  <button className="primary-green-btn" onClick={() => setIsModalOpen(false)}>
                    Close
                  </button>
                </div>
              </div>
            ) : (
              /* Create or Edit Mode Form */
              <form onSubmit={handleSubmitForm} className="modal-form">
                <div className="form-group">
                  <label>Step 1: Product Name *</label>
                  <input
                    type="text"
                    required
                    style={{ textTransform: 'uppercase' }}
                    value={formData.name ? formData.name.toUpperCase() : ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                    placeholder="E.G., HEAVY DUTY BRUSH CUTTER 35CC"
                    className="modal-input"
                  />
                </div>

                {/* 1. SEPARATE THUMBNAIL UPLOAD SECTION */}
                <div className="image-section-container">
                  <div className="image-section-header">
                    <div>
                      <div className="image-section-title-wrap">
                        <Star size={16} color="#059669" />
                        <h4 className="image-section-title">Step 2: Product Thumbnail (Cover Image)</h4>
                        {formData.thumbnail && (
                          <span className="badge-tag-primary">
                            <CheckCircle2 size={12} /> Thumbnail Set
                          </span>
                        )}
                      </div>
                      <p className="image-section-subtitle">
                        Upload 1 image to be used as the primary thumbnail across catalog lists and cards.
                      </p>
                    </div>
                  </div>

                  {formData.thumbnail ? (
                    <div className="thumbnail-preview-card">
                      <div className="thumbnail-preview-img-box">
                        <img 
                          src={getProductImage({ ...selectedProduct, thumbnail: formData.thumbnail })} 
                          alt="Thumbnail preview" 
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span className="badge-tag-primary" style={{ padding: '0.15rem 0.45rem' }}>
                            <Star size={11} /> Primary Thumbnail
                          </span>
                        </div>
                        <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.72rem', color: '#64748b', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {formData.thumbnail}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                        <label 
                          className="outline-pill-btn" 
                          style={{ cursor: 'pointer', padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                        >
                          <Edit2 size={13} />
                          <span>Change</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleThumbnailUpload} 
                            style={{ display: 'none' }} 
                            disabled={uploadingThumbnail}
                          />
                        </label>
                        <button 
                          type="button" 
                          className="outline-pill-btn" 
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                          onClick={handleRemoveThumbnail}
                          disabled={uploadingThumbnail}
                        >
                          <Trash2 size={13} />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="image-dropzone-box" style={{ cursor: uploadingThumbnail ? 'not-allowed' : 'pointer' }}>
                      {uploadingThumbnail ? (
                        <>
                          <Loader2 size={24} className="spinning-icon" style={{ color: 'var(--green-primary)' }} />
                          <span style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                            Uploading thumbnail...
                          </span>
                        </>
                      ) : (
                        <>
                          <Upload size={24} style={{ color: 'var(--green-primary)', marginBottom: '0.35rem' }} />
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                            Click to Upload Thumbnail Image (1 File)
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                            Supported formats: JPG, PNG, WEBP, SVG
                          </span>
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleThumbnailUpload} 
                        style={{ display: 'none' }} 
                        disabled={uploadingThumbnail}
                      />
                    </label>
                  )}
                </div>

                {/* 2. MULTIPLE GALLERY IMAGES SECTION */}
                <div className="image-section-container">
                  <div className="image-section-header">
                    <div>
                      <div className="image-section-title-wrap">
                        <Images size={16} color="var(--green-primary)" />
                        <h4 className="image-section-title">Step 3: Product Gallery / Additional Images</h4>
                        <span className="badge-tag-count">
                          {formData.images?.length || 0} {formData.images?.length === 1 ? 'image' : 'images'}
                        </span>
                      </div>
                      <p className="image-section-subtitle">
                        Add as many images as you like for multiple angles and product details.
                      </p>
                    </div>

                    <label 
                      className="outline-pill-btn" 
                      style={{ cursor: uploadingGallery ? 'not-allowed' : 'pointer', fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                    >
                      <PlusCircle size={14} color="currentColor" />
                      <span>{uploadingGallery ? 'Uploading...' : 'Add Images'}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        multiple 
                        onChange={handleGalleryUpload} 
                        style={{ display: 'none' }} 
                        disabled={uploadingGallery}
                      />
                    </label>
                  </div>

                  {uploadingGallery && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', background: '#ecfdf5', borderRadius: '8px', color: '#059669', fontSize: '0.82rem', fontWeight: 600 }}>
                      <Loader2 size={16} className="spinning-icon" />
                      <span>Uploading selected images to gallery...</span>
                    </div>
                  )}

                  {formData.images && formData.images.length > 0 ? (
                    <div className="gallery-grid">
                      {formData.images.map((imgUrl, idx) => {
                        const isThisThumbnail = formData.thumbnail === imgUrl;
                        return (
                          <div key={idx} className={`gallery-card ${isThisThumbnail ? 'is-thumbnail' : ''}`}>
                            <div className="gallery-card-thumb-wrap">
                              <span className="gallery-card-index">#{idx + 1}</span>
                              {isThisThumbnail && (
                                <span className="gallery-card-thumb-badge">
                                  <Star size={10} /> Thumbnail
                                </span>
                              )}
                              <img src={getProductImage({ ...selectedProduct, thumbnail: imgUrl })} alt={`Product ${idx + 1}`} loading="lazy" />
                            </div>

                            <div className="gallery-card-actions">
                              {!isThisThumbnail ? (
                                <button
                                  type="button"
                                  className="gallery-action-btn set-thumb"
                                  onClick={() => handleSetAsThumbnail(imgUrl)}
                                  title="Use this image as the product thumbnail"
                                >
                                  <Star size={11} />
                                  <span>Use as Thumb</span>
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 700, padding: '0.2rem 0.4rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                  <CheckCircle2 size={12} /> Active
                                </span>
                              )}

                              <button
                                type="button"
                                className="gallery-action-btn remove-img"
                                onClick={() => handleRemoveGalleryImage(idx)}
                                title="Remove from gallery"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Add more card in grid */}
                      <label className="gallery-add-card" style={{ cursor: uploadingGallery ? 'not-allowed' : 'pointer' }}>
                        <PlusCircle size={26} color="var(--green-primary)" />
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>Add More</span>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Multiple files</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          multiple 
                          onChange={handleGalleryUpload} 
                          style={{ display: 'none' }} 
                          disabled={uploadingGallery}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="image-dropzone-box" style={{ cursor: uploadingGallery ? 'not-allowed' : 'pointer' }}>
                      <Images size={26} style={{ color: 'var(--green-primary)', marginBottom: '0.35rem' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                        Click to Upload Gallery Images
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                        You can select multiple photos at once (JPG, PNG, WEBP)
                      </span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        multiple 
                        onChange={handleGalleryUpload} 
                        style={{ display: 'none' }} 
                        disabled={uploadingGallery}
                      />
                    </label>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label style={{ margin: 0 }}>Step 4: Category *</label>
                    <button
                      type="button"
                      onClick={() => setShowInlineNewCategory(prev => !prev)}
                      style={{ background: 'none', border: 'none', color: '#059669', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <PlusCircle size={14} />
                      <span>{showInlineNewCategory ? 'Choose from List' : '+ Add New Category'}</span>
                    </button>
                  </div>

                  {!showInlineNewCategory ? (
                    <select
                      value={formData.category}
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          setShowInlineNewCategory(true);
                        } else {
                          setFormData({ ...formData, category: e.target.value });
                        }
                      }}
                      className="modal-input"
                    >
                      {categoriesList.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="__NEW__">➕ + Add New Category...</option>
                    </select>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        placeholder="Enter new category name (e.g. Solar Equipment)..."
                        className="modal-input"
                        style={{ flex: 1 }}
                        value={inlineCategoryInput}
                        onChange={(e) => setInlineCategoryInput(e.target.value)}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="primary-green-btn"
                        disabled={isCreatingCategory || !inlineCategoryInput.trim()}
                        style={{ borderRadius: '8px', padding: '0.65rem 1.2rem', whiteSpace: 'nowrap' }}
                        onClick={async () => {
                          const created = await handleCreateCategory(inlineCategoryInput);
                          if (created) {
                            setFormData(prev => ({ ...prev, category: created }));
                            setInlineCategoryInput('');
                            setShowInlineNewCategory(false);
                          }
                        }}
                      >
                        {isCreatingCategory ? <Loader2 size={16} className="spinner" /> : 'Create & Select'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label>Step 5: Dynamic Specifications (Key-Value Pairs)</label>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.8rem', marginTop: '-0.3rem' }}>
                    Add specifications like "Engine", "Power", etc. to show in the red table on the public website and view page.
                  </p>
                  
                  {formData.specs && formData.specs.map((spec, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <input 
                        type="text"
                        placeholder="KEY (E.G. ENGINE)"
                        className="modal-input"
                        style={{ flex: 1, textTransform: 'uppercase' }}
                        value={spec.key ? spec.key.toUpperCase() : ''}
                        onChange={(e) => {
                          const newSpecs = [...formData.specs];
                          newSpecs[idx].key = e.target.value.toUpperCase();
                          setFormData({ ...formData, specs: newSpecs });
                        }}
                      />
                      <input 
                        type="text"
                        placeholder="VALUE (E.G. 4 STROKE)"
                        className="modal-input"
                        style={{ flex: 2, textTransform: 'uppercase' }}
                        value={spec.value ? spec.value.toUpperCase() : ''}
                        onChange={(e) => {
                          const newSpecs = [...formData.specs];
                          newSpecs[idx].value = e.target.value.toUpperCase();
                          setFormData({ ...formData, specs: newSpecs });
                        }}
                      />
                        <button 
                          type="button" 
                          onClick={() => {
                            const newSpecs = [...formData.specs];
                            newSpecs.splice(idx, 1);
                            setFormData({ ...formData, specs: newSpecs });
                          }}
                          style={{ 
                            background: '#ef4444', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '8px', 
                            width: '42px', 
                            height: '42px', 
                            flexShrink: 0, 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)'
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = '#dc2626'; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = '#ef4444'; }}
                          title="Remove row"
                        >
                          <X size={20} strokeWidth={3} />
                        </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, specs: [...(formData.specs || []), { key: '', value: '' }] })}
                    style={{ background: '#f0f9ff', color: '#0369a1', border: '1px dashed #7dd3fc', padding: '0.6rem', borderRadius: '8px', width: '100%', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', marginTop: '0.2rem', transition: 'all 0.2s' }}
                    onMouseOver={(e) => e.target.style.background = '#e0f2fe'}
                    onMouseOut={(e) => e.target.style.background = '#f0f9ff'}
                  >
                    + Add New Specification Row
                  </button>
                </div>

                <div className="form-group">
                  <label>Additional Description (Optional fallback)</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter any extra details or paragraphs here..."
                    className="modal-input"
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1.5px solid #cbd5e1' }}>
                    <input
                      type="checkbox"
                      checked={formData.isProductOfTheMonth}
                      onChange={(e) => setFormData({ ...formData, isProductOfTheMonth: e.target.checked })}
                      style={{ width: '1.2rem', height: '1.2rem' }}
                    />
                    <div>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        ⭐ Set as Product of the Month
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
                        Display this product prominently on the website blog sidebar. Uncheck anytime to remove.
                      </span>
                    </div>
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
                    className="primary-green-btn" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="spinning-icon" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>{modalMode === 'create' ? 'Save Product' : 'Update Product'}</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* CATEGORY MANAGEMENT MODAL */}
      {isCategoryModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCategoryModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '560px', height: 'auto', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Tag size={22} color="var(--green-primary)" />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Manage & Add Categories</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setIsCategoryModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '1.5rem', overflowY: 'auto' }}>
              {/* New Category Input */}
              <div style={{ marginBottom: '1.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
                  Create New Category
                </label>
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <input
                    type="text"
                    placeholder="e.g. Solar Equipment, Milking Machines..."
                    className="modal-input"
                    style={{ flex: 1 }}
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateCategory(newCategoryName);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="primary-green-btn"
                    disabled={isCreatingCategory || !newCategoryName.trim()}
                    style={{ borderRadius: '8px', padding: '0.65rem 1.25rem', whiteSpace: 'nowrap' }}
                    onClick={() => handleCreateCategory(newCategoryName)}
                  >
                    {isCreatingCategory ? <Loader2 size={16} className="spinner" /> : '+ Add Category'}
                  </button>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem', marginBottom: 0 }}>
                  💡 This new category will instantly appear in the Admin category filter, Add/Edit product dropdown, and the public website catalog!
                </p>
              </div>

              {/* Existing Categories List */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  Catalog Categories ({categoriesList.length}) - Edit or Delete
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', maxHeight: '480px', overflowY: 'auto', padding: '0.6rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  {categoriesList.map((cat) => {
                    const count = products.filter(p => getDisplayCategory(p) === cat).length;
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
                                promptUpdateCategory(cat, editCategoryNameInput);
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
                            onClick={() => promptUpdateCategory(cat, editCategoryNameInput)}
                            title="Save changes"
                          >
                            {isUpdatingCategory ? <Loader2 size={13} className="spinner" /> : 'Save'}
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
                          padding: '0.45rem 0.85rem',
                          borderRadius: '8px',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1e293b' }}>
                            {cat}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#059669', background: '#ecfdf5', padding: '0.15rem 0.5rem', borderRadius: '20px', fontWeight: 700 }}>
                            {count} {count === 1 ? 'product' : 'products'}
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
                              transition: 'all 0.15s'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#334155'; }}
                          >
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat)}
                            disabled={deletingCategoryName === cat}
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
                              transition: 'all 0.15s'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                          >
                            {deletingCategoryName === cat ? <Loader2 size={13} className="spinner" /> : <Trash2 size={13} />}
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

      {/* CATEGORY DELETE CONFIRMATION DIALOG (2-STEP WITH AUDIO) */}
      {categoryDeleteDialog.open && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setCategoryDeleteDialog({ open: false, category: null, step: 1 })}>
          <div className="modal-card" style={{ maxWidth: '460px', height: 'auto', padding: '2rem 1.75rem', textAlign: 'center', borderRadius: '16px', boxShadow: '0 20px 45px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
            
            {categoryDeleteDialog.step === 1 ? (
              <>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#fef3c7', color: '#b45309', padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.04em', marginBottom: '1.25rem', textTransform: 'uppercase' }}>
                  <span>⚠️ Step 1 of 2 : Safety Check</span>
                </div>
                
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fffbeb', border: '3px solid #fef3c7', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', boxShadow: '0 0 25px rgba(245, 158, 11, 0.25)' }}>
                  <AlertTriangle size={32} />
                </div>

                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.6rem' }}>
                  Delete Category?
                </h3>
                
                <p style={{ fontSize: '0.92rem', color: '#64748b', lineHeight: '1.5', marginBottom: '1.75rem' }}>
                  Are you sure you want to delete category <strong style={{ color: '#0f172a' }}>"{categoryDeleteDialog.category}"</strong>?
                  <br />
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'block', marginTop: '0.5rem' }}>
                    Any products currently assigned to this category will be preserved and moved to "Other".
                  </span>
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="outline-pill-btn"
                    style={{ padding: '0.65rem 1.4rem', borderRadius: '8px', fontWeight: 600 }}
                    onClick={() => setCategoryDeleteDialog({ open: false, category: null, step: 1 })}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="primary-green-btn"
                    style={{ background: '#f59e0b', borderColor: '#d97706', padding: '0.65rem 1.4rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    onClick={() => {
                      aiVoice.notifyDeleteStep2();
                      setCategoryDeleteDialog(prev => ({ ...prev, step: 2 }));
                    }}
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
                  This action will completely remove <strong style={{ color: '#dc2626' }}>"{categoryDeleteDialog.category}"</strong> from filters and customer catalog.
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
                    onClick={() => setCategoryDeleteDialog(prev => ({ ...prev, step: 1 }))}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    className="primary-green-btn"
                    style={{ background: '#dc2626', borderColor: '#b91c1c', padding: '0.65rem 1.4rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(220, 38, 38, 0.35)' }}
                    disabled={Boolean(deletingCategoryName)}
                    onClick={confirmDeleteCategory}
                  >
                    {deletingCategoryName ? <Loader2 size={16} className="spinner" /> : <Trash2 size={16} />}
                    <span>Yes, Permanently Delete</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* CATEGORY EDIT CONFIRMATION DIALOG (2-STEP WITH AUDIO) */}
      {categoryEditDialog.open && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setCategoryEditDialog({ open: false, oldName: null, newName: null, step: 1 })}>
          <div className="modal-card" style={{ maxWidth: '460px', height: 'auto', padding: '2rem 1.75rem', textAlign: 'center', borderRadius: '16px', boxShadow: '0 20px 45px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
            
            {categoryEditDialog.step === 1 ? (
              <>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#e0f2fe', color: '#0369a1', padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.04em', marginBottom: '1.25rem', textTransform: 'uppercase' }}>
                  <span>✏️ Step 1 of 2 : Rename Review</span>
                </div>

                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#f0f9ff', border: '3px solid #bae6fd', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', boxShadow: '0 0 25px rgba(2, 132, 199, 0.25)' }}>
                  <Edit2 size={30} />
                </div>

                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.6rem' }}>
                  Rename Category?
                </h3>

                <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1.25rem' }}>
                  Please verify the change you are about to make:
                </p>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.85rem 1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div style={{ textAlign: 'left', flex: 1 }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>Current Name</span>
                    <strong style={{ color: '#dc2626', fontSize: '0.9rem', textDecoration: 'line-through' }}>{categoryEditDialog.oldName}</strong>
                  </div>
                  <div style={{ color: '#0284c7', fontSize: '1.3rem', fontWeight: 'bold' }}>➔</div>
                  <div style={{ textAlign: 'right', flex: 1 }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>New Name</span>
                    <strong style={{ color: '#059669', fontSize: '0.95rem' }}>{categoryEditDialog.newName}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="outline-pill-btn"
                    style={{ padding: '0.65rem 1.4rem', borderRadius: '8px', fontWeight: 600 }}
                    onClick={() => setCategoryEditDialog({ open: false, oldName: null, newName: null, step: 1 })}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="primary-green-btn"
                    style={{ background: '#0284c7', borderColor: '#0369a1', padding: '0.65rem 1.4rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    onClick={() => {
                      aiVoice.notifyEditStep2();
                      setCategoryEditDialog(prev => ({ ...prev, step: 2 }));
                    }}
                  >
                    <span>Continue to Step 2</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#ecfdf5', color: '#047857', padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.04em', marginBottom: '1.25rem', textTransform: 'uppercase' }}>
                  <span>🚀 Step 2 of 2 : Apply Changes</span>
                </div>

                <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: '#ecfdf5', border: '3px solid #a7f3d0', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', boxShadow: '0 0 30px rgba(5, 150, 105, 0.35)' }}>
                  <CheckCircle2 size={34} />
                </div>

                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#065f46', marginBottom: '0.6rem' }}>
                  Update Catalog & Products?
                </h3>

                <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: '1.5', marginBottom: '1.75rem' }}>
                  All products currently under <strong style={{ color: '#0f172a' }}>"{categoryEditDialog.oldName}"</strong> will automatically move to <strong style={{ color: '#059669' }}>"{categoryEditDialog.newName}"</strong>.
                  <br />
                  <span style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 600, display: 'block', marginTop: '0.4rem' }}>
                    Changes will reflect instantly on the Live Website catalog!
                  </span>
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="outline-pill-btn"
                    style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', fontWeight: 600 }}
                    onClick={() => setCategoryEditDialog(prev => ({ ...prev, step: 1 }))}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    className="primary-green-btn"
                    style={{ background: '#059669', borderColor: '#047857', padding: '0.65rem 1.4rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.35)' }}
                    disabled={isUpdatingCategory}
                    onClick={confirmUpdateCategory}
                  >
                    {isUpdatingCategory ? <Loader2 size={16} className="spinner" /> : <CheckCircle2 size={16} />}
                    <span>Yes, Save Changes</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* PRODUCT EDIT CONFIRMATION MODAL (WITH AI VOICE) */}
      {editConfirmDialog.open && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setEditConfirmDialog({ open: false, product: null })}>
          <div className="modal-card" style={{ maxWidth: '460px', height: 'auto', padding: '2rem 1.75rem', textAlign: 'center', borderRadius: '16px', boxShadow: '0 20px 45px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#e0f2fe', color: '#0369a1', padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.04em', marginBottom: '1.25rem', textTransform: 'uppercase' }}>
              <span>✏️ Confirmation : Edit Product</span>
            </div>

            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#f0f9ff', border: '3px solid #bae6fd', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', boxShadow: '0 0 25px rgba(2, 132, 199, 0.25)' }}>
              <Edit2 size={30} />
            </div>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.6rem' }}>
              Edit Product Details?
            </h3>

            <p style={{ fontSize: '0.92rem', color: '#64748b', lineHeight: '1.5', marginBottom: '1.75rem' }}>
              Are you sure you want to edit <strong style={{ color: '#0f172a' }}>"{editConfirmDialog.product?.name}"</strong>?
              <br />
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'block', marginTop: '0.5rem' }}>
                Category: {editConfirmDialog.product?.category || 'General'}
              </span>
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                className="outline-pill-btn"
                style={{ padding: '0.65rem 1.4rem', borderRadius: '8px', fontWeight: 600 }}
                onClick={() => setEditConfirmDialog({ open: false, product: null })}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-green-btn"
                style={{ background: '#0284c7', borderColor: '#0369a1', padding: '0.65rem 1.4rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                onClick={proceedToEditModal}
              >
                <span>Proceed to Edit</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT DELETE CONFIRMATION MODAL (2-STEP WITH AI VOICE) */}
      {deleteConfirmDialog.open && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setDeleteConfirmDialog({ open: false, product: null, step: 1 })}>
          <div className="modal-card" style={{ maxWidth: '460px', height: 'auto', padding: '2rem 1.75rem', textAlign: 'center', borderRadius: '16px', boxShadow: '0 20px 45px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
            
            {deleteConfirmDialog.step === 1 ? (
              <>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#fef3c7', color: '#b45309', padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.04em', marginBottom: '1.25rem', textTransform: 'uppercase' }}>
                  <span>⚠️ Step 1 of 2 : Safety Check</span>
                </div>
                
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fffbeb', border: '3px solid #fef3c7', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', boxShadow: '0 0 25px rgba(245, 158, 11, 0.25)' }}>
                  <AlertTriangle size={32} />
                </div>

                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.6rem' }}>
                  Delete Product?
                </h3>
                
                <p style={{ fontSize: '0.92rem', color: '#64748b', lineHeight: '1.5', marginBottom: '1.75rem' }}>
                  Are you sure you want to delete <strong style={{ color: '#0f172a' }}>"{deleteConfirmDialog.product?.name}"</strong>?
                  <br />
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'block', marginTop: '0.5rem' }}>
                    Category: {deleteConfirmDialog.product?.category || 'General'}
                  </span>
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="outline-pill-btn"
                    style={{ padding: '0.65rem 1.4rem', borderRadius: '8px', fontWeight: 600 }}
                    onClick={() => setDeleteConfirmDialog({ open: false, product: null, step: 1 })}
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
                  This product <strong style={{ color: '#dc2626' }}>"{deleteConfirmDialog.product?.name}"</strong> will be permanently removed from inventory and website!
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
                    onClick={() => setDeleteConfirmDialog(prev => ({ ...prev, step: 1 }))}
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
    </div>
  );
};

export default Products;
