import jsPDF from 'jspdf';
import { BASE_URL } from '../util';

// Fixed biller ID for all customers
const FIXED_BILLER_ID = '1433985223';

const getPaymentHeadingLabel = (order) => {
  const method = (order?.paymentDetails?.method || '').toLowerCase();
  const status = (order?.paymentDetails?.status || '').toLowerCase();
  // 1) Advance/partial should take precedence over method (e.g., COD + partial -> ADVANCE)
  if (status.includes('partial') || method.includes('advance')) return '(ADVANCE)';
  // 2) Fully paid or UPI/PhonePe treated as prepaid
  if (status === 'paid' || method.includes('upi') || method.includes('phonepe')) return '(PRE PAID)';
  // 3) Explicit COD
  if (method.includes('cod') || method.includes('cash on delivery')) return '(COD)';
  // 4) Fallback to method name
  return `(${(order?.paymentDetails?.method || 'PAYMENT').toUpperCase()})`;
};

const getBalanceAmount = (order) => {
  const total = Number(order?.priceDetails?.total) || 0;
  
  // First try to get explicit balance_due_amount from order (backend field)
  const balanceDueAmount = Number(order?.balance_due_amount ?? order?.balanceDueAmount ?? NaN);
  if (!isNaN(balanceDueAmount) && balanceDueAmount >= 0 && balanceDueAmount <= total) {
    return balanceDueAmount;
  }
  
  // Try explicit balance fields from common containers
  const collect = (obj) => {
    if (!obj) return [];
    return Object.entries(obj)
      .filter(([k, v]) => String(k).toLowerCase().includes('balance'))
      .map(([_, v]) => parseAmount(v))
      .filter((n) => !isNaN(n));
  };
  const candidates = [
    ...collect(order?.paymentDetails),
    ...collect(order?.priceDetails),
    ...collect(order?.priceBreakdown),
    ...collect(order),
  ];
  const bal = candidates.find((n) => n >= 0 && n <= total);
  if (typeof bal === 'number') return bal;
  // Fallback: compute from paid
  const paid = getPaidAmount(order);
  return Math.max(0, total - paid);
};

const parseAmount = (v) => {
  if (v == null) return NaN;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const cleaned = v.replace(/[^0-9.\-]/g, '');
    const num = Number(cleaned);
    return isNaN(num) ? NaN : num;
  }
  return NaN;
};

