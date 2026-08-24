import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  TrendingUp,
  Package,
  ShoppingCart,
  AlertTriangle,
  FileSpreadsheet,
  DollarSign,
  Layers,
  Calendar,
  Download,
  Printer,
  Filter,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  Search,
  Truck
} from 'lucide-react'
import { subscribeToOrders, subscribeToProducts } from '@/lib/firebase'
import {
  filterOrdersByDateRange,
  aggregateSoldProducts,
  exportSalesToExcelCSV,
  exportStyledHtmlReport,
  SoldProductAggregated
} from '@/lib/reports-exporter'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, Order, Product, PharmacySettings } from '@/lib/types'

interface ReportsManagerProps {
  currency: string
  settings?: PharmacySettings
}

export function ReportsManager({ currency, settings }: ReportsManagerProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  // Default dates: Start of current month to today
  const todayStr = useMemo(() => {
    const d = new Date()
    return d.toISOString().split('T')[0]
  }, [])

  const startOfMonthStr = useMemo(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  }, [])

  const [startDate, setStartDate] = useState(startOfMonthStr)
  const [endDate, setEndDate] = useState(todayStr)
  const [statusFilter, setStatusFilter] = useState('all')
  const [productSearch, setProductSearch] = useState('')

  // Quick Range Presets
  const handleSetPreset = (preset: 'today' | 'week' | 'month' | 'year' | 'all') => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    setEndDate(today)

    if (preset === 'today') {
      setStartDate(today)
    } else if (preset === 'week') {
      const d = new Date()
      d.setDate(d.getDate() - 7)
      setStartDate(d.toISOString().split('T')[0])
    } else if (preset === 'month') {
      const d = new Date()
      d.setDate(1)
      setStartDate(d.toISOString().split('T')[0])
    } else if (preset === 'year') {
      const d = new Date()
      d.setMonth(0, 1)
      setStartDate(d.toISOString().split('T')[0])
    } else if (preset === 'all') {
      setStartDate('2020-01-01')
    }
  }

  // Load Realtime Firebase data
  useEffect(() => {
    let isMounted = true

    const unsubOrders = subscribeToOrders((newOrders) => {
      if (isMounted) {
        setOrders(newOrders)
        setLoading(false)
      }
    })

    const unsubProducts = subscribeToProducts((newProducts) => {
      if (isMounted) {
        setProducts(newProducts)
      }
    })

    return () => {
      isMounted = false
      unsubOrders()
      unsubProducts()
    }
  }, [])

  // Filter orders according to selected period & status
  const filteredOrders = useMemo(() => {
    return filterOrdersByDateRange(orders, startDate, endDate, statusFilter)
  }, [orders, startDate, endDate, statusFilter])

  // Aggregated sold items in that period
  const soldProductsList = useMemo(() => {
    return aggregateSoldProducts(filteredOrders, products)
  }, [filteredOrders, products])

  // Search filtered sold items
  const displaySoldProducts = useMemo(() => {
    if (!productSearch.trim()) return soldProductsList
    const q = productSearch.toLowerCase()
    return soldProductsList.filter(
      (p) =>
        p.productName.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    )
  }, [soldProductsList, productSearch])

  // Summary Metrics for the filtered period
  const periodMetrics = useMemo(() => {
    const totalSoldUnits = soldProductsList.reduce((sum, p) => sum + p.totalQuantitySold, 0)
    const totalProductsRevenue = soldProductsList.reduce((sum, p) => sum + p.totalSalesAmount, 0)
    const totalShipping = filteredOrders.reduce((sum, o) => sum + (o.shippingCost || 0), 0)
    const grandTotal = filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0)
    const ordersCount = filteredOrders.length
    const deliveredCount = filteredOrders.filter((o) => o.status === 'delivered').length
    const pendingCount = filteredOrders.filter((o) => o.status === 'pending').length
    const avgOrderValue = ordersCount > 0 ? grandTotal / ordersCount : 0

    return {
      totalSoldUnits,
      totalProductsRevenue,
      totalShipping,
      grandTotal,
      ordersCount,
      deliveredCount,
      pendingCount,
      avgOrderValue
    }
  }, [soldProductsList, filteredOrders])

  // All-time inventory breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { count: number; totalStock: number; value: number }> = {}
    products.forEach((p) => {
      const cat = p.category || 'أخرى'
      if (!map[cat]) {
        map[cat] = { count: 0, totalStock: 0, value: 0 }
      }
      map[cat].count += 1
      map[cat].totalStock += p.stock
      map[cat].value += p.stock * p.price
    })
    return Object.entries(map).map(([category, val]) => ({
      category,
      products: val.count,
      totalStock: val.totalStock,
      value: val.value
    }))
  }, [products])

  const maxCategoryValue = Math.max(...categoryBreakdown.map((c) => c.value), 1)

  const pharmacyName = settings?.pharmacyName || 'الصيدلية'

  const handleExportExcel = () => {
    exportSalesToExcelCSV({
      pharmacyName,
      startDate,
      endDate,
      currency,
      orders: filteredOrders,
      soldProducts: soldProductsList
    })
  }

  const handlePrintReport = () => {
    exportStyledHtmlReport({
      pharmacyName,
      startDate,
      endDate,
      currency,
      orders: filteredOrders,
      soldProducts: soldProductsList
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="h-8 w-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector & Export Controls Banner */}
      <Card className="border-emerald-200 bg-linear-to-r from-emerald-50/80 via-white to-slate-50 shadow-xs">
        <CardHeader className="pb-3 border-b border-emerald-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-emerald-600" />
                تحديد فترة التقرير وتصدير المبيعات
              </CardTitle>
              <CardDescription className="text-xs text-slate-600 mt-0.5">
                حدد التاريخ من وإلى لاستخراج كشف الأصناف المباعة وحساب الأرباح ثم تصديرها لإكسل بتنسيق احترافي
              </CardDescription>
            </div>

            {/* Export Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={handleExportExcel}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs font-bold h-9 shadow-xs"
              >
                <FileSpreadsheet className="h-4 w-4" />
                تصدير ملف إكسل (Excel / CSV)
              </Button>
              <Button
                onClick={handlePrintReport}
                variant="outline"
                className="border-slate-300 bg-white hover:bg-slate-100 text-slate-800 gap-2 text-xs font-semibold h-9 shadow-xs"
              >
                <Printer className="h-4 w-4 text-slate-600" />
                طباعة / PDF
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-600 ml-1">فترات سريعة:</span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs bg-white border-slate-300"
              onClick={() => handleSetPreset('today')}
            >
              اليوم
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs bg-white border-slate-300"
              onClick={() => handleSetPreset('week')}
            >
              آخر 7 أيام
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs bg-white border-slate-300"
              onClick={() => handleSetPreset('month')}
            >
              هذا الشهر
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs bg-white border-slate-300"
              onClick={() => handleSetPreset('year')}
            >
              هذه السنة
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs bg-white border-slate-300"
              onClick={() => handleSetPreset('all')}
            >
              كل السجلات
            </Button>
          </div>

          {/* Date Range Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">الفترة من تاريخ:</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-xs bg-white border-slate-300 text-slate-900"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">إلى تاريخ:</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-xs bg-white border-slate-300 text-slate-900"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">حالة الطلبات المشمولة:</Label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-slate-900 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">جميع الحالات (ما عدا الملغية للإحصائيات)</option>
                <option value="delivered">الطلبات المسلمة فقط (Delivered)</option>
                <option value="confirmed">المؤكدة (Confirmed)</option>
                <option value="pending">قيد الانتظار (Pending)</option>
                <option value="preparing">قيد التحضير (Preparing)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards for the selected period */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">مبيعات المنتجات للفترة</p>
                <p className="text-xl font-bold text-emerald-600 mt-1">
                  {periodMetrics.totalProductsRevenue.toFixed(2)}{' '}
                  <span className="text-xs font-normal text-slate-500">{currency}</span>
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
              <span>الإيراد الكلي بالشحن:</span>
              <strong className="text-slate-800">{periodMetrics.grandTotal.toFixed(2)} {currency}</strong>
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">الكميات المباعة للفترة</p>
                <p className="text-xl font-bold text-blue-600 mt-1">
                  {periodMetrics.totalSoldUnits}{' '}
                  <span className="text-xs font-normal text-slate-500">قطعة</span>
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
                <Package className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              من إجمالي {soldProductsList.length} صنف مختلف
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">عدد الطلبات بالفترة</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {periodMetrics.ordersCount}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700">
                <ShoppingCart className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {periodMetrics.deliveredCount} مسلّم • {periodMetrics.pendingCount} قيد الانتظار
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">رسوم التوصيل المحصلة</p>
                <p className="text-xl font-bold text-amber-600 mt-1">
                  {periodMetrics.totalShipping.toFixed(2)}{' '}
                  <span className="text-xs font-normal text-slate-500">{currency}</span>
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
                <Truck className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              متوسط قيمة الطلب: {periodMetrics.avgOrderValue.toFixed(2)} {currency}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed breakdown */}
      <Tabs defaultValue="sold-items" className="space-y-4">
        <TabsList className="bg-slate-100 border border-slate-200 p-1">
          <TabsTrigger value="sold-items" className="text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-xs">
            <TrendingUp className="h-4 w-4" />
            الأصناف المباعة خلال الفترة ({soldProductsList.length})
          </TabsTrigger>
          <TabsTrigger value="orders-list" className="text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-xs">
            <ShoppingCart className="h-4 w-4" />
            الطلبات المنفذة في الفترة ({filteredOrders.length})
          </TabsTrigger>
          <TabsTrigger value="inventory" className="text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-xs">
            <Layers className="h-4 w-4" />
            المخزون الكلي والتصنيفات
          </TabsTrigger>
        </TabsList>

        {/* 1. Sold Items Table */}
        <TabsContent value="sold-items" className="space-y-4">
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  تفاصيل الأصناف المباعة للفترة من ({startDate || 'البداية'}) إلى ({endDate || 'اليوم'})
                </CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="بحث في الأصناف المباعة..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="h-9 pr-9 text-xs bg-slate-50 border-slate-300"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {displaySoldProducts.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  لا توجد مبيعات مسجلة في الفترة المحددة ({startDate} إلى {endDate})
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-right w-12">#</TableHead>
                        <TableHead className="text-right">اسم الصنف / الدواء</TableHead>
                        <TableHead className="text-right">التصنيف</TableHead>
                        <TableHead className="text-center">سعر الوحدة</TableHead>
                        <TableHead className="text-center">الكمية المباعة</TableHead>
                        <TableHead className="text-center">عدد الطلبات</TableHead>
                        <TableHead className="text-left">إجمالي المبيعات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displaySoldProducts.map((p, idx) => (
                        <TableRow key={p.productId || idx} className="hover:bg-slate-50/80">
                          <TableCell className="font-mono text-xs text-slate-500">{idx + 1}</TableCell>
                          <TableCell className="font-semibold text-slate-900 text-sm">{p.productName}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-200">
                              {p.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs text-slate-700">
                            {p.unitPrice.toFixed(2)} {currency}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-xs">
                              {p.totalQuantitySold} قطعة
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs text-slate-600">
                            {p.ordersCount} طلب
                          </TableCell>
                          <TableCell className="text-left font-bold text-emerald-700 font-mono text-sm">
                            {p.totalSalesAmount.toFixed(2)} {currency}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Filtered Orders Table */}
        <TabsContent value="orders-list" className="space-y-4">
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-emerald-600" />
                سجل الطلبات المنفذة في الفترة المحددة ({filteredOrders.length} طلب)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  لا توجد طلبات مسجلة في هذه الفترة
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-right">رقم الطلب</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">العميل</TableHead>
                        <TableHead className="text-right">المحافظة</TableHead>
                        <TableHead className="text-center">عدد الأصناف</TableHead>
                        <TableHead className="text-center">الحالة</TableHead>
                        <TableHead className="text-left">الإجمالي النهائي</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((o) => (
                        <TableRow key={o.id} className="hover:bg-slate-50/80">
                          <TableCell className="font-mono font-bold text-xs text-emerald-700">
                            #{o.id.slice(-6).toUpperCase()}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {new Date(o.createdAt).toLocaleString('ar-EG', {
                              dateStyle: 'short',
                              timeStyle: 'short'
                            })}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-semibold text-xs text-slate-900">{o.customerName}</p>
                              <p className="text-[11px] text-slate-500 font-mono" dir="ltr">
                                {o.customerPhone}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {o.governorate || '—'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-xs font-mono">
                            {o.items?.length || 0} صنف
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={`text-[11px] border ${ORDER_STATUS_COLORS[o.status] || ''}`}
                              variant="outline"
                            >
                              {ORDER_STATUS_LABELS[o.status] || o.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-left font-bold text-slate-900 font-mono text-sm">
                            {o.totalAmount.toFixed(2)} {currency}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                <Layers className="h-4 w-4 text-emerald-600" />
                توزيع المخزون حسب التصنيف
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryBreakdown.map((cat, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{cat.category}</span>
                        <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-700">
                          {cat.products} صنف
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">{cat.totalStock} قطعة</span>
                        <span className="font-semibold text-emerald-700">{cat.value.toFixed(2)} {currency}</span>
                      </div>
                    </div>
                    <div className="bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max((cat.value / maxCategoryValue) * 100, 5)}%`,
                          backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'][idx % 6]
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
