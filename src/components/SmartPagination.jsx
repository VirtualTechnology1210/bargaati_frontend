import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const SmartPagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  maxVisiblePages = 5,
  showFirstLast = true,
  showPrevNext = true,
  className = ""
}) => {
  // Generate page numbers to display
  const generatePageNumbers = () => {
    const pages = [];
    
    if (totalPages <= maxVisiblePages) {
      // If total pages is less than max visible, show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Smart pagination logic
      const halfVisible = Math.floor(maxVisiblePages / 2);
      
      if (currentPage <= halfVisible + 1) {
        // Show pages from start: 1, 2, 3, 4, ..., 10
        for (let i = 1; i <= maxVisiblePages - 1; i++) {
          pages.push(i);
        }
        if (maxVisiblePages < totalPages) {
          pages.push('ellipsis');
          pages.push(totalPages);
        }
      } else if (currentPage >= totalPages - halfVisible) {
        // Show pages from end: 1, ..., 7, 8, 9, 10
        pages.push(1);
        if (totalPages - maxVisiblePages + 1 > 2) {
          pages.push('ellipsis');
        }
        for (let i = Math.max(2, totalPages - maxVisiblePages + 2); i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Show pages around current page: 1, ..., 4, 5, 6, ..., 10
        pages.push(1);
        
        // Only add ellipsis if there's a gap
        if (currentPage - halfVisible > 2) {
          pages.push('ellipsis');
        }
        
        // Add pages around current page
        const startPage = Math.max(2, currentPage - halfVisible + 1);
        const endPage = Math.min(totalPages - 1, currentPage + halfVisible - 1);
        
        for (let i = startPage; i <= endPage; i++) {
          pages.push(i);
        }
        
        // Only add ellipsis if there's a gap
        if (currentPage + halfVisible < totalPages - 1) {
          pages.push('ellipsis');
        }
        
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const pageNumbers = generatePageNumbers();

  if (totalPages <= 1) return null;

  return (
    <nav className={`relative z-0 inline-flex rounded-md shadow-sm -space-x-px ${className}`} aria-label="Pagination">
      {/* Previous Button */}
      {showPrevNext && (
        <button
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className={`relative inline-flex items-center px-2 py-2 ${pageNumbers.length > 0 ? 'rounded-l-md' : 'rounded-md'} border border-gray-300 bg-white text-sm font-medium ${
            currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <span className="sr-only">Previous</span>
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      
      {/* Page Numbers */}
      {pageNumbers.map((page, index) => {
        if (page === 'ellipsis') {
          return (
            <span
              key={`ellipsis-${index}`}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
            >
              ...
            </span>
          );
        }
        
        return (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
              currentPage === page
                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {page}
          </button>
        );
      })}
      
      {/* Next Button */}
      {showPrevNext && (
        <button
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          className={`relative inline-flex items-center px-2 py-2 ${pageNumbers.length > 0 ? 'rounded-r-md' : 'rounded-md'} border border-gray-300 bg-white text-sm font-medium ${
            currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <span className="sr-only">Next</span>
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </nav>
  );
};

export default SmartPagination;