const getPaidAmount = (order) => {
  const total = Number(order?.priceDetails?.total) || 0;
  const status = (order?.paymentDetails?.status || '').toLowerCase();

  // 0) If fully paid via UI status
  if (status === 'paid') return total;

  // 0.1) First try to get explicit advance_paid_amount from order (backend field)
  const advancePaidAmount = Number(order?.advance_paid_amount ?? order?.advancePaidAmount ?? NaN);
  if (!isNaN(advancePaidAmount) && advancePaidAmount >= 0 && advancePaidAmount <= total) {
    return advancePaidAmount;
  }

  // 0.5) Prefer item-level per-unit advance * quantity if present
  try {
    if (order && Array.isArray(order.orderDetails) && order.orderDetails.length > 0) {
      const sumItemAdvance = order.orderDetails.reduce((acc, it) => {
        const qty = Number(it?.quantity) || 0;
        // Try common field names for per-unit advance on item or nested product
        const perUnitCandidates = [
          it?.advance_payment_value,
          it?.advancePerUnit,
          it?.advance_amount,
          it?.advanceAmount,
          it?.advance,
          it?.deposit,
          it?.product?.advance_payment_value,
          it?.product?.advance_amount,
          it?.product?.advanceAmount,
          it?.product?.advance,
          it?.product?.deposit,
        ];
        const perUnit = perUnitCandidates.map(parseAmount).find(v => !isNaN(v) && v > 0) || 0;
        return acc + (perUnit * qty);
      }, 0);
      if (!isNaN(sumItemAdvance) && sumItemAdvance > 0) {
        // Clamp to total
        return Math.min(sumItemAdvance, total);
      }
    }
  } catch (_) {}

  // Helper to collect numeric fields matching patterns
  const collectMatches = (obj, includePatterns = [], altKeys = []) => {
    const out = [];
    if (!obj || typeof obj !== 'object') return out;
    // direct keys
    for (const [k, v] of Object.entries(obj)) {
      const num = parseAmount(v);
      if (!isNaN(num)) {
        const key = String(k).toLowerCase();
        if (includePatterns.some((p) => key.includes(p))) out.push(Number(v));
      }
    }
    // explicit alternate keys
    for (const k of altKeys) {
      if (k in obj) {
        const num = parseAmount(obj[k]);
        if (!isNaN(num)) out.push(num);
      }
    }
    return out;
  };

  // 1) Prefer explicit balance fields if present, then derive paid = total - balance
  const balanceCandidates = [
    ...collectMatches(order?.paymentDetails, ['balance']),
    ...collectMatches(order?.priceDetails, ['balance']),
    ...collectMatches(order?.priceBreakdown, ['balance']),
    ...collectMatches(order, ['balance'])
  ].filter((n) => !isNaN(n));
  const balance = balanceCandidates.find((n) => n >= 0 && n <= total);
  if (typeof balance === 'number') {
    const paid = total - balance;
    return Math.max(0, Math.min(total, paid));
  }

  // 2) Otherwise, look for any advance/paid-like amounts across common containers
  const paidCandidates = [
    ...collectMatches(order?.paymentDetails, ['advance', 'paid'], ['advancePaid', 'paid', 'advance_payment_value']),
    ...collectMatches(order?.priceDetails, ['advance', 'paid'], ['paid', 'advancePaid', 'advance_payment_value']),
    ...collectMatches(order?.priceBreakdown, ['advance', 'paid'], ['paid', 'advancePaidAmount', 'advance_payment_value']),
    ...collectMatches(order, ['advance', 'paid'], ['advancePaidAmount', 'advance_amount', 'advancePaymentAmount', 'amountPaid', 'paidAmount', 'advance_payment_value'])
  ].filter((n) => !isNaN(n));

  // Pick the largest plausible paid <= total (covers cases where multiple fields exist)
  let paid = paidCandidates
    .filter((n) => n > 0 && n <= total)
    .sort((a, b) => b - a)[0];

  if (!isNaN(paid)) return paid;

  // 3) Default to 0
  return 0;
};

const getPrepaidModeLabel = (order) => {
  const method = (order?.paymentDetails?.method || '').toLowerCase();
  if (method.includes('phonepe')) return 'UPI/PhonePe';
  if (method.includes('upi')) return 'UPI';
  if (method.includes('card')) return 'Card';
  if (method.includes('net') || method.includes('netbank')) return 'Net Banking';
  return (order?.paymentDetails?.method || 'Online');
};

