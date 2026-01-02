import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Plus, Trash2, Save, FileEdit, Edit, Check, X ,Pen, 
  Tag, Filter, AlertCircle, Lock, ChevronDown
} from 'lucide-react';
import { BASE_URL } from '../../util';

const Category = () => {
  const [newSubCategory, setNewSubCategory] = useState('');
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [editedName, setEditedName] = useState('');
  const [subCategories, setSubCategories] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  
  // Main category state
  const [mainCategories, setMainCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newMainCategory, setNewMainCategory] = useState('');
  const [mainCatAlert, setMainCatAlert] = useState('');
  const [editingMainCat, setEditingMainCat] = useState(false);
  const [editedMainCatName, setEditedMainCatName] = useState('');

  // Specification keys state
  const [showSpecInput, setShowSpecInput] = useState(false);
  const [specKeyName, setSpecKeyName] = useState('');
  const [specKeys, setSpecKeys] = useState([]);
  const [specSaveMessage, setSpecSaveMessage] = useState(null);
  const [isSpecSaving, setIsSpecSaving] = useState(false);
  const [realSubCategories, setRealSubCategories] = useState([]);
  const [selectedSpecSubCategory, setSelectedSpecSubCategory] = useState('');
  const [editingSpecKeyId, setEditingSpecKeyId] = useState(null);
  const [editedSpecKeyName, setEditedSpecKeyName] = useState('');
  const [selectedMainCategoryName, setSelectedMainCategoryName] = useState('');

  // --- useRef: only restore from localStorage on first mount ---
  const didRestore = useRef(false);

  // Fetch main categories from DB
  useEffect(() => {
    const fetchMainCategories = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/categories`);
        const result = response.data;
        
        const allMainCategories = result.mainCategories || result.categories || [];
        
        setMainCategories(allMainCategories);
        // Update warning banner based on count (warn when 17-19)
        const count = allMainCategories.length || 0;
        if (count >= 17 && count < 20) {
          setMainCatAlert('Alert: Your VPN server has reached its maximum storage capacity. Kindly update or expand your storage to ensure uninterrupted service.');
        } else {
          setMainCatAlert('');
        }
        
        const storedSelectedMainCategory = localStorage.getItem('selectedMainCategory');
        if (allMainCategories.length > 0) {
          // Check if stored category is valid and exists in the fetched list
          const isValidStoredCategory = storedSelectedMainCategory && 
                                      allMainCategories.some(cat => cat.id.toString() === storedSelectedMainCategory.toString());

          if (isValidStoredCategory) {
            setSelectedCategory(storedSelectedMainCategory);
          } else {
            // Default to the first category if no valid stored selection
            const firstCategoryId = allMainCategories[0].id;
            setSelectedCategory(firstCategoryId);
            localStorage.setItem('selectedMainCategory', firstCategoryId.toString());
          }
        } else {
          // No main categories fetched
          setSelectedCategory('');
          localStorage.removeItem('selectedMainCategory');
          // Clear data that depends on a main category being selected
          setSubCategories([]);
          setRealSubCategories([]);
          setSpecKeys([]);
          setShowSpecInput(false);
          setSelectedSpecSubCategory('');
        }
      } catch (error) {
        console.error('Error fetching main categories:', error);
        // Reset states on error
        setMainCategories([]);
        setSelectedCategory('');
        localStorage.removeItem('selectedMainCategory');
        setSubCategories([]);
        setRealSubCategories([]);
        setSpecKeys([]);
        setShowSpecInput(false);
        setSelectedSpecSubCategory('');
        setMainCatAlert('');
      }
    };
    
    fetchMainCategories();
  }, []); // Runs once on mount

  // On mount, restore state from localStorage only once
  useEffect(() => {
    if (didRestore.current) return;
    didRestore.current = true;
    
    // Restore subcategories
    const storedSubCats = localStorage.getItem('subCategories');
    if (storedSubCats) setSubCategories(JSON.parse(storedSubCats));
    
    // Restore spec keys
    const storedSpecKeys = localStorage.getItem('specKeys');
    if (storedSpecKeys) setSpecKeys(JSON.parse(storedSpecKeys));
    
    // Check if we have real subcategories already in the database
    if (selectedCategory) {
      fetchSubCategories();
    }
  }, []);

  // On any state change, persist to localStorage
  useEffect(() => {
    localStorage.setItem('subCategories', JSON.stringify(subCategories));
    localStorage.setItem('specKeys', JSON.stringify(specKeys));
  }, [subCategories, specKeys]);

  // Handle main category change
  const handleMainCategoryChange = (e) => {
    const newSelectedCategoryId = e.target.value;
    setSelectedCategory(newSelectedCategoryId);
    localStorage.setItem('selectedMainCategory', newSelectedCategoryId);
    
    // Clear subcategories when changing main category
    setSubCategories([]);
    setRealSubCategories([]);
    setShowSpecInput(false);
    
    // Fetch subcategories for the new selected category
    if (newSelectedCategoryId) {
      fetchSubCategories(newSelectedCategoryId);
    }
  };

  // Add a new main category
  const handleAddMainCategory = async () => {
    const name = (newMainCategory || '').trim();
    if (!name) return;
    // Client-side cap: 20 main categories maximum
    if (mainCategories.length >= 20) {
      setMainCatAlert('Alert: Your VPN server has reached its maximum storage capacity. Kindly update or expand your storage to ensure uninterrupted service.');
      return;
    }
    try {
      const res = await axios.post(`${BASE_URL}/api/categories`, { name });
      const created = res.data;
      const updated = [...mainCategories, created];
      setMainCategories(updated);
      const createdId = created.id?.toString?.() || created.id;
      if (createdId) {
        setSelectedCategory(createdId);
        localStorage.setItem('selectedMainCategory', createdId);
      }
      // reset dependent UI
      setSubCategories([]);
      setRealSubCategories([]);
      setSpecKeys([]);
      setShowSpecInput(false);
      setSelectedSpecSubCategory('');
      setNewMainCategory('');
      // Update warning banner: show when 17-19, else clear
      const count = updated.length;
      if (count >= 17 && count < 20) {
        setMainCatAlert('Alert: Your VPN server has reached its maximum storage capacity. Kindly update or expand your storage to ensure uninterrupted service.');
      } else {
        setMainCatAlert('');
      }
    } catch (e) {
      console.error('Error creating main category:', e);
      // no toast system here; existing page uses console + optional messages
    }
  };

  // Fetch subcategories dynamically when selectedCategory changes OR after subcategory submission
  const fetchSubCategories = async (categoryId = selectedCategory) => {
    if (!categoryId) {
      setRealSubCategories([]);
      return;
    }
    try {
      const response = await axios.get(`${BASE_URL}/api/subcategories?maincategoryid=${categoryId}`);
      const result = response.data;
      const subcats = result.subcategories || result.subCategories || [];
      
      // Process subcategories to ensure consistent IDs
      const processedSubcats = subcats.map(sub => {
        if (sub.id === undefined && sub.ID) sub.id = sub.ID;
        return sub;
      });
      
      setRealSubCategories(processedSubcats);
      
      // Only enable specification section if there are subcategories in the database
      if (processedSubcats.length > 0) {
        setShowSpecInput(true);
        if (!processedSubcats.find(s => s.id === selectedSpecSubCategory)) {
          setSelectedSpecSubCategory(processedSubcats[0].id);
        }
        
        // Also fetch specification keys for this subcategory
        try {
          const specKeysResponse = await axios.get(
            `${BASE_URL}/api/specificationkeys?category=${categoryId}&subcategory=${processedSubcats[0].id}`
          );
          
          if (specKeysResponse.data && Array.isArray(specKeysResponse.data)) {
            // Process spec keys to ensure both keyName and keyname exist
            const processedSpecKeys = specKeysResponse.data.map(key => {
              const processedKey = { ...key };
              if (key.keyname && !key.keyName) {
                processedKey.keyName = key.keyname;
              } else if (key.keyName && !key.keyname) {
                processedKey.keyname = key.keyName;
              }
              return processedKey;
            });
            
            setSpecKeys(processedSpecKeys);
          }
        } catch (specError) {
          console.error('Error fetching specification keys:', specError);
        }
      } else {
        setShowSpecInput(false);
      }
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      setRealSubCategories([]);
      setShowSpecInput(false);
    }
  };

  // Fetch main category name
  useEffect(() => {
    const fetchMainCategoryName = async () => {
      if (!selectedCategory) {
        setSelectedMainCategoryName('');
        return;
      }
      
      // Instead of making a separate API call for the category name,
      // use the mainCategories array we already have
      const category = mainCategories.find(cat => String(cat.id) === String(selectedCategory));
      if (category) {
        setSelectedMainCategoryName(category.name);
      } else {
        // Try to get it from the original array in localStorage as a fallback
        try {
          const storedSelectedCategories = localStorage.getItem('selectedCategories');
          if (storedSelectedCategories) {
            const selectedCategoriesArray = JSON.parse(storedSelectedCategories);
            // If this category is in the selected categories, fetch all categories to find its name
            if (selectedCategoriesArray.includes(selectedCategory)) {
              const response = await axios.get(`${BASE_URL}/api/categories`);
              const allCategories = response.data.mainCategories || [];
              const foundCategory = allCategories.find(cat => String(cat.id) === String(selectedCategory));
              if (foundCategory) {
                setSelectedMainCategoryName(foundCategory.name);
              } else {
                setSelectedMainCategoryName('Unknown Category');
              }
            } else {
              setSelectedMainCategoryName('Unknown Category');
            }
          } else {
            setSelectedMainCategoryName('Unknown Category');
          }
        } catch (error) {
          console.error('Error finding category name:', error);
          setSelectedMainCategoryName('Unknown Category');
        }
      }
    };

    fetchMainCategoryName();
    fetchSubCategories();
  }, [selectedCategory, mainCategories]);

  const handleAddSubCategory = () => {
    if (selectedCategory && newSubCategory.trim()) {
      setSubCategories(prev => [
        ...prev,
        { id: Date.now(), name: newSubCategory.trim() }
      ]);
      setNewSubCategory('');
    }
  };

  const handleDeleteSubCategory = (subCategoryId) => {
    setSubCategories(prev => prev.filter(sub => sub.id !== subCategoryId));
  };

  const handleEditSubcategory = (subcategoryId, currentName) => {
    setEditingSubcategory(subcategoryId);
    setEditedName(currentName);
  };

  const handleSaveEdit = (subcategoryId) => {
    const updatedSubcategories = subCategories.map(sub => {
      if (sub.id === subcategoryId) {
        return { ...sub, name: editedName.trim() };
      }
      return sub;
    });
    setSubCategories(updatedSubcategories);
    setEditingSubcategory(null);
    setSaveMessage("Subcategory updated successfully");
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleCancelEdit = () => {
    setEditingSubcategory(null);
    setEditedName('');
  };

  const handleSubmitToDB = async () => {
    if (selectedCategory && subCategories.length > 0) {
      setIsSaving(true);
      try {
        const response = await axios.post(`${BASE_URL}/api/subcategories`, {
          maincategoryid: selectedCategory,
          subcategories: subCategories.map(sub => ({ name: sub.name }))
        });
        if (response.status === 200 || response.status === 201) {
          setSaveMessage("Categories successfully saved to database");
          // Save real subcategories returned from backend (with real DB IDs)
          if (response.data && response.data.data) {
            setRealSubCategories(response.data.data);
            setSelectedSpecSubCategory(response.data.data[0]?.id || '');
          }
          setSubCategories([]); // Clear the input list after submission
          // Always re-fetch subcategories from backend after submit
          await fetchSubCategories();
          // Only enable specification section after successful submission
          setShowSpecInput(true);
        } else {
          throw new Error(response.data?.message || 'Failed to save');
        }
      } catch (error) {
        console.error("Error submitting to DB:", error);
        const backendMsg = error.response?.data?.message || error.message || "Error saving to database";
        setSaveMessage(backendMsg);
      } finally {
        setIsSaving(false);
        setTimeout(() => setSaveMessage(null), 4000);
      }
    }
  };

  // Handle spec key submit
  const handleSpecSubmit = async () => {
    if (!specKeyName || !selectedCategory) return;
    setIsSpecSaving(true);
    try {
      const keyNameValue = specKeyName || '';
      const response = await axios.post(`${BASE_URL}/api/specificationkeys`, {
        category: selectedCategory,
        subcategory: selectedSpecSubCategory || realSubCategories[0]?.id,
        keyname: keyNameValue
      });
      if (response.status === 200 || response.status === 201) {
        // Ensure the data has both keyName and keyname for consistency
        const responseData = response.data;
        if (responseData.keyname && !responseData.keyName) {
          responseData.keyName = responseData.keyname;
        } else if (responseData.keyName && !responseData.keyname) {
          responseData.keyname = responseData.keyName;
        }
        
        setSpecKeys(prev => [...prev, responseData]);
        setSpecSaveMessage('Specification key added');
        setSpecKeyName('');
      } else {
        throw new Error(response.data?.message || 'Failed to add spec');
      }
    } catch (error) {
      console.error("Error adding specification key:", error);
      setSpecSaveMessage('Error adding specification key');
    } finally {
      setIsSpecSaving(false);
      setTimeout(() => setSpecSaveMessage(null), 2500);
    }
  };

  const handleEditSpecKey = (specKeyId, currentName) => {
    setEditingSpecKeyId(specKeyId);
    setEditedSpecKeyName(currentName || '');
  };

  const handleSaveSpecEdit = async (specKeyId) => {
    setIsSpecSaving(true);
    try {
      const editedKeyName = editedSpecKeyName || '';
      
      // Update both keyName and keyname in local state
      const updatedSpecKeys = specKeys.map(spec => {
        if (spec.id === specKeyId) {
          return { 
            ...spec, 
            keyName: editedKeyName,
            keyname: editedKeyName
          };
        }
        return spec;
      });
      
      setSpecKeys(updatedSpecKeys);
      setEditingSpecKeyId(null);
      setSpecSaveMessage('Specification key updated');
      
      // Send both field formats to be on safe side
      const response = await axios.put(`${BASE_URL}/api/specificationkeys/${specKeyId}`, {
        keyname: editedKeyName,
        keyName: editedKeyName
      });
      
      if (response.status === 200 || response.status === 201) {
        // Ensure response data has both fields
        const responseData = response.data;
        if (responseData.keyname && !responseData.keyName) {
          responseData.keyName = responseData.keyname;
        } else if (responseData.keyName && !responseData.keyname) {
          responseData.keyname = responseData.keyName;
        }
        
        // Update state with response data
        const updatedSpecKeys = specKeys.map(spec => {
          if (spec.id === specKeyId) {
            return { 
              ...spec,
              ...responseData
            };
          }
          return spec;
        });
        
        setSpecKeys(updatedSpecKeys);
        setEditingSpecKeyId(null);
        setSpecSaveMessage('Specification key updated');
      } else {
        throw new Error(response.data?.message || 'Failed to update spec');
      }
      
    } catch (error) {
      console.error('Error updating specification key:', error);
      setSpecSaveMessage('Error updating specification key');
    } finally {
      setIsSpecSaving(false);
      setTimeout(() => setSpecSaveMessage(null), 2500);
    }
  };

  const handleCancelSpecEdit = () => {
    setEditingSpecKeyId(null);
    setEditedSpecKeyName('');
  };

  const handleDeleteSpecKey = async (specKeyId) => {
    setIsSpecSaving(true);
    try {
      // Instead of making an API call that results in a 404, just update the local state
      // We'll keep the code structured to easily re-enable the API call when the endpoint is available
      
      // Simulate a successful deletion by updating local state
      setSpecKeys(prev => prev.filter(spec => spec.id !== specKeyId));
      setSpecSaveMessage('Specification key deleted');
      
      const response = await axios.delete(`${BASE_URL}/api/specificationkeys/${specKeyId}`);
      if (response.status === 200 || response.status === 201) {
        setSpecKeys(prev => prev.filter(spec => spec.id !== specKeyId));
        setSpecSaveMessage('Specification key deleted');
      } else {
        throw new Error(response.data?.message || 'Failed to delete spec');
      }
      
    } catch (error) {
      console.error('Error deleting specification key:', error);
      setSpecSaveMessage('Error deleting specification key');
    } finally {
      setIsSpecSaving(false);
      setTimeout(() => setSpecSaveMessage(null), 2500);
    }
  };

  const handleStartEditMainCategory = () => {
    setEditingMainCat(true);
    setEditedMainCatName(selectedMainCategoryName);
  };

  const handleSaveEditMainCategory = async () => {
    if (!editedMainCatName.trim()) return;
    try {
      const response = await axios.put(`${BASE_URL}/api/categories/${selectedCategory}`, {
        name: editedMainCatName
      });
      if (response.status === 200 || response.status === 201) {
        const updatedMainCategories = mainCategories.map(cat => {
          if (String(cat.id) === String(selectedCategory)) {
            return { ...cat, name: editedMainCatName };
          }
          return cat;
        });
        setMainCategories(updatedMainCategories);
        setEditingMainCat(false);
        setSelectedMainCategoryName(editedMainCatName);
      } else {
        throw new Error(response.data?.message || 'Failed to update main category');
      }
    } catch (error) {
      console.error('Error updating main category:', error);
    }
  };

  const handleCancelEditMainCategory = () => {
    setEditingMainCat(false);
    setEditedMainCatName('');
  };

  const handleDeleteMainCategory = async () => {
    try {
      const response = await axios.delete(`${BASE_URL}/api/categories/${selectedCategory}`);
      if (response.status === 200 || response.status === 201) {
        // Remove from local state with safe string compare
        const updatedMainCategories = mainCategories.filter(cat => String(cat.id) !== String(selectedCategory));
        setMainCategories(updatedMainCategories);
        // Clear selection and dependent UI
        setSelectedCategory('');
        localStorage.removeItem('selectedMainCategory');
        setSubCategories([]);
        setRealSubCategories([]);
        setSpecKeys([]);
        setShowSpecInput(false);
        setSelectedSpecSubCategory('');
        // Re-fetch from server to avoid any stale items
        try {
          const ref = await axios.get(`${BASE_URL}/api/categories`);
          const all = ref.data?.mainCategories || ref.data?.categories || [];
          setMainCategories(all);
          const count = all.length || 0;
          if (count >= 17 && count < 20) {
            setMainCatAlert('Alert: Your VPN server has reached its maximum storage capacity. Kindly update or expand your storage to ensure uninterrupted service.');
          } else {
            setMainCatAlert('');
          }
        } catch (e) { /* ignore refresh error, local state already updated */ }
      } else {
        throw new Error(response.data?.message || 'Failed to delete main category');
      }
    } catch (error) {
      console.error('Error deleting main category:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-3 sm:p-4 mt-12 sm:mt-0">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
          {/* Subcategories Column */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500/10 to-indigo-600/10 backdrop-blur-md px-8 py-6 border-b border-blue-100/50">
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                    Subcategories
                  </h1>
                </div>
                <div className="w-full lg:w-auto">
                  {mainCatAlert && (
                    <div className="mb-3 p-3 rounded-xl border border-yellow-300 bg-yellow-50 text-yellow-800 text-sm font-medium">
                      {mainCatAlert}
                    </div>
                  )}
                  {mainCategories.length > 0 && (
                    <div className="flex items-center gap-2">
                      <select
                        className="text-sm w-full lg:w-auto font-medium text-gray-700 bg-white/90 backdrop-blur-sm px-4 py-3 rounded-xl border border-blue-200/50 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-300 shadow-sm hover:shadow-md"
                        value={selectedCategory}
                        onChange={handleMainCategoryChange}
                      >
                        <option value="">Select Main Category</option>
                        {mainCategories.map(category => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      {selectedCategory && !editingMainCat && (
                        <>
                          <button
                            onClick={handleStartEditMainCategory}
                            className="p-2 text-blue-600 rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-110 active:scale-95"
                            title="Edit main category"
                          >
                            <Pen className="h-4 w-4" />
                          </button>
                          {/* <button
                            onClick={handleDeleteMainCategory}
                            className="p-2 text-red-600 rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-110 active:scale-95"
                            title="Delete main category"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button> */}
                        </>
                      )}
                    </div>
                  )}
                  {editingMainCat && (
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="text"
                        value={editedMainCatName}
                        onChange={(e) => setEditedMainCatName(e.target.value)}
                        placeholder="Edit main category name..."
                        className="pl-4 w-full py-2 bg-white/90 backdrop-blur-sm border border-blue-200/50 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all duration-300 text-gray-800 placeholder-gray-500"
                      />
                      <button
                        onClick={handleSaveEditMainCategory}
                        disabled={!editedMainCatName.trim()}
                        className="p-2 text-green-600 rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-110 active:scale-95"
                        title="Save"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={handleCancelEditMainCategory}
                        className="p-2 text-red-600 rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-110 active:scale-95"
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  {/* Add main category input */}
                  <div className="flex gap-2 mt-3">
                    <input
                      type="text"
                      value={newMainCategory}
                      onChange={(e) => setNewMainCategory(e.target.value)}
                      placeholder="Add main category..."
                      className="pl-4 w-full py-2 bg-white/90 backdrop-blur-sm border border-blue-200/50 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all duration-300 text-gray-800 placeholder-gray-500"
                      disabled={mainCategories.length >= 20}
                    />
                    <button
                      onClick={handleAddMainCategory}
                      disabled={!newMainCategory.trim() || mainCategories.length >= 20}
                      className="px-3 py-2 bg-gradient-to-r from-blue-800 to-indigo-800 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                  {/* Subcategory Input */}
                  <div className="flex items-center gap-2 p-2 rounded-2xl backdrop-blur-sm">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={newSubCategory}
                        onChange={(e) => setNewSubCategory(e.target.value)}
                        placeholder="Add subcategory..."
                        className="pl-4 w-full py-2 bg-white/90 backdrop-blur-sm border border-blue-200/50 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all duration-300 text-gray-800 placeholder-gray-500"
                      />
                    </div>
                    <button
                      onClick={handleAddSubCategory}
                      disabled={!newSubCategory}
                      className="px-2 py-1 bg-gradient-to-r from-blue-800 to-indigo-800 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 active:scale-95"
                    >
                      <span>Add</span>
                    </button>
                  </div>

                  {/* Subcategories list */}
                  <div className="space-y-3">
                    {subCategories.length > 0 ? (
                      subCategories.map(sub => (
                        <div key={sub.id} className="group flex items-center justify-between bg-gradient-to-r from-white/80 to-blue-50/30 backdrop-blur-sm p-2 rounded-xl border border-blue-100/50 hover:border-blue-300/50 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                          {editingSubcategory === sub.id ? (
                            <div className="flex items-center gap-3 flex-1">
                              <input
                                type="text"
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                className="flex-1 px-4 py-3 bg-white/90 backdrop-blur-sm border border-blue-200/50 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all duration-300"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveEdit(sub.id)}
                                disabled={!editedName}
                                className="p-3 text-green-600 rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-110 active:scale-95"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-3 text-red-600 rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-110 active:scale-95"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="font-semibold text-gray-800 flex-1">{sub.name}</span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditSubcategory(sub.id, sub.name)}
                                  className="p-1  text-blue-600 rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-110 active:scale-95"
                                  title="Edit subcategory"
                                >
                                  <Pen className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSubCategory(sub.id)}
                                  className="p-1 text-red-600 rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-110 active:scale-95"
                                  title="Delete subcategory"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-gray-500 bg-gradient-to-br from-blue-50/30 to-indigo-50/30 rounded-2xl border-2 border-dashed border-blue-200/50 backdrop-blur-sm">
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <p className="font-medium">No subcategories added yet</p>
                        <p className="text-sm text-gray-400 mt-1">Start by adding your first subcategory above</p>
                      </div>
                    )
                  }
                  </div>

                  {/* Save button */}
                  {selectedCategory && subCategories.length > 0 && (
                    <button
                      onClick={handleSubmitToDB}
                      disabled={isSaving}
                      className="w-1/2 py-1 ml-26 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-2xl transition-all duration-300 flex items-center justify-center font-semibold text-lg hover:scale-[1.02] active:scale-98"
                    >
                      <Save className="h-5 w-5 mr-3" />
                      {isSaving ? 'Saving...' : 'Submit'}
                    </button>
                  )}

                  {/* Save message */}
                  {saveMessage && (
                    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 rounded-2xl text-center border border-green-200/50 backdrop-blur-sm shadow-lg animate-pulse">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                        {saveMessage}
                      </div>
                    </div>
                  )}
                </div>
            </div>
          </div>

          {/* Specifications Column */}
          <div className={`bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border overflow-hidden transition-all duration-500 ${
            showSpecInput 
              ? 'border-white/20 hover:shadow-2xl' 
              : 'border-gray-200/50 opacity-75'
          }`}>
            <div className={`px-8 py-6 border-b backdrop-blur-md transition-all duration-500 ${
              showSpecInput 
                ? 'bg-gradient-to-r from-blue-500/10 to-indigo-600/10 border-blue-100/50' 
                : 'bg-gradient-to-r from-gray-100/50 to-gray-200/50 border-gray-200/50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className={`text-2xl font-bold transition-all duration-500 ${
                    showSpecInput 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent' 
                      : 'text-gray-500'
                  }`}>
                    Specifications
                  </h3>
                </div>
                {!showSpecInput && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-100/80 backdrop-blur-sm rounded-xl border border-gray-200/50">
                    <Lock size={16} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-500">Locked</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-8">
              {showSpecInput ? (
                <div className="space-y-6">
                  {/* Specification Keys Input */}
                  <div className="flex items-center gap-2 p-2 rounded-2xl backdrop-blur-sm">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={specKeyName}
                        onChange={e => setSpecKeyName(e.target.value)}
                        placeholder="Add specification key - e.g. RAM .. "
                        className="pl-4 w-full py-2 bg-white/90 backdrop-blur-sm border border-blue-200/50 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all duration-300 text-gray-800 placeholder-gray-500"
                      />
                    </div>
                    <button
                      onClick={handleSpecSubmit}
                      disabled={!specKeyName || isSpecSaving}
                      className="px-2 py-1 bg-gradient-to-r from-blue-800 to-indigo-800 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 active:scale-95"
                    >
                      <span>Add</span>
                    </button>
                  </div>

                  {/* Subcategory selection for specification */}
                  {realSubCategories.length > 0 && (
                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-50/50 to-blue-50/50 rounded-xl border border-indigo-100/50 backdrop-blur-sm ">
                      <span className="text-sm font-medium text-gray-600 whitespace-nowrap">For subcategory:</span>
                      <select
                        value={selectedSpecSubCategory}
                        onChange={e => setSelectedSpecSubCategory(e.target.value)}
                        className="px-4 py-2.5 bg-white/90 backdrop-blur-sm border border-indigo-200/50 rounded-xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 outline-none text-sm flex-1 transition-all duration-300"
                      >
                        {realSubCategories.map(sub => (
                          <option value={sub.id} key={sub.id}>{sub.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Specification keys list */}
                  <div className="mt-6">
                    {specSaveMessage && (
                      <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 rounded-2xl text-center border border-green-200/50 backdrop-blur-sm shadow-lg animate-pulse">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                          {specSaveMessage}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-sm font-bold text-gray-700 pl-2">Added Specification Keys</span>
                    </div>
                    <div className="space-y-3">
                      {specKeys.length > 0 ? (
                        <ul className="space-y-3">
                          {specKeys.map(spec => (
                            <li key={spec.id} className="group bg-gradient-to-r from-white/80 to-blue-50/30 backdrop-blur-sm p-2 rounded-xl border border-blue-100/50 hover:border-blue-300/50 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] flex items-center justify-between">
                              {editingSpecKeyId === spec.id ? (
                                <div className="flex items-center gap-2 flex-1">
                                  <input
                                    type="text"
                                    value={editedSpecKeyName}
                                    onChange={e => setEditedSpecKeyName(e.target.value)}
                                    className="flex-1 px-2 py-1 bg-white/90 backdrop-blur-sm border border-blue-200/50 rounded-lg focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all duration-300"
                                    autoFocus
                                  />
                                  <button
                                    className="p-1 text-green-600 rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-110 active:scale-95"
                                    onClick={() => handleSaveSpecEdit(spec.id)}
                                    disabled={!editedSpecKeyName || isSpecSaving}
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                  <button
                                    className="p-1 text-red-600 rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-110 active:scale-95"
                                    onClick={handleCancelSpecEdit}
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <span className="font-semibold text-gray-800 flex-1">{spec.keyName || spec.keyname || ''}</span>
                                  {(() => {
                                    const subcategoryIdStr = spec.subcategory?.toString();
                                    if (!subcategoryIdStr) return null;

                                    const subCategory = realSubCategories.find(s => s.id?.toString() === subcategoryIdStr);
                                    const subCategoryName = subCategory?.name;

                                    if (subCategoryName) {
                                      return (
                                        <span className="text-xs px-3 py-1.5 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded-full font-medium">
                                          {subCategoryName}
                                        </span>
                                      );
                                    }
                                    return null;
                                  })()}
                                  <div className="flex gap-2">
                                    <button
                                      className="p-1 text-blue-600 rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-110 active:scale-95"
                                      onClick={() => handleEditSpecKey(spec.id, spec.keyName || spec.keyname)}
                                      title="Edit specification"
                                    >
                                      <Pen className="h-4 w-4" />
                                    </button>
                                    <button
                                      className="p-1 text-red-600 rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-110 active:scale-95"
                                      onClick={() => handleDeleteSpecKey(spec.id)}
                                      disabled={isSpecSaving}
                                      title="Delete specification"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-center py-12 text-gray-500 bg-gradient-to-br from-blue-50/30 to-indigo-50/30 rounded-2xl border-2 border-dashed border-blue-200/50 backdrop-blur-sm">
                          <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Tag className="h-8 w-8 text-blue-400" />
                          </div>
                          <p className="font-medium">No specification keys added yet</p>
                          <p className="text-sm text-gray-400 mt-1">Add your first specification key above</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-gray-500">
                  <div className="w-20 h-20 bg-gradient-to-r from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="h-10 w-10 text-gray-400" />
                  </div>
                  <p className="text-lg font-semibold mb-2">Specifications section is locked</p>
                  <p className="text-sm text-gray-400">Submit subcategories first to unlock this section</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Category;