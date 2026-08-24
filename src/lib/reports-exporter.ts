import type { Order, Product } from './types'

export interface ReportDateFilter {
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  statusFilter: string // 'all' or specific status
}

export interface SoldProductAggregated {
  productId: string
  productName: string
  category: string
  unitPrice: number
  totalQuantitySold: number
  totalSalesAmount: number
  ordersCount: number
}

/**
 * Filter orders strictly between startDate (00:00:00) and endDate (23:59:59)
 */
export function filterOrdersByDateRange(
  orders: Order[],
  startDate: string,
  endDate: string,
  statusFilter = 'all'
): Order[] {
  const startTimestamp = startDate ? new Date(`${startDate}T00:00:00`).getTime() : 0
  const endTimestamp = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : Infinity

  return orders.filter((order) => {
    const orderTime = new Date(order.createdAt).getTime()
    if (isNaN(orderTime)) return false

    const matchesDate = orderTime >= startTimestamp && orderTime <= endTimestamp
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter

    return matchesDate && matchesStatus
  })
}

/**
 * Aggregate sales per product for the filtered orders
 */
export function aggregateSoldProducts(
  orders: Order[],
  productsList: Product[] = []
): SoldProductAggregated[] {
  const map: Record<string, SoldProductAggregated> = {}

  // Map product categories for quick lookup
  const productCategoryMap = new Map<string, string>()
  productsList.forEach((p) => {
    productCategoryMap.set(p.id, p.category || 'أخرى')
  })

  // We only count orders that are not cancelled
  const validOrders = orders.filter((o) => o.status !== 'cancelled')

  validOrders.forEach((order) => {
    order.items.forEach((item) => {
      const key = item.productId || item.productName
      if (!map[key]) {
        map[key] = {
          productId: item.productId,
          productName: item.productName,
          category: productCategoryMap.get(item.productId) || 'أدوية ومستلزمات',
          unitPrice: item.unitPrice,
          totalQuantitySold: 0,
          totalSalesAmount: 0,
          ordersCount: 0
        }
      }

      map[key].totalQuantitySold += item.quantity
      map[key].totalSalesAmount += item.totalPrice || item.quantity * item.unitPrice
      map[key].ordersCount += 1
    })
  })

  return Object.values(map).sort((a, b) => b.totalSalesAmount - a.totalSalesAmount)
}

/**
 * Generate a clean, styled CSV that opens seamlessly in Excel with UTF-8 BOM and RTL alignment
 */
