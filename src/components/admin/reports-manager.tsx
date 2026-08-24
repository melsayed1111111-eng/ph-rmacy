import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  TrendingUp,
  Package,
  ShoppingCart,
  AlertTriangle,
  FileText,
  DollarSign,
  Layers,
  ArrowUpRight,
  TrendingDown
} from 'lucide-react'
import Image from '@/components/common/Image'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/types'

interface ReportData {
  summary: {
    totalRevenue: number
    deliveredRevenue: number
    totalOrders: number
    averageOrderValue: number
    totalProducts: number
    activeProducts: number
    totalStockUnits: number
    totalInventoryValue: number
    outOfStockCount: number
    lowStockCount: number
  }
  sales: {
    todayRevenue: number
    todayOrders: number
    thisWeekRevenue: number
    thisWeekOrders: number
    thisMonthRevenue: number
    thisMonthOrders: number
    topSellingProducts: Array<{
      productId: string
      name: string
      category: string
      totalSold: number
      totalRevenue: number
      image?: string
    }>
  }
  inventory: {
    categoryBreakdown: Array<{
      category: string
      products: number
      totalStock: number
      value: number
    }>
    lowStockProducts: Array<{
      id: string
      name: string
      category: string
      stock: number
      price: number
      image?: string
    }>
  }
  orders: {
    ordersByStatus: Array<{
      status: string
      count: number
    }>
    recentOrders: Array<{
      id: string
      customerName: string
      customerPhone: string
      totalAmount: number
      status: string
      itemsCount: number
      createdAt: string
    }>
  }
}

export function ReportsManager({ currency }: { currency: string }) {
  const [data, setData] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch('/api/reports')
        if (res.ok) {
          const reportData = await res.json()
          setData(reportData)
        }
      } catch (error) {
        console.error('Error fetching reports:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchReports()
  }, [])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="h-8 w-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          لا تتوفر تقارير حالياً
        </CardContent>
      </Card>
    )
  }

  const maxCategoryValue = Math.max(...data.inventory.categoryBreakdown.map((c) => c.value), 1)

  return (
    <div className="space-y-6">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">إجمالي المبيعات</p>
                <p className="text-xl font-bold text-emerald-600 mt-1">
                  {data.summary.totalRevenue.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">{currency}</span>
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              متوسط الطلب: {data.summary.averageOrderValue.toFixed(2)} {currency}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">إجمالي الطلبات</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {data.summary.totalOrders}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600">
                <ShoppingCart className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              اليوم: {data.sales.todayOrders} طلب ({data.sales.todayRevenue.toFixed(2)} {currency})
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">قيمة المخزون</p>
                <p className="text-xl font-bold text-purple-600 mt-1">
                  {data.summary.totalInventoryValue.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">{currency}</span>
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-100 text-purple-600">
                <Package className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              {data.summary.totalProducts} صنف ({data.summary.totalStockUnits} قطعة)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">تنبيهات النواقص</p>
                <p className="text-xl font-bold text-rose-600 mt-1">
                  {data.summary.outOfStockCount + data.summary.lowStockCount}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[11px] text-rose-600 mt-2">
              {data.summary.outOfStockCount} نفذ بالكامل • {data.summary.lowStockCount} منخفض
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList className="bg-gray-100">
          <TabsTrigger value="sales" className="text-xs">المبيعات والأكثر طلباً</TabsTrigger>
          <TabsTrigger value="inventory" className="text-xs">توزيع المخزون</TabsTrigger>
          <TabsTrigger value="orders" className="text-xs">حالات الطلبات</TabsTrigger>
        </TabsList>

        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">مبيعات اليوم</p>
                <p className="text-xl font-bold text-emerald-600 mt-1">
                  {data.sales.todayRevenue.toFixed(2)} {currency}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{data.sales.todayOrders} طلب</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">مبيعات هذا الأسبوع</p>
                <p className="text-xl font-bold text-blue-600 mt-1">
                  {data.sales.thisWeekRevenue.toFixed(2)} {currency}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{data.sales.thisWeekOrders} طلب</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">مبيعات هذا الشهر</p>
                <p className="text-xl font-bold text-purple-600 mt-1">
                  {data.sales.thisMonthRevenue.toFixed(2)} {currency}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{data.sales.thisMonthOrders} طلب</p>
              </CardContent>
            </Card>
          </div>

          {/* Top Selling */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                المنتجات الأكثر مبيعاً
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.sales.topSellingProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">لا توجد مبيعات مسجلة حتى الآن</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المنتج</TableHead>
                      <TableHead>التصنيف</TableHead>
                      <TableHead className="text-center">الكمية المباعة</TableHead>
                      <TableHead className="text-center">إجمالي المبيعات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.sales.topSellingProducts.map((p, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium text-sm">{p.name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{p.category}</Badge></TableCell>
                        <TableCell className="text-center font-bold">{p.totalSold} وحدة</TableCell>
                        <TableCell className="text-center font-bold text-emerald-600">
                          {p.totalRevenue.toFixed(2)} {currency}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Layers className="h-4 w-4" />
                توزيع المخزون حسب التصنيف
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.inventory.categoryBreakdown.map((cat, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{cat.category}</span>
                        <Badge variant="secondary" className="text-[10px]">{cat.products} منتج</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{cat.totalStock} وحدة</span>
                        <span className="font-semibold">{cat.value.toFixed(2)} {currency}</span>
                      </div>
                    </div>
                    <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max((cat.value / maxCategoryValue) * 100, 5)}%`,
                          backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][idx % 6]
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {data.orders.ordersByStatus.map((s) => (
              <Card key={s.status}>
                <CardContent className="p-3 text-center">
                  <Badge className={`text-xs border ${ORDER_STATUS_COLORS[s.status as keyof typeof ORDER_STATUS_COLORS] || ''}`} variant="outline">
                    {ORDER_STATUS_LABELS[s.status as keyof typeof ORDER_STATUS_LABELS] || s.status}
                  </Badge>
                  <p className="text-2xl font-bold mt-2">{s.count}</p>
                  <p className="text-[10px] text-muted-foreground">طلب</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