export const drawBillOnDoc = (doc, order) => {
  // Set page size to mobile box size (smaller than A4)
  const pageWidth = 140; // mm (about 5.5 inches)
  const pageHeight = 200; // mm (about 7.9 inches)
  
  // Set font sizes and styles (smaller for mobile format)
  const titleSize = 14;
  const headerSize = 11;
  const normalSize = 9;
  const smallSize = 7;

  let yPosition = 15;

  // Helper to write wrapped text within margins with auto page-break
  const writeWrapped = (text, x = 10, lineHeight = 5, maxWidth = pageWidth - 20) => {
    if (text == null) return;
    const lines = doc.splitTextToSize(String(text), maxWidth);
    lines.forEach((line) => {
      if (yPosition > (pageHeight - 20)) {
        doc.addPage();
        yPosition = 15;
      }
      doc.text(line, x, yPosition);
      yPosition += lineHeight;
    });
  };

  // Add title
  doc.setFontSize(titleSize);
  doc.setFont('helvetica', 'bold');
  doc.text('BARGAATI', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Add line separator
  doc.setLineWidth(0.3);
  doc.line(10, yPosition, pageWidth - 10, yPosition);
  yPosition += 8;

  // Biller Information Section
  doc.setFontSize(headerSize);
  doc.setFont('helvetica', 'bold');
  doc.text('Biller Information:', 10, yPosition);
  yPosition += 6;

  doc.setFontSize(normalSize);
  doc.setFont('helvetica', 'normal');
  const paymentHeading = getPaymentHeadingLabel(order);
  const billerId = String(FIXED_BILLER_ID);
  const baseText = `Biller ID: ${billerId} `;
  // Draw base text first
  doc.text(baseText, 10, yPosition);
  const baseWidth = doc.getTextWidth(baseText);
  // Draw heading separately to allow underline when PRE PAID
  doc.text(paymentHeading, 10 + baseWidth, yPosition);
  if (paymentHeading === '(PRE PAID)') {
    const labelWidth = doc.getTextWidth(paymentHeading);
    const underlineY = yPosition + 1;
    doc.line(10 + baseWidth, underlineY, 10 + baseWidth + labelWidth, underlineY);
  }
  yPosition += 5;

  // For prepaid, show Mode line beneath the heading
  if (paymentHeading === '(PRE PAID)') {
    const mode = getPrepaidModeLabel(order);
    doc.text(`Mode: ${mode}`, 10, yPosition);
    yPosition += 7;
  }

  // Amount line logic
  const totalAmount = Number(order?.priceDetails?.total) || 0;
  if (paymentHeading === '(COD)') {
    const amountInWords = numberToWords(totalAmount);
    doc.text(`Amount To Be Collected: ${totalAmount.toFixed(2)}/- (${amountInWords} only)`, 10, yPosition);
    yPosition += 10;
  } else if (paymentHeading === '(ADVANCE)') {
    const balance = getBalanceAmount(order);
    const amountInWords = numberToWords(balance);
    // Only show Balance to be Collected (no Advance Paid line)
    doc.text(`Balance to be Collected: ${balance.toFixed(2)}/- (${amountInWords} only)`, 10, yPosition);
    yPosition += 10;
  } else {
    // PRE PAID or other prepaid types -> skip showing amount line
    yPosition += 0;
  }

  // Customer ID line (if available)
  try {
    let hasCustomerId = false;
    const candidateIds = [
      order?.customerId,
      order?.userId,
      order?.customer_id,
      order?.customerID,
      order?.customer?.id,
      order?.user?.id,
    ];
    const customerId = candidateIds.find((v) => v !== undefined && v !== null && String(v).trim() !== '');
    if (customerId !== undefined) {
      doc.text(`Customer id: ${customerId}`, 10, yPosition);
      yPosition += 7;
      hasCustomerId = true;
    }
    // Order ID line (robust detection)
    const orderIdCandidates = [
      order?.id,
      order?.orderId,
      order?.order_id,
      order?.orderNo,
      order?.order_no,
      order?.orderNumber,
      order?.order_number,
      order?.paymentDetails?.orderId,
      order?.paymentDetails?.merchantOrderId,
      order?.merchantOrderId,
      order?.advance_payment_txn_id,
    ];
    const orderId = orderIdCandidates.find((v) => v !== undefined && v !== null && String(v).trim() !== '');
    if (!hasCustomerId && orderId !== undefined) {
      // Use order identifier as a fallback Customer id label per request
      doc.text(`Customer id: ${orderId}`, 10, yPosition);
      yPosition += 7;
    }
  } catch (_) {}

  // Add line separator
  // doc.setLineWidth(0.3);
  // doc.line(10, yPosition, pageWidth - 10, yPosition);
  // yPosition += 8;

  // Recipient Information (To)
  doc.setFontSize(headerSize);
  doc.setFont('helvetica', 'bold');
  doc.text('To:', 10, yPosition);
  yPosition += 6;

  doc.setFontSize(normalSize);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${order.customerName}`, 10, yPosition);
  yPosition += 5;

  doc.text(`Mobile: ${order.contactNumber}`, 10, yPosition);
  yPosition += 5;

  writeWrapped(`Address: ${order.shippingAddress.street}`);

  writeWrapped(`${order.shippingAddress.city}`);

  writeWrapped(`${order.shippingAddress.state}`);

  doc.text(`Pin: ${order.shippingAddress.PinCode}`, 10, yPosition);
  yPosition += 10;

  // Add line separator
  // doc.setLineWidth(0.3);
  // doc.line(10, yPosition, pageWidth - 10, yPosition);
  // yPosition += 8;

  // Order Details
  doc.setFontSize(headerSize);
  doc.setFont('helvetica', 'bold');
  doc.text('Order Details:', 10, yPosition);
  yPosition += 6;

  doc.setFontSize(normalSize);
  doc.setFont('helvetica', 'normal');

  // List all products with mobile-friendly layout
  order.orderDetails.forEach((item, index) => {
    if (yPosition > (pageHeight - 30)) {
      doc.addPage();
      yPosition = 15;
    }

    const productText = `${item.productName} (${item.quantity} PCS)`;
    if (item.selectedSize) {
      doc.text(`${productText} - Size: ${item.selectedSize}`, 10, yPosition);
    } else {
      doc.text(productText, 10, yPosition);
    }
    yPosition += 5;
  });
  yPosition += 8;

  // Add line separator
  // doc.setLineWidth(0.3);
  // doc.line(10, yPosition, pageWidth - 10, yPosition);
  // yPosition += 8;

  // Sender Information (From)
  doc.setFontSize(headerSize);
  doc.setFont('helvetica', 'bold');
  doc.text('From:', 10, yPosition);
  yPosition += 6;

  doc.setFontSize(normalSize);
  doc.setFont('helvetica', 'normal');
  doc.text('BARGAATI', 10, yPosition);
  yPosition += 5;

  // Split address for mobile format
  doc.text('Ground floor, 640/1', 10, yPosition);
  yPosition += 5;
  doc.text('Vinayaka green park layout', 10, yPosition);
  yPosition += 5;
  doc.text('Maragondanahalli, Bangalore-560036', 10, yPosition);
  yPosition += 5;
  doc.text('Phone: 9740366124', 10, yPosition);
  yPosition += 10;

  // Add line separator
  // doc.line(20, yPosition, 190, yPosition);
  // yPosition += 10;

  // Price Details
  // doc.setFontSize(headerSize);
  // doc.setFont('helvetica', 'bold');
  // doc.text('Price Details:', 20, yPosition);
  // yPosition += 8;

  // doc.setFontSize(normalSize);
  // doc.setFont('helvetica', 'normal');
  // doc.text(`Subtotal: ₹${order.priceDetails.subtotal.toFixed(2)}`, 20, yPosition);
  // yPosition += 6;

  // doc.text(`Tax: ₹${order.priceDetails.tax.toFixed(2)}`, 20, yPosition);
  // yPosition += 6;

  // doc.text(`Shipping: ₹${order.priceDetails.shipping.toFixed(2)}`, 20, yPosition);
  // yPosition += 6;

  // doc.setFont('helvetica', 'bold');
  // doc.text(`Total: ₹${order.priceDetails.total.toFixed(2)}`, 20, yPosition);
  // yPosition += 15;

  // Add footer
  // doc.setFontSize(smallSize);
  // doc.setFont('helvetica', 'normal');
  // doc.text(`Order ID: ${order.id} | Date: ${order.orderDate}`, 105, yPosition, { align: 'center' });
  // yPosition += 5;

  // if (order.trackingid) {
  //   doc.text(`Tracking ID: ${order.trackingid} | Courier: ${order.couriercompany}`, 105, yPosition, { align: 'center' });
  // }
};

export const generateBillPDF = async (order) => {
  // Create PDF with custom mobile page size
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [140, 200] // Custom mobile size: width x height in mm
  });
  drawBillOnDoc(doc, order);
  const fileName = `Bill_Order_${order.id}_${Date.now()}.pdf`;
  doc.save(fileName);
  return fileName;
};

export const generateCombinedBillsPDF = async (orders, fileName) => {
  // Create PDF with custom mobile page size
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [140, 200] // Custom mobile size: width x height in mm
  });
  orders.forEach((order, idx) => {
    if (idx > 0) doc.addPage();
    drawBillOnDoc(doc, order);
  });
  const name = fileName || `Bills_${Date.now()}.pdf`;
  doc.save(name);
  return name;
};

// Helper function to convert number to words
const numberToWords = (num) => {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
            'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  if (num === 0) return 'Zero';
  
  let n = Math.floor(num);
  const decimals = Math.round((num - n) * 100);
  
  let result = '';
  
  if (n >= 1000) {
    result += numberToWords(Math.floor(n / 1000)) + ' Thousand ';
    n %= 1000;
  }
  
  if (n >= 100) {
    result += a[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  
  if (n > 19) {
    result += b[Math.floor(n / 10)] + ' ' + a[n % 10];
  } else if (n > 0) {
    result += a[n];
  }
  
  if (decimals > 0) {
    result += ' and ' + decimals + '/100';
  }
  
  return result.trim();
};
