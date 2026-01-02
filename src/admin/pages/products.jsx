import React, { useState, useEffect } from 'react';
import { Plus, Search, Upload, X, RefreshCw, Trash2, AlertCircle } from 'lucide-react';
import { useParams, useNavigate, Outlet, useLocation } from 'react-router-dom';
import axios from 'axios';
import { BASE_URL } from '../../util';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import XlMigration, { downloadExcelTemplate } from '../components/xlmigration';

const AVAILABLE_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL'];

const Products = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [specifications, setSpecifications] = useState({});
  const [originalSpecifications, setOriginalSpecifications] = useState({});
  const [images, setImages] = useState([]);
  const [productDetails, setProductDetails] = useState({
    name: '',
    size: '',  
    price: '',
    mrp: '',
    rating: '',
    brand: '',
    gst: '', 
    gst_type: 'exclusive', 
    gstType: 'exclusive', 
    description: '',
    stockQuantity: '',
    lowStockThreshold: '',
    isActive: true,
    minOrderQuantity: '',
    maxOrderQuantity: '',
    allowCOD: true,
    allowCard: true,
    allowUPI: true,
    allowAdvance: true,
    advancePaymentType: 'percentage',
    advancePaymentValue: ''
  });

  // States for dynamic data
  const [mainCategories, setMainCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [specificationKeys, setSpecificationKeys] = useState([]); // For storing specification keys from API
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [imageActionLoading, setImageActionLoading] = useState(false);
  const [imageToUpdate, setImageToUpdate] = useState(null);
  const [newImageFile, setNewImageFile] = useState(null);
  const [imageActionError, setImageActionError] = useState("");
  const [imageActionSuccess, setImageActionSuccess] = useState("");

  // State to track which specifications are enabled via checkbox
  const [enabledSpecs, setEnabledSpecs] = useState({});

  // Advance Payment editor UI state
  const [showAdvanceEditor, setShowAdvanceEditor] = useState(false);

  // New size management states
  const [enableSizes, setEnableSizes] = useState(false);
  const [productSizes, setProductSizes] = useState([]);
  const [newSize, setNewSize] = useState({
    size_type: 'clothing',
    size_value: '',
    is_available: true,
    price_modifier_type: 'none',
    price_modifier_value: '',
    price: '',
    mrp: '',
    stock_quantity: 0
  });

  // Subcategory management states
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [subcategoryFormData, setSubcategoryFormData] = useState({
    name: '',
    description: '',
    maincategoryid: ''
  });
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [subcategoryLoading, setSubcategoryLoading] = useState(false);

  // Excel import states
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);

  // Function to check if category is fashion
  const isFashionCategory = (categoryId) => {
    if (!categoryId || !mainCategories || mainCategories.length === 0) return false;
    const category = mainCategories.find(c => c.id === parseInt(categoryId));
    return category ? category.name.toLowerCase() === 'fashion' : false;
  };

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${BASE_URL}/api/categories`);
        const fetchedMainCategories = response.data.mainCategories || [];

        setMainCategories(fetchedMainCategories);

        if (fetchedMainCategories.length > 0) {
          // If not editing an existing product, set the first category as selected
          // For existing products, category will be set in another useEffect based on productDetails
          if (!id) {
            setSelectedCategory(fetchedMainCategories[0].id);
            fetchSubcategories(fetchedMainCategories[0].id);
          }
        } else {
          setSelectedCategory(null);
          setSubcategories([]);
          setSpecificationKeys([]);
        }
      } catch (error) {
        console.error('Error fetching main categories:', error);
        setMainCategories([]);
        setSelectedCategory(null);
        setSubcategories([]);
        setSpecificationKeys([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [id]); // Add 'id' to dependency array to re-evaluate if creating new or editing

  // Function to fetch subcategories for a selected main category
  const fetchSubcategories = async (categoryId, autoSelectName = null) => {
    if (!categoryId) return;

    try {
      const response = await axios.get(`${BASE_URL}/api/subcategories?maincategoryid=${categoryId}`);
      const result = response.data;
      const subcats = result.subcategories || result.subCategories || [];

      if (Array.isArray(subcats) && subcats.length > 0) {
        console.log(`Found ${subcats.length} subcategories for category ${categoryId}`);
        setSubcategories(subcats);

        // Auto-select specific subcategory if provided (for newly created ones)
        if (autoSelectName) {
          const targetSubcategory = subcats.find(sub => sub.name === autoSelectName);
          if (targetSubcategory) {
            setSelectedSubcategory(targetSubcategory.name);
            fetchSpecificationKeys(categoryId, targetSubcategory.id);
          }
        } else if (subcats.length > 0 && !id) {
          // Auto-select the first subcategory only if not editing existing product
          setSelectedSubcategory(subcats[0].name);
          fetchSpecificationKeys(categoryId, subcats[0].id);
        }
      } else {
        console.log(`No subcategories found for category ${categoryId}`);
        setSubcategories([]);
      }

      return subcats;
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      setSubcategories([]);
      return [];
    }
  };

  // Fetch specification keys from API
  const fetchSpecificationKeys = async (categoryId, subCategoryId) => {
    if (!categoryId || !subCategoryId) return;

    try {
      const response = await axios.get(`${BASE_URL}/api/specificationkeys?category=${categoryId}&subcategory=${subCategoryId}`);
      if (response.data && Array.isArray(response.data)) {
        console.log(`Found ${response.data.length} specification keys for subcategory ${subCategoryId}`);
        setSpecificationKeys(response.data);
      } else {
        console.log(`No specification keys found for subcategory ${subCategoryId}`);
        setSpecificationKeys([]);
      }
    } catch (error) {
      console.error('Error fetching specification keys:', error);
      setSpecificationKeys([]);
    }
  };

  // GET function to fetch all subcategories
  const getAllSubcategories = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/subcategories`);
      console.log('All subcategories fetched:', response.data);
      return response.data.subcategories || response.data.subCategories || response.data || [];
    } catch (error) {
      console.error('Error fetching all subcategories:', error);
      toast.error('Failed to fetch subcategories');
      return [];
    }
  };

  // GET function to fetch subcategory by ID
  const getSubcategoryById = async (subcategoryId) => {
    try {
      const response = await axios.get(`${BASE_URL}/api/subcategories/${subcategoryId}`);
      console.log('Subcategory fetched by ID:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching subcategory by ID:', error);
      toast.error('Failed to fetch subcategory details');
      return null;
    }
  };

  // POST function to create a new subcategory
  const createSubcategory = async (subcategoryData) => {
    try {
      // Log the data being sent for debugging
      console.log('Creating subcategory with data:', subcategoryData);

      // Format data according to backend API expectations
      // Backend expects: { maincategoryid: number, subcategories: [{ name: string }] }
      const formattedData = {
        maincategoryid: parseInt(subcategoryData.maincategoryid),
        subcategories: [
          {
            name: subcategoryData.name,
            description: subcategoryData.description || ''
          }
        ]
      };

      console.log('Formatted data being sent:', formattedData);

      const response = await axios.post(`${BASE_URL}/api/subcategories`, formattedData);
      console.log('Subcategory created successfully:', response.data);
      toast.success('Subcategory created successfully!');

      // Refresh subcategories list and auto-select the newly created subcategory
      if (selectedCategory && subcategoryData.maincategoryid == selectedCategory) {
        await fetchSubcategories(selectedCategory, subcategoryData.name);
      }

      return response.data;
    } catch (error) {
      console.error('Error creating subcategory:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error headers:', error.response?.headers);

      // Show more detailed error message
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data ||
        'Failed to create subcategory';

      toast.error(typeof errorMessage === 'string' ? errorMessage : 'Failed to create subcategory');
      return null;
    }
  };

  // PUT function to update an existing subcategory
  const updateSubcategory = async (subcategoryId, subcategoryData) => {
    try {
      // Log the data being sent for debugging
      console.log('Updating subcategory with data:', subcategoryData);

      // Format data according to backend API expectations for update
      // Backend expects: { name: string } for updates
      const formattedData = {
        name: subcategoryData.name
      };

      console.log('Formatted update data being sent:', formattedData);

      const response = await axios.put(`${BASE_URL}/api/subcategories/${subcategoryId}`, formattedData);
      console.log('Subcategory updated successfully:', response.data);
      toast.success('Subcategory updated successfully!');

      // Refresh subcategories list and maintain selection of the updated subcategory
      if (selectedCategory) {
        await fetchSubcategories(selectedCategory, subcategoryData.name);
      }

      return response.data;
    } catch (error) {
      console.error('Error updating subcategory:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);

      // Show more detailed error message
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data ||
        'Failed to update subcategory';

      toast.error(typeof errorMessage === 'string' ? errorMessage : 'Failed to update subcategory');
      return null;
    }
  };

  // DELETE function to delete a subcategory
  const deleteSubcategory = async (subcategoryId) => {
    try {
      await axios.delete(`${BASE_URL}/api/subcategories/${subcategoryId}`);
      console.log('Subcategory deleted:', subcategoryId);
      toast.success('Subcategory deleted successfully!');

      // Refresh subcategories list
      if (selectedCategory) {
        await fetchSubcategories(selectedCategory);
      }

      // Reset selected subcategory if it was the deleted one
      const deletedSubcategory = subcategories.find(sub => sub.id === subcategoryId);
      if (deletedSubcategory && selectedSubcategory === deletedSubcategory.name) {
        setSelectedSubcategory('');
        setSpecifications({});
        setEnabledSpecs({});
        setSpecificationKeys([]);
      }

      return true;
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      toast.error(error.response?.data?.message || 'Failed to delete subcategory');
      return false;
    }
  };



  // Load product data if in edit mode
  useEffect(() => {
    if (id) {
      const fetchProduct = async () => {
        try {
          console.log(`Fetching product details for ID: ${id}`);
          
          // Fetch product details
          const response = await axios.get(`${BASE_URL}/api/products/${id}`);
          const product = response.data;

          console.log('Product data loaded:', product);

          setProductDetails({
            name: product.productname || product.productName || product.name || '',
            price: product.price || '',
            mrp: product.mrp || '',
            rating: product.rating || '',
            brand: product.brand || '',
            size: product.size ? String(product.size) : '',
            gst: product.gst || '',
            gst_type: product.gst_type || 'exclusive',
            gstType: product.gst_type || 'exclusive',
            description: product.description || '',
            stockQuantity: product.stockQuantity || product.stock_quantity || '',
            lowStockThreshold: product.lowStockThreshold || product.low_stock_threshold || '',
            isActive: product.isActive !== undefined ? product.isActive : (product.is_active !== undefined ? product.is_active : true),
            minOrderQuantity: product.minOrderQuantity || product.min_order_quantity || '',
            maxOrderQuantity: product.maxOrderQuantity || product.max_order_quantity || '',
            allowCOD: product.allow_cod !== undefined ? product.allow_cod : true,
            allowCard: product.allow_card !== undefined ? product.allow_card : true,
            allowUPI: product.allow_upi !== undefined ? product.allow_upi : true,
            allowAdvance: product.allow_advance !== undefined ? product.allow_advance : true,
            advancePaymentType: product.advance_payment_type || 'percentage',
            advancePaymentValue: product.advance_payment_value !== undefined && product.advance_payment_value !== null ? String(product.advance_payment_value) : ''
          });

          // Set the category first
          setSelectedCategory(product.category);

          // Fetch subcategories for this product's main category
          if (product.category) {
            try {
              const subResponse = await axios.get(`${BASE_URL}/api/subcategories?maincategoryid=${product.category}`);
              const result = subResponse.data;
              const subcats = result.subcategories || result.subCategories || [];

              // Update subcategories state
              setSubcategories(subcats);

              // Find the subcategory with the matching ID and set it
              const subCategoryId = product.subCategory || product.subcategory;

              if (subCategoryId) {
                const matchingSubcategory = subcats.find(sub => sub.id === subCategoryId);
                if (matchingSubcategory) {
                  setSelectedSubcategory(matchingSubcategory.name);
                  // Also fetch specification keys for this subcategory
                  fetchSpecificationKeys(product.category, subCategoryId);
                } else {
                  console.warn(`Could not find subcategory with ID ${subCategoryId} in the fetched subcategories`);
                }
              }
            } catch (subError) {
              console.error('Error fetching subcategories for product:', subError);
            }
          }

          // Fetch specification values for this product
          try {
            console.log(`Fetching specifications for product ID: ${id}`);
            const specResponse = await axios.get(`${BASE_URL}/api/products/${product.id}/specifications`);

            console.log('Specifications response:', specResponse.data);

            if (specResponse.data && Array.isArray(specResponse.data)) {
              const specObj = {};

              specResponse.data.forEach(spec => {
                // Handle different field names
                const specKeyId = spec.speckeyid || spec.specKeyId;
                if (specKeyId) {
                  specObj[specKeyId] = spec.value;
                  // Enable this spec in the UI
                  setEnabledSpecs(prev => ({ ...prev, [specKeyId]: true }));
                }
              });

              console.log('Processed specifications:', specObj);
              setSpecifications(specObj);

              // Store the original specifications for comparison during update
              setOriginalSpecifications(specObj);
            }
          } catch (specError) {
            console.error('Error fetching product specifications:', specError);
          }

          // Fetch product images
          try {
            console.log(`Fetching images for product ID: ${id}`);
            const imagesResponse = await axios.get(`${BASE_URL}/api/products/${product.id}/images`);
            console.log('Images response for product:', imagesResponse.data);

            if (imagesResponse.data && Array.isArray(imagesResponse.data)) {
              const productImages = imagesResponse.data.map(img => {
                // Get image URL and ensure it's properly formatted
                let imageSource = img.imageUrl || img.url || img.imageurl;

                // Create proper full URL
                const fullImageUrl = imageSource.startsWith('http')
                  ? imageSource
                  : `${BASE_URL}${imageSource}`;

                console.log(`Image ${img.id} URL:`, fullImageUrl);

                return {
                  id: img.id,
                  preview: fullImageUrl,
                  file: null, // No file object for existing images
                  orderNumber: img.ordernumber || img.orderNumber || 0
                };
              });

              setImages(productImages);
            } else {
              console.warn('No images found or invalid image data format');
              setImages([]);
            }
          } catch (imgError) {
            console.error('Error fetching product images:', imgError);
            setImages([]);
          }

          // Fetch product sizes
          await fetchProductSizes(product.id);

        } catch (error) {
          console.error('Error fetching product details:', error);
          // Fall back to localStorage for development/testing
          const products = JSON.parse(localStorage.getItem('products')) || [];
          const product = products.find(p => p.id === id);
          if (product) {
            setProductDetails({
              name: product.name,
              price: product.price,
              mrp: product.mrp || '',
              rating: product.rating || '',
              brand: product.brand,
              description: product.description || ''
            });
            setSelectedCategory(product.category);
            setSelectedSubcategory(product.subcategory);
            setSpecifications(product.specifications || {});

            fetchSubcategories(product.category);
          }
        }
      };

      fetchProduct();
    }
  }, [id]);

  // Helper to get fallback specifications from hardcoded object
  const getFallbackSpecifications = (subcategoryName) => {
    // This function is currently not used but kept for future fallback implementation
    return null;
  };

  // When selected category changes, fetch its subcategories
  useEffect(() => {
    if (selectedCategory) {
      fetchSubcategories(selectedCategory);

      // Auto-enable sizes for fashion category
      if (isFashionCategory(selectedCategory) && !enableSizes && productSizes.length === 0) {
        setEnableSizes(true);
      }
    }
  }, [selectedCategory]);

  // When selected subcategory changes, fetch specification keys
  useEffect(() => {
    if (selectedCategory && selectedSubcategory) {
      const subCat = subcategories.find(s => s.name === selectedSubcategory);
      if (subCat) {
        fetchSpecificationKeys(selectedCategory, subCat.id);
      }
    }
  }, [selectedSubcategory, subcategories]);

  // Prevent body scroll when subcategory modal is open
  useEffect(() => {
    if (showSubcategoryModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showSubcategoryModal]);

  const selectedCategoryData = mainCategories.find(c => c.id === selectedCategory);

  // Size management functions
  const fetchProductSizes = async (productId) => {
    try {
      const response = await axios.get(`${BASE_URL}/api/products/${productId}/sizes`);
      setProductSizes(response.data || []);
      setEnableSizes(response.data && response.data.length > 0);
    } catch (error) {
      console.error('Error fetching product sizes:', error);
      setProductSizes([]);
    }
  };

  const addSize = () => {
    if (!newSize.size_value.trim()) {
      toast.error('Please enter a size value');
      return;
    }

    // Check if we already have sizes of a different type
    if (productSizes.length > 0) {
      const existingSizeType = productSizes[0].size_type;
      if (existingSizeType !== newSize.size_type) {
        toast.error(`You can only use one size type per product. Current type: ${existingSizeType}`);
        return;
      }
    }

    // Check if the size value contains commas (multiple sizes)
    const sizeValues = newSize.size_value.split(',').map(s => s.trim()).filter(Boolean);

    // Check for duplicate sizes
    const existingSizeValues = productSizes.map(size => size.size_value);
    const duplicates = sizeValues.filter(value => existingSizeValues.includes(value));
    if (duplicates.length > 0) {
      toast.error(`Size(s) already exist: ${duplicates.join(', ')}`);
      return;
    }

    if (sizeValues.length > 1) {
      // Add multiple sizes
      const sizesToAdd = sizeValues.map((sizeValue, index) => ({
        size_type: newSize.size_type,
        size_value: sizeValue,
        display_order: productSizes.length + index,
        is_available: newSize.is_available,
        price_modifier_type: newSize.price_modifier_type,
        price_modifier_value: newSize.price_modifier_value,
        price: newSize.price,
        mrp: newSize.mrp,
        stock_quantity: 0,
        id: Date.now() + index // Temporary ID for new sizes
      }));

      setProductSizes(prev => [...prev, ...sizesToAdd]);
      toast.success(`Added ${sizeValues.length} sizes: ${sizeValues.join(', ')}`);
    } else {
      // Add single size
      const sizeToAdd = {
        ...newSize,
        display_order: productSizes.length,
        stock_quantity: 0,
        id: Date.now() // Temporary ID for new sizes
      };

      setProductSizes(prev => [...prev, sizeToAdd]);
      toast.success(`Added size: ${newSize.size_value}`);
    }

    setNewSize({
      size_type: productSizes.length > 0 ? productSizes[0].size_type : 'clothing', // Keep same type
      size_value: '',
      is_available: true,
      price_modifier_type: 'none',
      price_modifier_value: '',
      price: '',
      mrp: '',
      stock_quantity: 0
    });
  };

  const removeSize = (index) => {
    setProductSizes(prev => prev.filter((_, i) => i !== index));
  };

  const updateSize = (index, field, value) => {
    setProductSizes(prev => prev.map((size, i) =>
      i === index ? { ...size, [field]: value } : size
    ));
  };

  // When sizes are enabled, keep product stock = sum of per-size stocks
  useEffect(() => {
    if (enableSizes) {
      const total = (productSizes || []).reduce((sum, s) => sum + (parseInt(s.stock_quantity, 10) || 0), 0);
      setProductDetails(prev => ({ ...prev, stockQuantity: total }));
    }
  }, [enableSizes, productSizes]);

  // Calculate actual price for a size based on base price and modifiers
  const calculateSizePrice = (size) => {
    const basePrice = parseFloat(productDetails.price) || 0;
    const baseMrp = parseFloat(productDetails.mrp) || basePrice;
    
    if (!size.price_modifier_type || size.price_modifier_type === 'none') {
      return {
        price: basePrice,
        mrp: baseMrp,
        displayText: `₹${basePrice.toFixed(2)} (Base Price)`
      };
    }
    
    if (size.price_modifier_type === 'fixed') {
      const fixedPrice = parseFloat(size.price) || basePrice;
      const fixedMrp = parseFloat(size.mrp) || baseMrp;
      return {
        price: fixedPrice,
        mrp: fixedMrp,
        displayText: `₹${fixedPrice.toFixed(2)} (Fixed)`
      };
    }
    
    if (size.price_modifier_type === 'percentage') {
      const percentage = parseFloat(size.price_modifier_value) || 100;
      const multiplier = 1 + (percentage / 100);
      const calculatedPrice = basePrice * multiplier;
      const calculatedMrp = baseMrp * multiplier;
      return {
        price: calculatedPrice,
        mrp: calculatedMrp,
        displayText: `₹${calculatedPrice.toFixed(2)} (${percentage}% increase)`
      };
    }
    
    return {
      price: basePrice,
      mrp: baseMrp,
      displayText: `₹${basePrice.toFixed(2)} (Base Price)`
    };
  };

  const saveSizes = async (productId) => {
    try {
      console.log('saveSizes called with productId:', productId);
      console.log('productSizes to save:', productSizes);

      const sizesToSave = productSizes.map((size, index) => ({
        size_type: size.size_type,
        size_value: size.size_value,
        display_order: index,
        is_available: size.is_available,
        price: size.price || null,
        mrp: size.mrp || null,
        price_modifier_type: size.price_modifier_type || 'none',
        price_modifier_value: size.price_modifier_value || null,
        stock_quantity: Number.isFinite(parseInt(size.stock_quantity, 10)) ? parseInt(size.stock_quantity, 10) : 0
      }));

      console.log('Formatted sizes to save:', sizesToSave);

      const response = await axios.put(`${BASE_URL}/api/products/${productId}/sizes`, {
        sizes: sizesToSave
      });

      console.log('Sizes save response:', response.data);
      toast.success('Sizes updated successfully');
    } catch (error) {
      console.error('Error saving sizes:', error);
      console.error('Error response:', error.response?.data);
      toast.error('Error saving sizes: ' + (error.response?.data?.message || error.message));
      throw error; // Re-throw to see the error in the calling function
    }
  };

  const handleSpecificationChange = (specId, value) => {
    setSpecifications(prev => ({
      ...prev,
      [specId]: value
    }));
  };

  const handleProductDetailsChange = (field, value) => {
    // For gst_type/gstType, ensure the value is exactly 'inclusive' or 'exclusive'
    if (field === 'gst_type' || field === 'gstType') {
      value = value.toLowerCase() === 'inclusive' ? 'inclusive' : 'exclusive';
    }

    setProductDetails(prev => ({
      ...prev,
      [field]: value
    }));

    // Log the current state after update for debugging
    if (field === 'gst_type') {
      console.log('Updated GST type:', value);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);

    // Limit the number of files to process
    const maxImages = 4; // Changed from 8 to 4
    const currentImagesCount = images.length;
    const availableSlots = maxImages - currentImagesCount;

    if (availableSlots <= 0) {
      setImageActionError("Maximum number of images reached (4). Please remove some images first.");
      return;
    }

    const filesToProcess = files.slice(0, availableSlots);

    if (filesToProcess.length < files.length) {
      setImageActionError(`Only ${availableSlots} out of ${files.length} images were added due to the maximum limit of 4 images.`);
    }

    console.log(`Processing ${filesToProcess.length} new images for upload`);

    // Process the files
    const newImages = filesToProcess.map(file => {
      // Basic validation
      if (!file.type.startsWith('image/')) {
        console.warn(`File ${file.name} is not an image. Skipping.`);
        return null;
      }

      // Create a preview
      const preview = URL.createObjectURL(file);
      return {
        file,
        preview,
        isNew: true
      };
    }).filter(Boolean); // Remove null entries

    if (newImages.length > 0) {
      setImages(prev => [...prev, ...newImages]);
      setImageActionSuccess(`${newImages.length} new ${newImages.length === 1 ? 'image' : 'images'} added. Save the product to upload.`);
    } else {
      setImageActionError("No valid images were selected. Please try again with image files.");
    }
  };

  const removeImage = (index) => {
    const imageToRemove = images[index];

    // If it's an existing image (has ID), delete it from the server
    if (imageToRemove.id && id) {
      deleteImageFromServer(imageToRemove.id, index);
    } else {
      // Otherwise just remove from state
      setImages(prev => {
        const newImages = [...prev];
        if (newImages[index].preview && !newImages[index].id) {
          URL.revokeObjectURL(newImages[index].preview);
        }
        newImages.splice(index, 1);
        return newImages;
      });
    }
  };

  const deleteImageFromServer = async (imageId, index) => {
    setImageActionLoading(true);
    setImageActionError("");
    setImageActionSuccess("");

    console.log(`Attempting to delete image with ID: ${imageId} at index: ${index}`);

    try {
      const response = await axios.delete(`${BASE_URL}/api/product-images/${imageId}`);
      console.log('Image deletion response:', response.data);

      // Remove from state
      setImages(prev => {
        const newImages = [...prev];
        if (newImages[index] && newImages[index].preview) {
          // Revoke the object URL if it's a local file preview
          if (newImages[index].file) {
            URL.revokeObjectURL(newImages[index].preview);
          }
        }
        newImages.splice(index, 1);
        return newImages;
      });

      setImageActionSuccess("Image deleted successfully");
    } catch (error) {
      console.error("Error deleting image:", error);
      if (error.response) {
        console.error('Server responded with:', error.response.status, error.response.data);
        setImageActionError(`Failed to delete image: ${error.response.data.message || error.response.statusText}`);
      } else if (error.request) {
        console.error('No response received:', error.request);
        setImageActionError("Server did not respond. Please check your connection.");
      } else {
        setImageActionError(`Failed to delete image: ${error.message}`);
      }
    } finally {
      setImageActionLoading(false);
    }
  };

  const handleUpdateImage = async (imageId) => {
    if (!newImageFile) {
      setImageActionError("Please select a new image file");
      return;
    }

    setImageActionLoading(true);
    setImageActionError("");
    setImageActionSuccess("");

    try {
      const formData = new FormData();
      formData.append('image', newImageFile);

      console.log(`Updating image ${imageId} with new file:`, newImageFile.name);

      const response = await axios.put(`${BASE_URL}/api/product-images/${imageId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('Image update response:', response.data);

      // Get the updated image URL from the response
      let updatedImageUrl = '';
      if (response.data && response.data.image) {
        updatedImageUrl = response.data.image.imageUrl || response.data.image.url || '';
      }

      // Ensure the URL is properly formatted
      const fullImageUrl = updatedImageUrl.startsWith('http')
        ? updatedImageUrl
        : `${BASE_URL}${updatedImageUrl}`;

      console.log('Updated image full URL:', fullImageUrl);

      // Update the image in the state
      setImages(prev => prev.map(img =>
        img.id === imageId
          ? {
            ...img,
            preview: fullImageUrl,
            file: null,
            isUpdated: true
          }
          : img
      ));

      setImageActionSuccess("Image updated successfully");
      setNewImageFile(null);
    } catch (error) {
      console.error("Error updating image:", error);
      setImageActionError("Failed to update image. Please try again.");
    } finally {
      setImageActionLoading(false);
      setImageToUpdate(null);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setNewImageFile(e.target.files[0]);
    }
  };

  const handleSubcategoryChange = (e) => {
    const value = e.target.value;
    setSelectedSubcategory(value);

    // Reset enabled specs when subcategory changes
    setEnabledSpecs({});
    setSpecifications({});
  };

  // Subcategory management handlers
  const handleOpenSubcategoryModal = (subcategory = null) => {
    if (subcategory) {
      // Editing existing subcategory
      setEditingSubcategory(subcategory);
      setSubcategoryFormData({
        name: subcategory.name || '',
        description: subcategory.description || '',
        maincategoryid: subcategory.maincategoryid || selectedCategory || ''
      });
    } else {
      // Creating new subcategory
      setEditingSubcategory(null);
      setSubcategoryFormData({
        name: '',
        description: '',
        maincategoryid: selectedCategory || ''
      });
    }
    setShowSubcategoryModal(true);
  };

  const handleCloseSubcategoryModal = () => {
    setShowSubcategoryModal(false);
    setEditingSubcategory(null);
    setSubcategoryFormData({
      name: '',
      description: '',
      maincategoryid: ''
    });
  };

  const handleSubcategoryFormChange = (e) => {
    const { name, value } = e.target;
    setSubcategoryFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubcategorySubmit = async (e) => {
    e.preventDefault();

    if (!subcategoryFormData.name.trim()) {
      toast.error('Subcategory name is required');
      return;
    }

    if (!subcategoryFormData.maincategoryid) {
      toast.error('Please select a main category');
      return;
    }

    setSubcategoryLoading(true);

    try {
      let result;
      if (editingSubcategory) {
        // Update existing subcategory
        result = await updateSubcategory(editingSubcategory.id, subcategoryFormData);
      } else {
        // Create new subcategory
        result = await createSubcategory(subcategoryFormData);
      }

      if (result) {
        handleCloseSubcategoryModal();
      }
    } catch (error) {
      console.error('Error submitting subcategory:', error);
    } finally {
      setSubcategoryLoading(false);
    }
  };

  const handleDeleteSubcategory = async (subcategoryId) => {
    if (window.confirm('Are you sure you want to delete this subcategory? This action cannot be undone.')) {
      await deleteSubcategory(subcategoryId);
    }
  };

  // Toggle specification enabled state
  const toggleSpecEnabled = (specId) => {
    const isCurrentlyEnabled = !!enabledSpecs[specId];

    setEnabledSpecs(prev => ({
      ...prev,
      [specId]: !isCurrentlyEnabled
    }));

    // If we're enabling this spec, initialize with empty value
    if (!isCurrentlyEnabled) {
      setSpecifications(prev => ({
        ...prev,
        [specId]: '' // Initialize with empty string
      }));
    } else {
      // If disabling, remove the value
      setSpecifications(prev => {
        const newSpecs = { ...prev };
        delete newSpecs[specId];
        return newSpecs;
      });
    }
  };

  // Get list of enabled specification IDs
  const enabledSpecIds = Object.keys(enabledSpecs).filter(key => enabledSpecs[key]);

  // Handle form submission - send data to API
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedCategory || !selectedSubcategory || !productDetails.name || !productDetails.price) {
      toast.error('Please fill out all required fields');
      return;
    }

    // Validate size for fashion category (check both old and new size systems)
    if (isFashionCategory(selectedCategory)) {
      const hasLegacySizes = productDetails.size && productDetails.size.split(',').filter(Boolean).length > 0;
      const hasNewSizes = enableSizes && productSizes.length > 0;

      if (!hasLegacySizes && !hasNewSizes) {
        toast.error('Please select at least one size for fashion products');
        return;
      }
    }

    setSaveLoading(true);
    setSaveError(null);

    try {
      // Find the selected subcategory object to get its ID
      const selectedSubcategoryObj = subcategories.find(sub => sub.name === selectedSubcategory);

      if (!selectedSubcategoryObj) {
        console.error('Selected subcategory not found:', {
          selectedSubcategory,
          availableSubcategories: subcategories.map(s => ({ id: s.id, name: s.name }))
        });

        // Try to fetch subcategories again
        try {
          const subResponse = await axios.get(`${BASE_URL}/api/subcategories?maincategoryid=${selectedCategory}`);
          const result = subResponse.data;
          const subcats = result.subcategories || result.subCategories || [];

          // Update subcategories state
          setSubcategories(subcats);

          // Try to find the subcategory again
          const refreshedSubcategoryObj = subcats.find(sub => sub.name === selectedSubcategory);

          if (refreshedSubcategoryObj) {
            // Continue with the found subcategory object
            await processProductSubmission(refreshedSubcategoryObj);
            return;
          } else {
            throw new Error(`Subcategory "${selectedSubcategory}" not found even after refreshing data`);
          }
        } catch (subError) {
          console.error('Error fetching subcategories:', subError);
          throw new Error('Selected subcategory not found and failed to refresh subcategory data');
        }
      }

      // Process the submission with the found subcategory
      await processProductSubmission(selectedSubcategoryObj);
    } catch (error) {
      console.error('Error submitting product:', error);
      setSaveError(error.message || 'An error occurred while saving the product');
    } finally {
      setSaveLoading(false);
    }
  };

  // Extracted function to process the product submission
  const processProductSubmission = async (subcategoryObj) => {
    const advanceType = productDetails.advancePaymentType === 'amount' ? 'amount' : 'percentage';
    const parsedAdvance = productDetails.advancePaymentValue !== '' ? parseFloat(productDetails.advancePaymentValue) : null;
    const boundedAdvance = parsedAdvance === null ? null : (advanceType === 'percentage' ? Math.max(1, Math.min(100, parsedAdvance)) : Math.max(0, parsedAdvance));

    const productData = {
      productName: productDetails.name,
      price: parseFloat(productDetails.price),
      mrp: productDetails.mrp ? parseFloat(productDetails.mrp) : null,
      brand: productDetails.brand,
      description: productDetails.description,
      rating: productDetails.rating ? parseFloat(productDetails.rating) : null,
      category: selectedCategory,
      subCategory: subcategoryObj.id,
      size: isFashionCategory(selectedCategory) ? productDetails.size : null, // Include size only for fashion category
      gst: productDetails.gst ? parseFloat(productDetails.gst) : 0.00,
      gst_type: productDetails.gst_type || 'exclusive',
      enableSizes: enableSizes,
      sizes: enableSizes ? productSizes : [],
      stockQuantity: productDetails.stockQuantity ? parseInt(productDetails.stockQuantity) : 0,
      lowStockThreshold: productDetails.lowStockThreshold ? parseInt(productDetails.lowStockThreshold) : 5,
      isActive: productDetails.isActive,
      minOrderQuantity: productDetails.minOrderQuantity ? parseInt(productDetails.minOrderQuantity) : 1,
      maxOrderQuantity: productDetails.maxOrderQuantity ? parseInt(productDetails.maxOrderQuantity) : null,
      allow_cod: !!productDetails.allowCOD,
      allow_card: !!productDetails.allowCard,
      allow_upi: !!productDetails.allowUPI,
      allow_advance: !!productDetails.allowAdvance,
      advance_payment_type: productDetails.allowAdvance ? advanceType : null,
      advance_payment_value: productDetails.allowAdvance ? boundedAdvance : null
    };

    // Log the exact data being sent for debugging
    console.log('Submitting product data:', JSON.stringify(productData, null, 2));
    console.log('Selected category:', selectedCategory);
    console.log('Selected subcategory object:', subcategoryObj);

    let productId = id;
    let response;

    // Create or update product
    try {
      if (id) {
        // Update existing product
        response = await axios.put(`${BASE_URL}/api/products/${id}`, productData);
        console.log('Product update response:', response.data);
      } else {
        // Create new product
        response = await axios.post(`${BASE_URL}/api/products`, productData);
        console.log('Product creation response:', response.data);
        productId = response.data.id;

        if (!productId) {
          console.error('No product ID returned from API');
          throw new Error('Failed to get product ID from API response');
        }
      }
    } catch (error) {
      console.error('Error saving product data:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        throw new Error(`Server error: ${error.response.data.message || error.response.statusText || 'Unknown error'}`);
      } else if (error.request) {
        console.error('No response received:', error.request);
        throw new Error('Server did not respond. Please check your network connection.');
      } else {
        console.error('Request error:', error.message);
        throw new Error(`Request failed: ${error.message}`);
      }
    }

    // Handle image uploads for both new and existing products
    if (productId) {
      try {
        // Find images that need to be uploaded (those with 'file' property)
        const newImages = images.filter(img => img.file);

        if (newImages.length > 0) {
          console.log(`Uploading ${newImages.length} new images for product ID:`, productId);

          const formData = new FormData();
          formData.append('productId', productId);

          newImages.forEach((image, index) => {
            formData.append('images', image.file);
            formData.append('orderNumbers', index);
          });

          const imageResponse = await axios.post(`${BASE_URL}/api/products/upload-images`, formData);
          console.log('Image upload response:', imageResponse.data);

          // Show success message for image uploads
          setImageActionSuccess("Images uploaded successfully");
        }
      } catch (imageError) {
        console.error('Error uploading images:', imageError);
        console.error('Response data:', imageError.response?.data);
        setImageActionError("Failed to upload some images. The product was saved, but you may need to try uploading images again.");
        // Continue with specs even if image upload fails
      }
    }

    // Save specifications
    if (productId && Object.keys(specifications).length > 0) {
      try {
        // For new products, always save specifications
        if (!id) {
          console.log(`Saving ${Object.keys(specifications).length} specifications for new product ID:`, productId);

          // Prepare specifications data
          const specsData = Object.keys(specifications).map(specKeyId => ({
            specKeyId: parseInt(specKeyId, 10),
            value: specifications[specKeyId]
          }));

          // Send specifications to API
          const specResponse = await axios.post(`${BASE_URL}/api/productspecifications`, {
            productId,
            specs: specsData
          });

          console.log('Specifications save response:', specResponse.data);
        } else {
          // For existing products, check if specifications have changed
          const haveSpecsChanged = () => {
            // Check if the number of specifications has changed
            if (Object.keys(specifications).length !== Object.keys(originalSpecifications).length) {
              return true;
            }

            // Check if any specification values have changed
            for (const specId in specifications) {
              if (specifications[specId] !== originalSpecifications[specId]) {
                return true;
              }
            }

            // Check if any specifications have been removed
            for (const specId in originalSpecifications) {
              if (!specifications.hasOwnProperty(specId)) {
                return true;
              }
            }

            return false;
          };

          if (haveSpecsChanged()) {
            console.log('Specifications have changed, updating...');

            // Prepare specifications data
            const specsData = Object.keys(specifications).map(specKeyId => ({
              specKeyId: parseInt(specKeyId, 10),
              value: specifications[specKeyId]
            }));

            // Send specifications to API
            const specResponse = await axios.post(`${BASE_URL}/api/productspecifications`, {
              productId,
              specs: specsData
            });

            console.log('Specifications update response:', specResponse.data);
          } else {
            console.log('Specifications unchanged, skipping update');
          }
        }
      } catch (specError) {
        console.error('Error saving specifications:', specError);
        console.error('Response data:', specError.response?.data);
        // Don't throw, continue with success
      }
    } else if (id && Object.keys(specifications).length === 0 && Object.keys(originalSpecifications).length > 0) {
      // Handle case where all specifications have been removed
      try {
        console.log('All specifications removed, clearing from database');

        // Send empty specifications array to API
        const specResponse = await axios.post(`${BASE_URL}/api/productspecifications`, {
          productId,
          specs: []
        });

        console.log('Specifications clear response:', specResponse.data);
      } catch (specError) {
        console.error('Error clearing specifications:', specError);
        console.error('Response data:', specError.response?.data);
      }
    }

    // Save sizes if enabled
    if (productId && enableSizes && productSizes.length > 0) {
      try {
        console.log(`Saving ${productSizes.length} sizes for product ID:`, productId);
        console.log('enableSizes:', enableSizes);
        console.log('productSizes:', productSizes);
        await saveSizes(productId);
        console.log('Sizes saved successfully');
      } catch (sizeError) {
        console.error('Error saving sizes:', sizeError);
        toast.error('Failed to save sizes, but product was created');
        // Don't throw, continue with success
      }
    } else {
      console.log('Skipping size save:', { productId, enableSizes, sizesLength: productSizes.length });
    }

    // Show success message
    toast.success('Product saved successfully!');

    // Navigate to product list on success
    navigate('/admin/products/list');

    // Set current date timestamp in localStorage to indicate a product change happened
    localStorage.setItem('lastProductChange', Date.now().toString());
  };

  // Handle category change
  const handleCategoryChange = (e) => {
    const categoryId = e.target.value;
    setSelectedCategory(categoryId);
    setSelectedSubcategory(''); // Reset subcategory when category changes
    setSpecifications({}); // Clear specifications
    setEnabledSpecs({}); // Clear enabled specs
  };

  // If we're at /admin/products/list, show the list view
  if (location.pathname === '/admin/products/list') {
    return <Outlet />;
  }

  // Otherwise show the add product form
  return (
    <div className="relative p-3 sm:p-6 pb-24 sm:pb-6 bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm min-h-screen border border-gray-100">
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-0 mb-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center flex-wrap">
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {id ? 'Edit Product' : 'Add Product'}
            </span>
            <span className="ml-2 sm:ml-4 px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-600">Admin</span>
          </h2>
          <p className="text-sm sm:text-base text-gray-500 mt-1 sm:mt-2">Complete the form below to {id ? 'update' : 'add'} a product</p>
        </div>

        {!id && (
          <div className="w-full sm:w-auto">
            {/* Mobile: collapse tools to save vertical space */}
            <details className="sm:hidden rounded-lg border border-gray-200 bg-white/70">
              <summary className="list-none px-3 py-2 text-sm text-gray-700 cursor-pointer flex items-center justify-between">
                <span>Bulk actions</span>
                <span className="text-gray-400">▾</span>
              </summary>
              <div className="p-2 pt-0 flex flex-col gap-2">
                <button
                  onClick={downloadExcelTemplate}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Download Template
                </button>
                <button
                  onClick={() => setShowExcelImportModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Import Excel
                </button>
              </div>
            </details>

            {/* Desktop: show actions inline */}
            <div className="hidden sm:flex gap-2">
              <button
                onClick={downloadExcelTemplate}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <Upload className="h-4 w-4" />
                Download Template
              </button>
              <button
                onClick={() => setShowExcelImportModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Upload className="h-4 w-4" />
                Import Excel
              </button>
            </div>
          </div>
        )}
      </div>

      {saveError && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg mb-4 border border-red-200">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
            <span className="font-medium">Error: </span>
            <span className="ml-1">{saveError}</span>
          </div>
        </div>
      )}

      {imageActionError && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-start border border-red-100">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          <p>{imageActionError}</p>
        </div>
      )}

      {imageActionSuccess && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-start border border-green-100">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          <p>{imageActionSuccess}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Left section (spans 2 columns) */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 text-black px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
              <h5 className="text-lg font-semibold text-gray-700">Product Details</h5>
            </div>

            <div className="p-4 sm:p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Images</label>

                {/* Image gallery section */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image.preview}
                        alt={`Product preview ${index + 1}`}
                        className="w-full h-20 sm:h-24 object-cover rounded-lg"
                        onError={(e) => {
                          console.error("Image load error:", e);
                          e.target.src = 'https://via.placeholder.com/150?text=Image+Not+Found';
                        }}
                      />
                      <div className="absolute top-1 right-1 flex space-x-1">
                        {image.id && (
                          <button
                            onClick={() => setImageToUpdate(image.id)}
                            className="bg-yellow-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Update image"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => removeImage(index)}
                          className="bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove image"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      {/* Order number badge */}
                      {image.id && (
                        <div className="absolute top-0 left-0 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-br-md">
                          {image.orderNumber || index + 1}
                        </div>
                      )}
                      {/* New image indicator */}
                      {image.file && !image.id && (
                        <div className="absolute bottom-0 right-0 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-tl-md">
                          New
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Upload new image box */}
                  {images.length < 4 && (
                    <label className="border-2 border-dashed border-gray-300 rounded-lg p-3 sm:p-4 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors">
                      <Upload className="h-8 w-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">Upload Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        multiple
                      />
                    </label>
                  )}
                </div>

                {/* Image management message */}
                <div className="text-sm text-gray-500 mb-4">
                  {/* Desktop/Tablet detailed text */}
                  <div className="hidden sm:block">
                    {id ? (
                      <p>
                        You can both update existing images or add new ones (maximum 4 images total).
                        <span className="block mt-1 font-medium text-blue-600">
                          New images will be uploaded when you save the product.
                        </span>
                      </p>
                    ) : (
                      <p>You can add up to 4 product images. Images will be uploaded when you save the product.</p>
                    )}
                  </div>
                  {/* Mobile concise hint */}
                  <div className="sm:hidden text-xs text-gray-600">
                    {id ? 'Max 4 images. Uploads apply on Save.' : 'Max 4 images. Uploads on Save.'}
                  </div>
                </div>

                {/* Image update UI */}
                {imageToUpdate && (
                  <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <h4 className="text-md font-medium text-blue-600 mb-2">Update Image</h4>
                    <p className="text-sm text-gray-600 mb-3">Select a new image to replace the current one.</p>
                    <div className="mb-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => {
                          setImageToUpdate(null);
                          setNewImageFile(null);
                        }}
                        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        disabled={imageActionLoading}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleUpdateImage(imageToUpdate)}
                        className="px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                        disabled={imageActionLoading || !newImageFile}
                      >
                        {imageActionLoading ? (
                          <span className="flex items-center">
                            <RefreshCw className="animate-spin -ml-1 mr-2 h-4 w-4" />
                            Updating...
                          </span>
                        ) : (
                          'Update Image'
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                  <select
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300"
                    value={selectedCategory || ''}
                    onChange={handleCategoryChange}
                    disabled={loading}
                  >
                    <option value="">Select Category</option>
                    {mainCategories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="relative flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">Subcategory <span className="text-red-500">*</span></label>
                    <button
                      type="button"
                      onClick={() => handleOpenSubcategoryModal()}
                      disabled={!selectedCategory}
                      className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add New
                    </button>

                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      className="flex-1 px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300"
                      value={selectedSubcategory}
                      onChange={handleSubcategoryChange}
                      disabled={!selectedCategory || subcategories.length === 0}
                    >
                      <option value="">
                        {!selectedCategory
                          ? "Select Category First"
                          : subcategories.length === 0
                            ? "No subcategories available"
                            : "Select Subcategory"
                        }
                      </option>
                      {subcategories.map(sub => (
                        <option key={sub.id} value={sub.name}>{sub.name}</option>
                      ))}
                    </select>
                    {selectedSubcategory && (
                      <div className="flex gap-1 sm:items-center">
                        <button
                          type="button"
                          onClick={() => {
                            const subcategory = subcategories.find(sub => sub.name === selectedSubcategory);
                            if (subcategory) handleOpenSubcategoryModal(subcategory);
                          }}
                          className="p-2 sm:px-3 sm:py-2 bg-blue-100 text-blue-600 rounded-md sm:rounded-lg hover:bg-blue-200 transition-colors text-sm"
                          title="Edit subcategory"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const subcategory = subcategories.find(sub => sub.name === selectedSubcategory);
                            if (subcategory && window.confirm(`Are you sure you want to delete the subcategory "${subcategory.name}"?`)) {
                              deleteSubcategory(subcategory.id);
                            }
                          }}
                          className="p-2 sm:px-3 sm:py-2 bg-red-100 text-red-600 rounded-md sm:rounded-lg hover:bg-red-200 transition-colors text-sm"
                          title="Delete subcategory"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                    
                  </div>
                   {showSubcategoryModal && (
                      <div className="fixed inset-0 bg-white/60 backdrop-blur-sm h-full flex items-start justify-center z-50 overflow-auto">
                        <div className="mt-10 bg-white h-[80vh] w-full max-w-md rounded-2xl p-4 sm:p-6 mx-4 relative shadow-lg border border-gray-100" role="dialog" aria-modal="true">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {editingSubcategory ? 'Edit Subcategory' : 'Add New Subcategory'}
                            </h3>
                            <button
                              onClick={handleCloseSubcategoryModal}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>

                          <form onSubmit={handleSubcategorySubmit}>
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Main Category <span className="text-red-500">*</span>
                                </label>
                                <select
                                  name="maincategoryid"
                                  value={subcategoryFormData.maincategoryid}
                                  onChange={handleSubcategoryFormChange}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300"
                                  required
                                >
                                  <option value="">Select Main Category</option>
                                  {mainCategories.map(category => (
                                    <option key={category.id} value={category.id}>
                                      {category.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Subcategory Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  name="name"
                                  value={subcategoryFormData.name}
                                  onChange={handleSubcategoryFormChange}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300"
                                  placeholder="Enter subcategory name"
                                  required
                                />
                              </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                              <button
                                type="button"
                                onClick={handleCloseSubcategoryModal}
                                className="px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                                disabled={subcategoryLoading}
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 flex items-center gap-2"
                                disabled={subcategoryLoading}
                              >
                                {subcategoryLoading ? (
                                  <>
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    {editingSubcategory ? 'Updating...' : 'Creating...'}
                                  </>
                                ) : (
                                  editingSubcategory ? 'Update Subcategory' : 'Create Subcategory'
                                )}
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={productDetails.name}
                    onChange={(e) => handleProductDetailsChange('name', e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300"
                    placeholder="Enter product name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={productDetails.price}
                    onChange={(e) => handleProductDetailsChange('price', e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300"
                    placeholder="Enter price"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MRP</label>
                  <input
                    type="number"
                    value={productDetails.mrp}
                    onChange={(e) => handleProductDetailsChange('mrp', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300"
                    placeholder="Enter MRP (Maximum Retail Price)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                  <input
                    type="text"
                    value={productDetails.rating}
                    onChange={(e) => handleProductDetailsChange('rating', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300"
                    placeholder="Enter rating"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                  <input
                    type="text"
                    value={productDetails.brand}
                    onChange={(e) => handleProductDetailsChange('brand', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300"
                    placeholder="Enter brand name"
                  />
                </div>
                {/* GST Value */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GST (%) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={productDetails.gst}
                    onChange={(e) => handleProductDetailsChange('gst', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300"
                    placeholder="Enter GST percentage (e.g. 18)"
                    required
                  />
                </div>
                {/* GST Type (Inclusive/Exclusive) */}
                <div className="flex flex-col justify-end">
                  <label className="block text-sm font-medium text-gray-700 mb-1">GST Type <span className="text-red-500">*</span></label>
                  <div className="flex items-center gap-4 mt-1">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="gst_type"
                        value="inclusive"
                        checked={productDetails.gstType === 'inclusive'}
                        onChange={(e) => {
                          handleProductDetailsChange('gst_type', 'inclusive');
                          handleProductDetailsChange('gstType', 'inclusive');
                        }}
                        className="form-radio text-blue-600"
                      />
                      <span className="ml-2">Inclusive Tax</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="gst_type"
                        value="exclusive"
                        checked={productDetails.gstType === 'exclusive'}
                        onChange={(e) => {
                          handleProductDetailsChange('gst_type', 'exclusive');
                          handleProductDetailsChange('gstType', 'exclusive');
                        }}
                        className="form-radio text-blue-600"
                      />
                      <span className="ml-2">Exclusive Tax</span>
                    </label>
                  </div>
                </div>

                {/* Size Management Section */}
                <div className="col-span-2">
                  <div className="flex items-center space-x-2 mb-3">
                    <input
                      type="checkbox"
                      id="enableSizes"
                      checked={enableSizes}
                      onChange={(e) => setEnableSizes(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="enableSizes" className="text-sm font-medium text-gray-700">
                      Do you want to add sizes for this product?
                    </label>
                    {isFashionCategory(selectedCategory) && (
                      <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                        Recommended for fashion products
                      </span>
                    )}
                  </div>

                  {enableSizes && (
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-700">Size Management</h4>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              // Check if we already have sizes of a different type
                              if (productSizes.length > 0 && productSizes[0].size_type !== 'clothing') {
                                toast.error(`Cannot add clothing sizes. Current type: ${productSizes[0].size_type}`);
                                return;
                              }

                              const commonSizes = ['S', 'M', 'L', 'XL', 'XXL'];
                              const existingSizeValues = productSizes.map(size => size.size_value);
                              const newSizes = commonSizes.filter(size => !existingSizeValues.includes(size));

                              if (newSizes.length === 0) {
                                toast.info('All common sizes already added');
                                return;
                              }

                              const sizesToAdd = newSizes.map((sizeValue, index) => ({
                                size_type: 'clothing',
                                size_value: sizeValue,
                                display_order: productSizes.length + index,
                                is_available: true,
                                id: Date.now() + index
                              }));
                              setProductSizes(prev => [...prev, ...sizesToAdd]);
                              toast.success(`Added ${newSizes.length} clothing sizes: ${newSizes.join(', ')}`);
                            }}
                            disabled={productSizes.length > 0 && productSizes[0].size_type !== 'clothing'}
                            className={`px-2 py-1 text-xs rounded transition-colors ${productSizes.length > 0 && productSizes[0].size_type !== 'clothing'
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              }`}
                          >
                            + Common Sizes
                          </button>
                        </div>
                      </div>

                      {/* Base Price Information */}
                      {(productDetails.price || productDetails.mrp) && (
                        <div className="mb-4 p-3 bg-green-50 rounded border border-green-200">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-green-700">Base Product Price:</span>
                            <span className="text-sm font-bold text-green-800">₹{parseFloat(productDetails.price || 0).toFixed(2)}</span>
                          </div>
                          {productDetails.mrp && parseFloat(productDetails.mrp) !== parseFloat(productDetails.price || 0) && (
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-xs text-green-600">Base MRP:</span>
                              <span className="text-xs text-green-700">₹{parseFloat(productDetails.mrp).toFixed(2)}</span>
                            </div>
                          )}
                          <div className="mt-2 text-xs text-green-600">
                            💡 Size prices will be calculated based on this base price
                          </div>
                        </div>
                      )}

                      {/* Add New Size */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Size Type</label>
                          <select
                            value={newSize.size_type}
                            onChange={(e) => setNewSize(prev => ({ ...prev, size_type: e.target.value }))}
                            disabled={productSizes.length > 0}
                            className={`w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-300 ${productSizes.length > 0 ? 'bg-gray-100 cursor-not-allowed' : ''
                              }`}
                          >
                            <option value="clothing">Clothing (S,M,L,XL)</option>
                            <option value="shoes">Shoes (4,5,6,7,8)</option>
                            <option value="weight">Weight (kg)</option>
                            <option value="custom">Custom</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Size Value</label>
                          <input
                            type="text"
                            value={newSize.size_value}
                            onChange={(e) => setNewSize(prev => ({ ...prev, size_value: e.target.value }))}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-300"
                            placeholder="Enter size (e.g., M or M,L,XL)"
                          />
                        </div>

                        {/* Pricing Options */}
                        <div className="col-span-2 border-t pt-3 mt-2">
                          <label className="block text-xs font-medium text-gray-600 mb-2">Pricing for this size</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Price Type</label>
                              <select
                                value={newSize.price_modifier_type}
                                onChange={(e) => setNewSize(prev => ({ ...prev, price_modifier_type: e.target.value }))}
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-300"
                              >
                                <option value="none">Use Base Price</option>
                                <option value="fixed">Fixed Price</option>
                                <option value="percentage">% of Base Price</option>
                              </select>
                            </div>
                            {newSize.price_modifier_type === 'fixed' && (
                              <>
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Price (₹)</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={newSize.price}
                                    onChange={(e) => setNewSize(prev => ({ ...prev, price: e.target.value }))}
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-300"
                                    placeholder="0.00"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">MRP (₹)</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={newSize.mrp}
                                    onChange={(e) => setNewSize(prev => ({ ...prev, mrp: e.target.value }))}
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-300"
                                    placeholder="0.00"
                                  />
                                </div>
                              </>
                            )}
                            {newSize.price_modifier_type === 'percentage' && (
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Percentage (%)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={newSize.price_modifier_value}
                                  onChange={(e) => setNewSize(prev => ({ ...prev, price_modifier_value: e.target.value }))}
                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-300"
                                  placeholder="100.00"
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center">
                          <label className="inline-flex items-center mt-4">
                            <input
                              type="checkbox"
                              checked={newSize.is_available}
                              onChange={(e) => setNewSize(prev => ({ ...prev, is_available: e.target.checked }))}
                              className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-1 text-xs text-gray-600">Available</span>
                          </label>
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={addSize}
                            className="w-full px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                          >
                            Add Size
                          </button>
                        </div>
                      </div>

                      {/* Price Preview for New Size */}
                      {newSize.size_value && productDetails.price && (
                        <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
                          <div className="text-xs font-medium text-yellow-700 mb-1">Preview for "{newSize.size_value}":</div>
                          <div className="text-sm font-bold text-yellow-800">
                            {(() => {
                              const preview = calculateSizePrice(newSize);
                              return preview.displayText;
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Size List */}
                      {productSizes.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="text-xs font-medium text-gray-600">Added Sizes:</h5>
                          {productSizes.map((size, index) => {
                            const calculatedPrice = calculateSizePrice(size);
                            return (
                            <div key={index} className="p-3 bg-white rounded border border-gray-200">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Type</label>
                                  <select
                                    value={size.size_type}
                                    onChange={(e) => updateSize(index, 'size_type', e.target.value)}
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-300"
                                  >
                                    <option value="clothing">Clothing</option>
                                    <option value="shoes">Shoes</option>
                                    <option value="weight">Weight</option>
                                    <option value="custom">Custom</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Size</label>
                                  <input
                                    type="text"
                                    value={size.size_value}
                                    onChange={(e) => updateSize(index, 'size_value', e.target.value)}
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-300"
                                    placeholder="Size value"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Stock</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={Number.isFinite(parseInt(size.stock_quantity, 10)) ? parseInt(size.stock_quantity, 10) : 0}
                                    onChange={(e) => updateSize(index, 'stock_quantity', e.target.value)}
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-300"
                                    placeholder="0"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Price Type</label>
                                  <select
                                    value={size.price_modifier_type || 'none'}
                                    onChange={(e) => updateSize(index, 'price_modifier_type', e.target.value)}
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-300"
                                  >
                                    <option value="none">Use Base</option>
                                    <option value="fixed">Fixed</option>
                                    <option value="percentage">%</option>
                                  </select>
                                </div>
                                <div className="flex items-end gap-1">
                                  <label className="inline-flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={size.is_available}
                                      onChange={(e) => updateSize(index, 'is_available', e.target.checked)}
                                      className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <span className="ml-1 text-xs text-gray-600">Available</span>
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => removeSize(index)}
                                    className="p-1 text-red-500 hover:text-red-700 transition-colors"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>

                              {/* Dynamic Price Display */}
                              <div className="mb-2 p-2 bg-blue-50 rounded border border-blue-200">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-medium text-blue-700">Final Price:</span>
                                  <span className="text-sm font-bold text-blue-800">{calculatedPrice.displayText}</span>
                                </div>
                                {calculatedPrice.mrp !== calculatedPrice.price && (
                                  <div className="flex justify-between items-center mt-1">
                                    <span className="text-xs text-blue-600">MRP:</span>
                                    <span className="text-xs text-blue-700">₹{calculatedPrice.mrp.toFixed(2)}</span>
                                  </div>
                                )}
                              </div>

                              {/* Pricing Fields */}
                              {(size.price_modifier_type === 'fixed' || size.price_modifier_type === 'percentage') && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                                  {size.price_modifier_type === 'fixed' ? (
                                    <>
                                      <div>
                                        <label className="block text-xs text-gray-500 mb-1">Price (₹)</label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={size.price || ''}
                                          onChange={(e) => updateSize(index, 'price', e.target.value)}
                                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-300"
                                          placeholder="0.00"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-gray-500 mb-1">MRP (₹)</label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={size.mrp || ''}
                                          onChange={(e) => updateSize(index, 'mrp', e.target.value)}
                                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-300"
                                          placeholder="0.00"
                                        />
                                      </div>
                                    </>
                                  ) : (
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-1">Percentage (%)</label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={size.price_modifier_value || ''}
                                        onChange={(e) => updateSize(index, 'price_modifier_value', e.target.value)}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-300"
                                        placeholder="100.00"
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Size Summary */}
                      {productSizes.length > 0 && (
                        <div className="mt-4 p-3 bg-gray-100 rounded border border-gray-300">
                          <h6 className="text-xs font-medium text-gray-700 mb-2">Size & Price Summary:</h6>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {productSizes.map((size, index) => {
                              const calculatedPrice = calculateSizePrice(size);
                              return (
                                <div key={index} className="text-xs bg-white p-2 rounded border">
                                  <div className="font-medium text-gray-800">{size.size_value}</div>
                                  <div className="text-blue-600">₹{calculatedPrice.price.toFixed(2)}</div>
                                  <div className="text-gray-500 text-xs">
                                    {size.price_modifier_type === 'none' ? 'Base' : 
                                     size.price_modifier_type === 'fixed' ? 'Fixed' : 
                                     `${size.price_modifier_value}%`}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-gray-500 mt-2">
                        💡 <strong>Tip:</strong> You can add multiple sizes at once by separating them with commas (e.g., "M,L,XL,XXL").
                        Examples: Clothing (S,M,L), Shoes (4,5,6), Weight (2kg,5kg)
                      </p>
                    </div>
                  )}
                </div>
                
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={productDetails.description}
                  onChange={(e) => handleProductDetailsChange('description', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300"
                  rows={4}
                  placeholder="Enter product description"
                ></textarea>
              </div>

              {/* Stock Management Section */}
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-md font-semibold text-gray-800 mb-3">Stock Management</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
                    <input
                      type="number"
                      value={productDetails.stockQuantity}
                      onChange={(e) => handleProductDetailsChange('stockQuantity', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300"
                      placeholder="Enter stock quantity"
                      min="0"
                      disabled={enableSizes}
                    />
                    {enableSizes && (
                      <p className="mt-1 text-xs text-gray-600">Auto-calculated from sizes. Edit stock per size above.</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Threshold</label>
                    <input
                      type="number"
                      value={productDetails.lowStockThreshold}
                      onChange={(e) => handleProductDetailsChange('lowStockThreshold', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300"
                      placeholder="Enter low stock threshold"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Order Quantity</label>
                    <input
                      type="number"
                      value={productDetails.minOrderQuantity}
                      onChange={(e) => handleProductDetailsChange('minOrderQuantity', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300"
                      placeholder="Enter minimum order quantity"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Order Quantity</label>
                    <input
                      type="number"
                      value={productDetails.maxOrderQuantity}
                      onChange={(e) => handleProductDetailsChange('maxOrderQuantity', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300"
                      placeholder="Enter maximum order quantity (optional)"
                      min="1"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={productDetails.isActive}
                        onChange={(e) => handleProductDetailsChange('isActive', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="isActive" className="ml-2 text-sm font-medium text-gray-700">
                        Product is active and available for sale
                      </label>
                    </div>
                  </div>
                </div>
                {enableSizes && productSizes.length > 0 && (
                  <div className="mt-3 p-3 bg-white rounded border border-blue-200">
                    <div className="text-sm font-semibold text-gray-700 mb-1">Balance Stock</div>
                    <div className="text-sm text-gray-700">
                      {(productSizes || []).map((s) => `${s.size_value}=${parseInt(s.stock_quantity, 10) || 0}`).join('  ')}
                    </div>
                    <div className="text-sm text-gray-700 mt-1">
                      {(() => {
                        const currentTotal = (productSizes || []).reduce((sum, s) => sum + (parseInt(s.stock_quantity, 10) || 0), 0);
                        const initialTotal = (productSizes || []).reduce((sum, s) => {
                          const initVal = parseInt(s.initial_stock, 10);
                          return sum + (Number.isFinite(initVal) ? initVal : (parseInt(s.stock_quantity, 10) || 0));
                        }, 0);
                        return `total ${currentTotal}/${initialTotal}`;
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Methods Section */}
              <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h3 className="text-md font-semibold text-gray-800 mb-2">Payment Methods</h3>
                <p className="text-xs text-gray-600 mb-3">
                  Choose which payment options are allowed for this product. At checkout, only methods enabled for
                  all selected products will be shown to the customer.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-start space-x-2 text-sm text-gray-800">
                    <input
                      type="checkbox"
                      checked={!!productDetails.allowCOD}
                      onChange={(e) => handleProductDetailsChange('allowCOD', e.target.checked)}
                      className="mt-0.5 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <span>
                      <span className="font-medium">Cash on Delivery (COD)</span>
                      <span className="block text-xs text-gray-500">Customer pays the full amount in cash on delivery.</span>
                    </span>
                  </label>
                  <label className="flex items-start space-x-2 text-sm text-gray-800">
                    <input
                      type="checkbox"
                      checked={!!productDetails.allowCard}
                      onChange={(e) => handleProductDetailsChange('allowCard', e.target.checked)}
                      className="mt-0.5 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <span>
                      <span className="font-medium">Credit / Debit Card</span>
                      <span className="block text-xs text-gray-500">Pay online using cards via the payment gateway.</span>
                    </span>
                  </label>
                  <label className="flex items-start space-x-2 text-sm text-gray-800">
                    <input
                      type="checkbox"
                      checked={!!productDetails.allowUPI}
                      onChange={(e) => handleProductDetailsChange('allowUPI', e.target.checked)}
                      className="mt-0.5 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <span>
                      <span className="font-medium">UPI / Net Banking</span>
                      <span className="block text-xs text-gray-500">Instant online payment via UPI apps or net banking.</span>
                    </span>
                  </label>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between sm:col-span-2 gap-2">
                    <label className="flex items-start space-x-2 text-sm text-gray-800">
                      <input
                        type="checkbox"
                        checked={!!productDetails.allowAdvance}
                        onChange={(e) => handleProductDetailsChange('allowAdvance', e.target.checked)}
                        className="mt-0.5 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                      <span>
                        <span className="font-medium">Advance Payment (UPI now + COD balance)</span>
                        <span className="block text-xs text-gray-500">Customer pays an advance via UPI, remaining on delivery.</span>
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="px-3 py-1.5 text-xs rounded-md border border-gray-300 bg-white hover:bg-gray-50"
                        onClick={() => setShowAdvanceEditor((v) => !v)}
                        disabled={!productDetails.allowAdvance}
                      >
                        {showAdvanceEditor ? 'Close' : 'Edit'}
                      </button>
                      {productDetails.allowAdvance && productDetails.advancePaymentValue !== '' && (
                        <span className="text-[11px] px-2 py-1 rounded-full border border-purple-200 bg-purple-50 text-purple-700">
                          {productDetails.advancePaymentType === 'amount'
                            ? `₹${parseFloat(productDetails.advancePaymentValue)} now`
                            : `${parseFloat(productDetails.advancePaymentValue)}% now`}
                        </span>
                      )}
                    </div>
                  </div>
                  {productDetails.allowAdvance && showAdvanceEditor && (
                    <div className="sm:col-span-2 -mt-1 p-3 rounded border border-purple-200 bg-white">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Advance Type</label>
                          <select
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-300 text-sm"
                            value={productDetails.advancePaymentType}
                            onChange={(e) => handleProductDetailsChange('advancePaymentType', e.target.value)}
                          >
                            <option value="percentage">Percentage</option>
                            <option value="amount">Amount (₹)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Advance Value</label>
                          <input
                            type="number"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-300 text-sm"
                            placeholder={productDetails.advancePaymentType === 'percentage' ? 'e.g. 30 for 30%' : 'e.g. 100'}
                            min={productDetails.advancePaymentType === 'percentage' ? 1 : 0}
                            max={productDetails.advancePaymentType === 'percentage' ? 100 : undefined}
                            value={productDetails.advancePaymentValue}
                            onChange={(e) => handleProductDetailsChange('advancePaymentValue', e.target.value)}
                          />
                        </div>
                        <div className="text-xs text-gray-500 sm:col-span-1">
                          {productDetails.advancePaymentType === 'percentage'
                            ? 'Customer pays this % now via UPI; remaining on delivery.'
                            : 'Customer pays this fixed amount now via UPI; remaining on delivery.'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Specification Input Fields - Only shown for enabled specs */}
              {enabledSpecIds.length > 0 && (
                <div className="mt-4 border-t pt-4">
                  <h3 className="text-md font-semibold text-gray-800 mb-2">
                    Selected Specifications ({enabledSpecIds.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {enabledSpecIds.map(specId => {
                      const spec = specificationKeys.find(s => s.id === specId) ||
                        (Array.isArray(specificationKeys) ? null :
                          specificationKeys && specificationKeys.find(s => s.id === specId));

                      return spec ? (
                        <span
                          key={specId}
                          className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
                        >
                          {spec.name || spec.keyName}: {specifications[specId] || '(empty)'}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              <div className="mt-6">
                {/* Mobile sticky action bar */}
                <div className="sm:hidden fixed inset-x-0 bottom-0 bg-white/90 backdrop-blur border-t border-gray-200 p-3 z-40">
                  <button
                    type="submit"
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all duration-200 flex items-center justify-center gap-2 shadow"
                    disabled={!selectedSubcategory || !selectedCategory || !productDetails.name || !productDetails.price || saveLoading}
                    onClick={handleSubmit}
                  >
                    {saveLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      id ? 'Update Product' : 'Submit Product'
                    )}
                  </button>
                </div>

                {/* Desktop button */}
                <div className="hidden sm:block">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
                    disabled={!selectedSubcategory || !selectedCategory || !productDetails.name || !productDetails.price || saveLoading}
                    onClick={handleSubmit}
                  >
                    {saveLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      id ? 'Update Product' : 'Submit Product'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right section - Contains checkboxes for specifications */}
        <div>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 h-full">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 text-black px-6 py-4 border-b border-gray-100">
              <h5 className="text-lg font-semibold text-gray-700">Specifications</h5>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading specifications...</p>
                </div>
              ) : specificationKeys && specificationKeys.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-3">
                    Select specifications to add to this product:
                  </p>
                  {specificationKeys.map(spec => (
                    <div key={spec.id} className="py-3 border-b border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">{spec.name || spec.keyName}</span>
                        <input
                          type="checkbox"
                          id={`spec-${spec.id}`}
                          checked={!!enabledSpecs[spec.id]}
                          onChange={() => toggleSpecEnabled(spec.id)}
                          className="h-5 w-5 text-blue-600 focus:ring-blue-500 rounded cursor-pointer"
                        />
                      </div>

                      {/* Show input field immediately when checkbox is checked */}
                      {enabledSpecs[spec.id] && (
                        <input
                          type="text"
                          className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 text-sm"
                          placeholder={`Enter ${spec.name || spec.keyName}`}
                          value={specifications[spec.id] || ''}
                          onChange={(e) => handleSpecificationChange(spec.id, e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-gray-500">
                    {selectedSubcategory ?
                      `No specifications found for ${selectedSubcategory}.` :
                      "Select a subcategory to view specifications"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Subcategory Modal */}


      {/* Excel Import Modal */}
      <XlMigration 
        isOpen={showExcelImportModal} 
        onClose={() => setShowExcelImportModal(false)} 
      />


    </div>
  );
};

export default Products;
