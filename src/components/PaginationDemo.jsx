import React, { useState } from 'react';
import SmartPagination from './SmartPagination';

const PaginationDemo = () => {
  const [scenario1, setScenario1] = useState(1); // 10 pages
  const [scenario2, setScenario2] = useState(1); // 100 pages
  const [scenario3, setScenario3] = useState(1); // 3 pages

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Smart Pagination Demo</h1>
      
      {/* Scenario 1: 10 pages */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Scenario 1: 10 Total Pages</h2>
        <p className="text-gray-600 mb-4">Current Page: {scenario1}</p>
        <div className="flex justify-center">
          <SmartPagination
            currentPage={scenario1}
            totalPages={10}
            onPageChange={setScenario1}
            maxVisiblePages={5}
          />
        </div>
        <div className="mt-4 text-sm text-gray-500">
          <p>• When on page 1-3: Shows 1, 2, 3, 4, ..., 10</p>
          <p>• When on page 4-7: Shows 1, ..., 3, 4, 5, ..., 10</p>
          <p>• When on page 8-10: Shows 1, ..., 7, 8, 9, 10</p>
        </div>
      </div>

      {/* Scenario 2: 100 pages */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Scenario 2: 100 Total Pages</h2>
        <p className="text-gray-600 mb-4">Current Page: {scenario2}</p>
        <div className="flex justify-center">
          <SmartPagination
            currentPage={scenario2}
            totalPages={100}
            onPageChange={setScenario2}
            maxVisiblePages={5}
          />
        </div>
        <div className="mt-4 text-sm text-gray-500">
          <p>• Try clicking different pages to see how the pagination adapts</p>
          <p>• Always shows first and last page with ellipsis when needed</p>
        </div>
      </div>

      {/* Scenario 3: Few pages */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Scenario 3: 3 Total Pages</h2>
        <p className="text-gray-600 mb-4">Current Page: {scenario3}</p>
        <div className="flex justify-center">
          <SmartPagination
            currentPage={scenario3}
            totalPages={3}
            onPageChange={setScenario3}
            maxVisiblePages={5}
          />
        </div>
        <div className="mt-4 text-sm text-gray-500">
          <p>• When total pages ≤ maxVisiblePages, shows all pages without ellipsis</p>
        </div>
      </div>

      {/* Quick test buttons */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Quick Tests</h2>
        <div className="space-y-4">
          <div>
            <p className="mb-2">Test Scenario 2 (100 pages) with different positions:</p>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setScenario2(1)}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Page 1
              </button>
              <button 
                onClick={() => setScenario2(3)}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Page 3
              </button>
              <button 
                onClick={() => setScenario2(50)}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Page 50
              </button>
              <button 
                onClick={() => setScenario2(98)}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Page 98
              </button>
              <button 
                onClick={() => setScenario2(100)}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Page 100
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaginationDemo;