import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, ShieldCheck, Edit, Trash2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { BASE_URL } from '../../util';

const CategoryView = () => {
  const [subcategories, setSubcategories] = useState([]);
  const [mainCategories, setMainCategories] = useState([]);
  const [allMainCategories, setAllMainCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [editedName, setEditedName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [subcategoryToDelete, setSubcategoryToDelete] = useState(null);
  const [saveMessage, setSaveMessage] = useState(null);
  const itemsPerPage = 10;
  const user = JSON.parse(localStorage.getItem('user'));

  // Separate fetch for main categories
  useEffect(() => {
    const fetchMainCategories = async () => {
      try {
        // Fetch main categories
        const catResponse = await axios.get(`${BASE_URL}/api/categories`);
        const allMainCategories = catResponse.data.mainCategories || [];
        
        // Store all main categories regardless of selection
        setAllMainCategories(allMainCategories);
        
        // Get selected categories from localStorage (set by Maincategory component)
        const storedSelectedCategories = localStorage.getItem('selectedCategories');
        let filteredCategories = [];
        
        if (storedSelectedCategories) {
          const selectedCategoriesArray = JSON.parse(storedSelectedCategories);
          
          // Filter main categories to only include selected ones
          filteredCategories = allMainCategories.filter(category => 
            selectedCategoriesArray.includes(category.id)
          );
        }
        
        setMainCategories(filteredCategories);
      } catch (error) {
        console.error('Error fetching main categories:', error);
        setMainCategories([]);
        setAllMainCategories([]);
      }
    };
    
    fetchMainCategories();
    
    // Add event listener to detect changes in localStorage
    const handleStorageChange = (e) => {
      if (e.key === 'selectedCategories') {
        fetchMainCategories();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Fetch all subcategories - no filtering by main category anymore
  useEffect(() => {
    const fetchSubcategories = async () => {
      setLoading(true);
      try {
        // Fetch all subcategories
        const subcategoriesUrl = `${BASE_URL}/api/subcategories`;
        
        console.log("Fetching subcategories from:", subcategoriesUrl);
        
        const subResponse = await axios.get(subcategoriesUrl);
        const subResult = subResponse.data;
        
        // Support both 'subcategories' and 'subCategories' keys from API
        const subcats = subResult.subcategories || subResult.subCategories || [];
        console.log("Fetched subcategories:", subcats.length);
        
        if (Array.isArray(subcats)) {
          setSubcategories(subcats);
        } else {
          setSubcategories([]);
        }
      } catch (error) {
        console.error('Error fetching subcategories:', error);
        setSubcategories([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSubcategories();
  }, []); // Only run on mount

  // Handle edit subcategory
  const handleEditClick = (subcategory) => {
    setEditingSubcategory(subcategory.id);
    setEditedName(subcategory.name);
  };

  // Save edited subcategory
  const handleSaveEdit = async (subcategoryId) => {
    try {
      const response = await axios.put(`${BASE_URL}/api/subcategories/${subcategoryId}`, {
        name: editedName.trim()
      });
      if (response.status === 200) {
        // Update local state
        setSubcategories(prev => 
          prev.map(sub => 
            sub.id === subcategoryId ? { ...sub, name: editedName.trim() } : sub
          )
        );
        setEditingSubcategory(null);
        setSaveMessage("Subcategory updated successfully");
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        throw new Error('Failed to update subcategory');
      }
    } catch (error) {
      console.error('Error updating subcategory:', error);
      setSaveMessage("Error updating subcategory");
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingSubcategory(null);
    setEditedName('');
  };

  // Handle delete confirmation
  const handleDeleteClick = (subcategory) => {
    setSubcategoryToDelete(subcategory);
    setShowDeleteConfirm(true);
  };

  // Confirm delete subcategory
  const handleConfirmDelete = async () => {
    try {
      const response = await axios.delete(`${BASE_URL}/api/subcategories/${subcategoryToDelete.id}`);
      if (response.status === 200) {
        // Update local state
        setSubcategories(prev => prev.filter(sub => sub.id !== subcategoryToDelete.id));
        setShowDeleteConfirm(false);
        setSubcategoryToDelete(null);
        setSaveMessage("Subcategory deleted successfully");
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        throw new Error('Failed to delete subcategory');
      }
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      setSaveMessage("Error deleting subcategory");
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  // Cancel delete
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setSubcategoryToDelete(null);
  };

  // Get category name by ID - Updated to check all categories
  const getCategoryName = (categoryId) => {
    // First check in selected categories
    const category = mainCategories.find(cat => cat.id === categoryId);
    if (category) {
      return category.name;
    }
    
    // If not found in selected categories, check in all categories
    const allCategory = allMainCategories.find(cat => cat.id === categoryId);
    if (allCategory) {
      return allCategory.name;
    }
    
    // If still not found, return unknown
    return 'Unknown Category';
  };

  // Filter subcategories based on search term only - category filtering happens server-side
  const filteredSubcategories = subcategories.filter(subcategory => {
    return subcategory.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSubcategories = filteredSubcategories.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredSubcategories.length / itemsPerPage);

  // Format date function
  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleDateString() : 'N/A';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-3 sm:p-4 mt-12 sm:mt-0">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Subcategories Management
          </h1>
          <div className="ml-4 px-2 py-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-md text-white text-xs font-medium flex items-center">
            <ShieldCheck className="w-3 h-3 mr-1" />
            ADMIN
          </div>
        </div>
        
        {saveMessage && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-center border border-green-100">
            {saveMessage}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h5 className="text-lg font-semibold text-gray-700">Subcategory Management</h5>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <input
                    type="text"
                    className="pl-9 pr-4 py-2 border-1 border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-auto"
                    placeholder="Search subcategories..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {loading ? (
              <div className="flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <>
                {filteredSubcategories.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="mx-auto w-24 h-24 mb-6 bg-blue-50 rounded-full flex items-center justify-center">
                      <Search className="h-10 w-10 text-blue-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No subcategories found</h3>
                    <p className="text-gray-500 mb-6">Try changing your search criteria</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subcategory Name</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Main Category</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created Date</th>
                          <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {currentSubcategories.map((subcategory) => (
                          <tr 
                            key={subcategory.id} 
                            className="hover:bg-gray-50 transition-colors duration-150"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              {editingSubcategory === subcategory.id ? (
                                <input
                                  type="text"
                                  value={editedName}
                                  onChange={(e) => setEditedName(e.target.value)}
                                  className="w-full px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  autoFocus
                                />
                              ) : (
                                <div className="text-sm font-medium text-gray-900">{subcategory.name}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                {getCategoryName(subcategory.maincategoryid)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(subcategory.createdAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {editingSubcategory === subcategory.id ? (
                                <div className="flex items-center justify-center space-x-2">
                                  <button
                                    onClick={() => handleSaveEdit(subcategory.id)}
                                    disabled={!editedName.trim()}
                                    className="inline-flex items-center justify-center p-2 rounded-md text-green-600 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                                    title="Save"
                                  >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                    title="Cancel"
                                  >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center space-x-3">
                                  <button
                                    onClick={() => handleEditClick(subcategory)}
                                    className="inline-flex items-center justify-center p-2 rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    title="Edit Subcategory"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClick(subcategory)}
                                    className="inline-flex items-center justify-center p-2 rounded-md text-red-600 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                    title="Delete Subcategory"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                {filteredSubcategories.length > itemsPerPage && (
                  <div className="flex items-center justify-between mt-6 px-4 py-3 border-t border-gray-200 sm:px-6">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                          currentPage === 1 
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className={`ml-3 relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                          currentPage === totalPages 
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{" "}
                          <span className="font-medium">
                            {Math.min(indexOfLastItem, filteredSubcategories.length)}
                          </span>{" "}
                          of <span className="font-medium">{filteredSubcategories.length}</span> results
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                              currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            <span className="sr-only">Previous</span>
                            <ChevronLeft className="h-5 w-5" />
                          </button>
                          
                          {/* Page numbers */}
                          {[...Array(totalPages)].map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setCurrentPage(i + 1)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                currentPage === i + 1
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {i + 1}
                            </button>
                          ))}
                          
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                              currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            <span className="sr-only">Next</span>
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div 
            className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={(e) => {
              if (e.key === 'selectedCategories') {
                fetchMainCategories();
              }
            }}
          >
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 relative shadow-[0_10px_50px_-12px_rgba(0,0,0,0.25)] border border-gray-100" role="dialog" aria-modal="true">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                aria-label="Close dialog"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <h2 className="text-xl font-bold text-gray-800 mb-4">Confirm Delete</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete the subcategory "{subcategoryToDelete?.name}"? This action cannot be undone.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCancelDelete}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl focus:outline-none shadow-lg shadow-red-500/20 transition-all"
                  autoFocus
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryView;
