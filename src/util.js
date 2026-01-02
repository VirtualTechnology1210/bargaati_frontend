// export const BASE_URL = "http://103.102.234.198:5007"

// export const BASE_URL = "https://bargaati.com"

export const BASE_URL = "http://localhost:5001"

// Helper function to format image URLs properly
export const getImageUrl = (imageUrl) => {
  if (!imageUrl) return null;
  
  // If it's already a full URL, return as is
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }
  
  // If it starts with /, it's already properly formatted for the backend
  if (imageUrl.startsWith('/')) {
    return `${BASE_URL}${imageUrl}`;
  }
  
  // Otherwise, add the uploads prefix
  return `${BASE_URL}/uploads/${imageUrl}`;
};