export function exportSalesToExcelCSV(options: {
  pharmacyName: string
  startDate: string
  endDate: string
  currency: string
  orders: Order[]
  soldProducts: SoldProductAggregated[]
}) {
  const { pharmacyName, startDate, endDate, currency, orders, soldProducts } = options

  const totalQuantity = soldProducts.reduce((sum, p) => sum + p.totalQuantitySold, 0)
  const totalSales = soldProducts.reduce((sum, p) => sum + p.totalSalesAmount, 0)
  const totalShipping = orders.reduce((sum, o) => sum + (o.shippingCost || 0), 0)
  const totalOrdersAmount = orders.reduce((sum, o) => sum + o.totalAmount, 0)

  // Build CSV Rows
  const rows: string[][] = [
    // Header & Meta
    [`تقرير المبيعات وحركة الأصناف — ${pharmacyName}`],
    [`تاريخ استخراج التقرير:`, new Date().toLocaleString('ar-EG'), `الفترة من:`, startDate || 'البداية', `إلى:`, endDate || 'اليوم'],
    [`إجمالي عدد الطلبات:`, String(orders.length), `إجمالي القطع المباعة:`, String(totalQuantity), `إجمالي مبيعات المنتجات:`, `${totalSales.toFixed(2)} ${currency}`],
    [`إجمالي رسوم التوصيل:`, `${totalShipping.toFixed(2)} ${currency}`, `إجمالي الإيرادات الكلية:`, `${totalOrdersAmount.toFixed(2)} ${currency}`],
    [],
    // Table 1: Sold Products Summary
    [`جدول الأصناف المباعة بالتفصيل`],
    [
      `م`,
      `اسم الصنف / الدواء`,
      `التصنيف`,
      `متوسط سعر الوحدة (${currency})`,
      `الكمية المباعة (وحدة)`,
      `إجمالي المبيعات (${currency})`,
      `عدد مرات الطلب`
    ],
    ...soldProducts.map((p, idx) => [
      String(idx + 1),
      `"${p.productName.replace(/"/g, '""')}"`,
      `"${p.category.replace(/"/g, '""')}"`,
      p.unitPrice.toFixed(2),
      String(p.totalQuantitySold),
      p.totalSalesAmount.toFixed(2),
      String(p.ordersCount)
    ]),
    [
      `الإجمالي`,
      `—`,
      `—`,
      `—`,
      String(totalQuantity),
      `${totalSales.toFixed(2)} ${currency}`,
      String(orders.length)
    ],
    [],
    [],
    // Table 2: Detailed Orders in this period
    [`تفاصيل الطلبات خلال الفترة`],
    [
      `رقم الطلب`,
      `تاريخ الطلب`,
      `اسم العميل`,
      `رقم هاتف العميل`,
      `المحافظة`,
      `عنوان التوصيل`,
      `حالة الطلب`,
      `قيمة المنتجات (${currency})`,
      `سعر الشحن (${currency})`,
      `الإجمالي الكلي (${currency})`,
      `الأصناف والكميات`
    ],
    ...orders.map((o) => {
      const itemsSummary = o.items
        .map((i) => `${i.productName} (×${i.quantity})`)
        .join(' + ')

      const dateStr = new Date(o.createdAt).toLocaleString('ar-EG')
      const subtotalVal = o.subtotal ?? (o.totalAmount - (o.shippingCost || 0))

      return [
        `"#${o.id.slice(-6).toUpperCase()}"`,
        `"${dateStr}"`,
        `"${(o.customerName || '').replace(/"/g, '""')}"`,
        `"${o.customerPhone || ''}"`,
        `"${o.governorate || '—'}"`,
        `"${(o.customerAddress || '—').replace(/"/g, '""')}"`,
        `"${o.status}"`,
        subtotalVal.toFixed(2),
        (o.shippingCost || 0).toFixed(2),
        o.totalAmount.toFixed(2),
        `"${itemsSummary.replace(/"/g, '""')}"`
      ]
    })
  ]

  // Add UTF-8 BOM so Excel opens Arabic text flawlessly without scrambled encoding
  const csvContent = '\uFEFF' + rows.map((r) => r.join(',')).join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute(
    'download',
    `sales_report_${pharmacyName.replace(/\s+/g, '_')}_${startDate || 'all'}_to_${endDate || 'today'}.csv`
  )
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Generate a beautifully styled, printable & saveable Excel/HTML report with charts and corporate styling
 */
export function exportStyledHtmlReport(options: {
  pharmacyName: string
  startDate: string
  endDate: string
  currency: string
  orders: Order[]
  soldProducts: SoldProductAggregated[]
}) {
  const { pharmacyName, startDate, endDate, currency, orders, soldProducts } = options

  const totalQuantity = soldProducts.reduce((sum, p) => sum + p.totalQuantitySold, 0)
  const totalSales = soldProducts.reduce((sum, p) => sum + p.totalSalesAmount, 0)
  const totalShipping = orders.reduce((sum, o) => sum + (o.shippingCost || 0), 0)
  const totalGrand = orders.reduce((sum, o) => sum + o.totalAmount, 0)

  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const htmlContent = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>تقرير مبيعات ${pharmacyName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
    body {
      font-family: 'Cairo', sans-serif;
      background: #f8fafc;
      color: #0f172a;
      padding: 30px;
      margin: 0;
    }
    .header {
      background: #065f46;
      color: white;
      padding: 24px;
      border-radius: 12px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header h1 { margin: 0 0 6px 0; font-size: 22px; }
    .header p { margin: 0; opacity: 0.9; font-size: 13px; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .stat-card .label { font-size: 12px; color: #64748b; margin-bottom: 4px; }
    .stat-card .value { font-size: 20px; font-weight: 700; color: #047857; }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      margin: 24px 0 12px 0;
      color: #1e293b;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      margin-bottom: 24px;
      font-size: 13px;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      padding: 12px 14px;
      text-align: right;
      border-bottom: 2px solid #cbd5e1;
    }
    td {
      padding: 10px 14px;
      border-bottom: 1px solid #e2e8f0;
      color: #1e293b;
    }
    tr:nth-child(even) td { background: #f8fafc; }
    tr:last-child td { border-bottom: none; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      background: #e2e8f0;
      color: #334155;
    }
    .actions-bar {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-bottom: 20px;
    }
    .btn {
      padding: 8px 16px;
      border-radius: 6px;
      border: none;
      font-family: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-primary { background: #059669; color: white; }
    @media print {
      body { background: white; padding: 0; }
      .actions-bar { display: none; }
      .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="actions-bar">
    <button class="btn btn-primary" onclick="window.print()">طباعة / تصدير PDF</button>
  </div>

  <div class="header">
    <div>
      <h1>تقرير المبيعات وحركة الأصناف — ${pharmacyName}</h1>
      <p>الفترة المحددة: من <strong>${startDate || 'البداية'}</strong> إلى <strong>${endDate || 'اليوم'}</strong></p>
    </div>
    <div style="text-align: left;">
      <p>تاريخ الإصدار: ${new Date().toLocaleDateString('ar-EG')}</p>
      <p>عدد الطلبات: ${orders.length} طلب</p>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="label">إجمالي المبيعات (المنتجات)</div>
      <div class="value">${totalSales.toFixed(2)} ${currency}</div>
    </div>
    <div class="stat-card">
      <div class="label">إجمالي رسوم التوصيل</div>
      <div class="value" style="color: #0284c7;">${totalShipping.toFixed(2)} ${currency}</div>
    </div>
    <div class="stat-card">
      <div class="label">الإيرادات الكلية الشاملة</div>
      <div class="value" style="color: #059669;">${totalGrand.toFixed(2)} ${currency}</div>
    </div>
    <div class="stat-card">
      <div class="label">إجمالي الوحدات المباعة</div>
      <div class="value" style="color: #7c3aed;">${totalQuantity} قطعة</div>
    </div>
  </div>

  <div class="section-title">الأصناف المباعة خلال الفترة</div>
  <table>
    <thead>
      <tr>
        <th style="width: 40px;">#</th>
        <th>اسم الصنف</th>
        <th>التصنيف</th>
        <th>سعر الوحدة</th>
        <th>الكمية المباعة</th>
        <th>مرات الطلب</th>
        <th>إجمالي القيمة</th>
      </tr>
    </thead>
    <tbody>
      ${
        soldProducts.length === 0
          ? '<tr><td colspan="7" style="text-align:center; padding: 20px; color:#94a3b8;">لا توجد مبيعات مسجلة في هذه الفترة</td></tr>'
          : soldProducts
              .map(
                (p, i) => `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${p.productName}</strong></td>
          <td><span class="badge">${p.category}</span></td>
          <td>${p.unitPrice.toFixed(2)} ${currency}</td>
          <td style="font-weight: 700; color: #047857;">${p.totalQuantitySold}</td>
          <td>${p.ordersCount}</td>
          <td style="font-weight: 700; color: #0f172a;">${p.totalSalesAmount.toFixed(2)} ${currency}</td>
        </tr>
      `
              )
              .join('')
      }
    </tbody>
  </table>

  <div class="section-title">تفاصيل الطلبات (${orders.length} طلب)</div>
  <table>
    <thead>
      <tr>
        <th>رقم الطلب</th>
        <th>التاريخ</th>
        <th>العميل</th>
        <th>الهاتف</th>
        <th>المحافظة</th>
        <th>الحالة</th>
        <th>الإجمالي</th>
      </tr>
    </thead>
    <tbody>
      ${
        orders.length === 0
          ? '<tr><td colspan="7" style="text-align:center; padding: 20px; color:#94a3b8;">لا توجد طلبات في هذه الفترة</td></tr>'
          : orders
              .map(
                (o) => `
        <tr>
          <td><strong>#${o.id.slice(-6).toUpperCase()}</strong></td>
          <td>${new Date(o.createdAt).toLocaleDateString('ar-EG')}</td>
          <td>${o.customerName}</td>
          <td dir="ltr" style="text-align: right;">${o.customerPhone}</td>
          <td>${o.governorate || '—'}</td>
          <td><span class="badge">${o.status}</span></td>
          <td style="font-weight: 700; color: #059669;">${o.totalAmount.toFixed(2)} ${currency}</td>
        </tr>
      `
              )
              .join('')
      }
    </tbody>
  </table>
</body>
</html>
  `

  printWindow.document.write(htmlContent)
  printWindow.document.close()
}
