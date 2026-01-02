// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import { Upload, Video, Eye, EyeOff, Save, X, Plus, Link, Clock, Tag, FileText, Image } from 'lucide-react';
// import { toast, Toaster } from 'react-hot-toast';
// import { BASE_URL } from '../../util';

// const Videos = () => {
//   const [formData, setFormData] = useState({
//     title: '',
//     description: '',
//     videoUrl: '',
//     thumbnailUrl: '',
//     duration: '',
//     category: 'general',
//     tags: '',
//     isActive: true,
//     orderNumber: 0,
//     productId: '',
//     price: '',
//     mrp: '',
//   });

//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [videoPreview, setVideoPreview] = useState(null);
//   const [categories, setCategories] = useState([]);
//   const [customCategory, setCustomCategory] = useState('');
//   const [showCustomCategory, setShowCustomCategory] = useState(false);
//   const [allProducts, setAllProducts] = useState([]);
//   const [filteredProducts, setFilteredProducts] = useState([]);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [uploadMethod, setUploadMethod] = useState('url');
//   const [videoFile, setVideoFile] = useState(null);
//   const [thumbnailFile, setThumbnailFile] = useState(null);
//   const [uploadProgress, setUploadProgress] = useState(0);
//   const [isThumbnailVideo, setIsThumbnailVideo] = useState(false);

//   const predefinedCategories = [
//     'general',
//     'product-demo',
//     'tutorial',
//     'promotional',
//     'testimonial',
//     'behind-the-scenes',
//     'how-to',
//     'unboxing',
//     'review',
//   ];

//   // Helper function to get product name safely
//   const getProductName = (product) => {
//     if (!product) return '';
//     return product.productName || product.productname || product.name || '';
//   };

//   // Product selection handler
//   const handleProductSelect = (product) => {
//     try {
//       if (!product) {
//         setFormData(prev => ({
//           ...prev,
//           productId: '',
//           price: '',
//           mrp: ''
//         }));
//         setSearchTerm('');
//         return;
//       }

//       const productId = product.id || product.productId;
//       if (!productId) {
//         toast.error('Invalid product selected');
//         return;
//       }

//       setFormData(prev => ({
//         ...prev,
//         productId: productId.toString(),
//         price: product.price || '0',
//         mrp: product.mrp || '0'
//       }));
//       setSearchTerm(getProductName(product));
//       toast.success('Product linked successfully');
//     } catch (error) {
//       console.error('Error selecting product:', error);
//       toast.error('Failed to select product');
//     }
//   };

//   // Fetch products when component mounts
//   useEffect(() => {
//     fetchCategories();
//     fetchAllProducts();
//   }, []);

//   // Filter products based on search term
//   useEffect(() => {
//     if (searchTerm) {
//       const filtered = allProducts.filter(p => {
//         const productName = getProductName(p);
//         return productName.toLowerCase().includes(searchTerm.toLowerCase());
//       });
//       setFilteredProducts(filtered);
//     } else {
//       setFilteredProducts([]);
//     }
//   }, [searchTerm, allProducts]);

//   // Fetch all products from API
//   const fetchAllProducts = async () => {
//     try {
//       const response = await axios.get(`${BASE_URL}/api/products`);
//       if (response.data && Array.isArray(response.data)) {
//         setAllProducts(response.data);
//       } else {
//         console.error("Invalid response format for products:", response.data);
//         toast.error('Failed to load products: Invalid data format.');
//       }
//     } catch (error) {
//       console.error('Error fetching products:', error);
//       toast.error('Failed to load products.');
//     }
//   };

//   // Form submission handler
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError(null);
//     setLoading(true);
    
//     try {
//       let response;
//       if (uploadMethod === 'file' && (videoFile || thumbnailFile)) {
//         const formDataToSend = new FormData();
//         formDataToSend.append('title', formData.title);
//         formDataToSend.append('description', formData.description);
//         formDataToSend.append('duration', formData.duration || '');
//         formDataToSend.append('category', formData.category);
//         formDataToSend.append('tags', formData.tags);
//         formDataToSend.append('isActive', formData.isActive);
//         formDataToSend.append('orderNumber', formData.orderNumber || 0);
//         formDataToSend.append('productId', formData.productId || '');
//         formDataToSend.append('price', formData.price || '0');
//         formDataToSend.append('mrp', formData.mrp || '0');

//         if (videoFile) {
//           formDataToSend.append('videoFile', videoFile);
//         }
//         if (thumbnailFile) {
//           formDataToSend.append('thumbnailFile', thumbnailFile);
//         }

//         response = await axios.post(`${BASE_URL}/videos/upload`, formDataToSend, {
//           headers: { 'Content-Type': 'multipart/form-data' },
//           onUploadProgress: (progressEvent) => {
//             const percentCompleted = Math.round(
//               (progressEvent.loaded * 100) / progressEvent.total
//             );
//             setUploadProgress(percentCompleted);
//           },
//         });
//       } else {
//         const videoUrl = formData.videoUrl;
//         const thumbnailUrl = formData.thumbnailUrl;

