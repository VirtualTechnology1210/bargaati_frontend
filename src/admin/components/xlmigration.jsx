import React, { useState } from 'react';
import { Upload, X, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { BASE_URL } from '../../util';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';

const XlMigration = ({ isOpen, onClose }) => {
  // Excel import states
  const [excelFile, setExcelFile] = useState(null);
  const [excelImportLoading, setExcelImportLoading] = useState(false);
  const [excelData, setExcelData] = useState(null);
  const [importResults, setImportResults] = useState(null);

  // Function to handle Excel file selection
  const handleExcelFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];

      if (!validTypes.includes(file.type)) {
        toast.error('Please select a valid Excel file (.xlsx or .xls)');
        return;
      }

      setExcelFile(file);
    }
  };

  // Function to handle Excel import
  const handleExcelImport = async () => {
    if (!excelFile) {
      toast.error('Please select an Excel file first');
      return;
    }

    setExcelImportLoading(true);
    setImportResults(null);

    try {
      const formData = new FormData();
      formData.append('excel', excelFile);

      const response = await axios.post(`${BASE_URL}/api/products/import-excel`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setImportResults(response.data.results);
        toast.success(`Import completed! ${response.data.results.successful} products imported successfully.`);

        if (response.data.results.failed > 0) {
          toast.warning(`${response.data.results.failed} products failed to import. Check the results for details.`);
        }
      } else {
        toast.error(response.data.message || 'Import failed');
      }
    } catch (error) {
      console.error('Excel import error:', error);

      let errorMessage = 'Error importing Excel file';
      if (error.response?.status === 404) {
        errorMessage = 'Import endpoint not found. Please check if the server is running.';
      } else if (error.response?.status === 500) {
        errorMessage = `Server error: ${error.response?.data?.message || 'Internal server error'}`;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setExcelImportLoading(false);
    }
  };



  // Function to close modal and reset state
  const closeModal = () => {
    setExcelFile(null);
    setImportResults(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Import Products from Excel</h3>
          <button
            onClick={closeModal}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Excel File
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelFileChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300"
            />
            {excelFile && (
              <p className="text-sm text-green-600 mt-1">
                Selected: {excelFile.name}
              </p>
            )}
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Instructions:</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Download the template first to see the required format</li>
              <li>• Fill in all required fields: productname, brand, price, category, subcategory</li>
              <li>• Use category and subcategory IDs (numbers) - check the reference sheets in the template</li>
              <li>• Specifications should be in JSON format</li>
              <li>• Sizes should be in JSON array format</li>
            </ul>
            <div className="mt-2">
              <button
                onClick={() => window.open(`${BASE_URL}/api/products/import-reference`, '_blank')}
                className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
              >
                View Available Categories & Subcategories
              </button>
            </div>
          </div>

          {importResults && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="text-sm font-medium text-gray-800 mb-2">Import Results:</h4>
              <div className="text-xs space-y-1">
                <p className="text-green-600">✓ Successful: {importResults.successful}</p>
                <p className="text-red-600">✗ Failed: {importResults.failed}</p>
                <p className="text-gray-600">Total: {importResults.total}</p>
              </div>

              {importResults.errors && importResults.errors.length > 0 && (
                <div className="mt-2 max-h-32 overflow-y-auto">
                  <p className="text-xs font-medium text-red-700 mb-1">Errors:</p>
                  {importResults.errors.slice(0, 5).map((error, index) => (
                    <p key={index} className="text-xs text-red-600">
                      Row {error.row}: {error.error}
                    </p>
                  ))}
                  {importResults.errors.length > 5 && (
                    <p className="text-xs text-gray-500">
                      ... and {importResults.errors.length - 5} more errors
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={closeModal}
            className="px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            disabled={excelImportLoading}
          >
            Close
          </button>
          <button
            onClick={handleExcelImport}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 flex items-center gap-2"
            disabled={excelImportLoading || !excelFile}
          >
            {excelImportLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Import Products
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Standalone function for downloading Excel template (can be used outside the modal)
export const downloadExcelTemplate = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/api/products/excel-template`, {
      responseType: 'blob',
    });

    // Create blob link to download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'product_import_template.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    toast.success('Template downloaded successfully!');
  } catch (error) {
    console.error('Template download error:', error);
    toast.error(`Error downloading template: ${error.response?.status || error.message}`);
  }
};

// Function to export orders data to Excel
export const exportOrdersToExcel = async (orders, filename = 'orders_export.xlsx') => {
  try {

    // Prepare data for Excel export
    const exportData = orders.map((order, index) => ({
      'S.No': index + 1,
      'Order ID': order.id,
      'Order Date': order.orderDate,
      'Customer Name': order.customerName,
      'Contact Number': order.contactNumber,
      'Email': order.customerDetails?.email || 'N/A',
      'Status': order.status,
      'Street Address': order.shippingAddress?.street || 'N/A',
      'City': order.shippingAddress?.city || 'N/A',
      'State': order.shippingAddress?.state || 'N/A',
      'Pin Code': order.shippingAddress?.PinCode || 'N/A',
      'Country': order.shippingAddress?.country || 'N/A',
      'Subtotal (₹)': order.priceDetails?.subtotal?.toFixed(2) || '0.00',
      'Tax (₹)': order.priceDetails?.tax?.toFixed(2) || '0.00',
      'Shipping (₹)': order.priceDetails?.shipping?.toFixed(2) || '0.00',
      'Total Amount (₹)': order.priceDetails?.total?.toFixed(2) || '0.00',
      'Payment Method': order.paymentDetails?.method || 'N/A',
      'Payment Status': order.paymentDetails?.status || 'N/A',
      'Transaction ID': order.paymentDetails?.transactionId || 'N/A',
      'PhonePe Status': order.paymentDetails?.phonepeStatus || 'N/A',
      'Courier Company': order.courierName || order.couriercompany || 'N/A',
      'Tracking ID': order.trackingId || order.trackingid || 'N/A',
      'Items Count': (order.orderItems || order.orderDetails)?.length || 0,
      'Items': (order.orderItems || order.orderDetails)?.map(item => 
        `${item.productName}${item.selectedSize ? ` (Size: ${item.selectedSize})` : ''} - Qty: ${item.quantity} - Price: ₹${item.price}`
      ).join('; ') || 'N/A'
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    const columnWidths = [
      { wch: 8 },   // S.No
      { wch: 12 },  // Order ID
      { wch: 15 },  // Order Date
      { wch: 20 },  // Customer Name
      { wch: 15 },  // Contact Number
      { wch: 25 },  // Email
      { wch: 12 },  // Status
      { wch: 30 },  // Street Address
      { wch: 15 },  // City
      { wch: 15 },  // State
      { wch: 10 },  // Pin Code
      { wch: 12 },  // Country
      { wch: 12 },  // Subtotal
      { wch: 10 },  // Tax
      { wch: 12 },  // Shipping
      { wch: 15 },  // Total Amount
      { wch: 15 },  // Payment Method
      { wch: 15 },  // Payment Status
      { wch: 20 },  // Transaction ID
      { wch: 15 },  // PhonePe Status
      { wch: 20 },  // Courier Company
      { wch: 20 },  // Tracking ID
      { wch: 12 },  // Items Count
      { wch: 50 }   // Items
    ];
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');

    // Generate Excel file and download
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    toast.success(`Excel file "${filename}" downloaded successfully!`);
  } catch (error) {
    console.error('Excel export error:', error);
    toast.error(`Error exporting to Excel: ${error.message}`);
  }
};

export default XlMigration;