//         response = await axios.post(`${BASE_URL}/videos`, {
//           ...formData,
//           videoUrl,
//           thumbnailUrl,
//           duration: formData.duration ? parseInt(formData.duration) : null,
//           orderNumber: formData.orderNumber ? parseInt(formData.orderNumber) : 0,
//           tags: formData.tags.split(',').map(tag => tag.trim()),
//           productId: formData.productId || null
//         });
//       }

//       if (response.data.success) {
//         toast.success('Video added successfully!');
//         resetForm();
//       } else {
//         setError(response.data.message || 'Failed to add video');
//         toast.error(response.data.message || 'Failed to add video');
//       }
//     } catch (error) {
//       console.error('Error adding video:', error);
//       const errorMessage = error.response?.data?.message || 'Failed to add video';
//       setError(errorMessage);
//       toast.error(errorMessage);
//     } finally {
//       setLoading(false);
//       setUploadProgress(0);
//     }
//   };

//   // Reset form to initial state
//   const resetForm = () => {
//     setFormData({
//       title: '',
//       description: '',
//       videoUrl: '',
//       thumbnailUrl: '',
//       duration: '',
//       category: 'general',
//       tags: '',
//       isActive: true,
//       orderNumber: 0,
//       productId: '',
//       price: '',
//       mrp: '',
//     });
//     setVideoPreview(null);
//     setCustomCategory('');
//     setShowCustomCategory(false);
//     setVideoFile(null);
//     setThumbnailFile(null);
//     setUploadProgress(0);
//     setError(null);
//     setSearchTerm('');
//   };

//   return (
//     <div className="min-h-screen bg-gray-50 py-8">
//       <Toaster position="top-right" />
      
//       <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
//         <div className="bg-white rounded-lg shadow-lg overflow-hidden">
//           <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
//             <div className="flex items-center">
//               <Video className="h-8 w-8 text-white mr-3" />
//               <h1 className="text-2xl font-bold text-white">Add New Video</h1>
//             </div>
//           </div>

//           <form onSubmit={handleSubmit} className="p-6 space-y-6">
//             {error && (
//               <div className="bg-red-50 border border-red-200 rounded-md p-4">
//                 <div className="flex">
//                   <X className="h-5 w-5 text-red-400" />
//                   <div className="ml-3">
//                     <p className="text-sm text-red-800">{error}</p>
//                   </div>
//                 </div>
//               </div>
//             )}

//             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//               {/* Product Search */}
//               <div>
//                 <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
//                   <Link className="h-4 w-4 mr-2" />
//                   Link Product (Optional)
//                 </label>
//                 <div className="relative">
//                   <input
//                     type="text"
//                     placeholder="Search for a product..."
//                     value={searchTerm}
//                     onChange={(e) => setSearchTerm(e.target.value)}
//                     className={`w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
//                       formData.productId ? 'border-green-500' : 'border-gray-300'
//                     }`}
//                   />
//                   {formData.productId && (
//                     <div className="absolute right-2 top-2">
//                       <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
//                         Product Selected
//                       </span>
//                     </div>
//                   )}
//                   {filteredProducts.length > 0 && (
//                     <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
//                       <ul className="py-1 max-h-60 overflow-auto">
//                         {filteredProducts.map((product) => (
//                           <li
//                             key={product.id}
//                             className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
//                             onClick={() => handleProductSelect(product)}
//                           >
//                             {product.imageUrl && (
//                               <img
//                                 src={`${BASE_URL}${product.imageUrl}`}
//                                 alt={getProductName(product)}
//                                 className="w-8 h-8 object-cover rounded-md mr-2"
//                               />
//                             )}
//                             <div>
//                               <div className="font-medium">{getProductName(product)}</div>
//                               <div className="text-sm text-gray-500">₹{product.price}</div>
//                             </div>
//                           </li>
//                         ))}
//                       </ul>
//                     </div>
//                   )}
//                 </div>
//               </div>

//               {/* Other form fields */}
//               {/* Add your existing form fields here */}
//             </div>

//             {/* Submit Button */}
//             <div className="mt-6 flex items-center justify-end space-x-4">
//               <button
//                 type="button"
//                 onClick={resetForm}
//                 className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
//               >
//                 Reset
//               </button>
//               <button
//                 type="submit"
//                 disabled={loading}
//                 className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
//               >
//                 {loading ? (
//                   <>
//                     <span className="animate-spin">⏳</span>
//                     <span>Saving...</span>
//                   </>
//                 ) : (
//                   <>
//                     <Save className="h-5 w-5" />
//                     <span>Save Video</span>
//                   </>
//                 )}
//               </button>
//             </div>
//           </form>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Videos;
