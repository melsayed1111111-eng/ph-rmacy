import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ShoppingCart,
  Eye,
  MessageCircle,
  Phone,
  Calendar,
  CheckCircle,
  Clock,
  ExternalLink,
  Copy,
  AlertCircle,
  Zap
} from 'lucide-react'
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  type Order,
  type OrderStatus,
  type PharmacySettings
} from '@/lib/types'
import {
  normalizeWhatsAppNumber,
  generateWhatsAppInvoiceMessage,
  openWhatsApp,
  buildWhatsAppUrl
} from '@/lib/phone-utils'
import {
  subscribeToOrders,
  updateOrderStatusInFirebase,
  deleteOrderFromFirebase
} from '@/lib/firebase'

interface OrdersManagerProps {
  currency: string
  settings: PharmacySettings
}

export function OrdersManager({ currency, settings }: OrdersManagerProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [copiedInvoice, setCopiedInvoice] = useState(false)

  useEffect(() => {
    const unsubscribe = subscribeToOrders((realtimeOrders) => {
      setOrders(realtimeOrders)
      setIsLoading(false)
      if (selectedOrder) {
        const updated = realtimeOrders.find((o) => o.id === selectedOrder.id)
        if (updated) setSelectedOrder(updated)
      }
    })

    return () => unsubscribe()
  }, [selectedOrder])

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await updateOrderStatusInFirebase(orderId, status)
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => prev ? { ...prev, status } : null)
      }
    } catch (error) {
      console.error('Error updating order status:', error)
    }
  }

  const filteredOrders = filterStatus === 'all'
    ? orders
    : orders.filter((o) => o.status === filterStatus)

  // Quick stats
  const totalOrders = orders.length
  const pendingOrders = orders.filter((o) => o.status === 'pending').length
  const deliveredOrders = orders.filter((o) => o.status === 'delivered').length
  const totalRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.totalAmount, 0)

  const handleSendInvoiceToCustomer = (order: Order) => {
    const invoiceMsg = generateWhatsAppInvoiceMessage({
      orderId: order.id,
      pharmacyName: settings.pharmacyName || 'الصيدلية',
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      governorate: order.governorate,
      shippingCost: order.shippingCost,
      subtotal: order.subtotal,
      notes: order.notes,
      items: order.items.map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice
      })),
      totalAmount: order.totalAmount,
      currency: settings.currency || currency,
      date: order.createdAt
    })

    openWhatsApp(order.customerPhone, invoiceMsg)
  }

  const handleCopyInvoice = (order: Order) => {
    const invoiceMsg = generateWhatsAppInvoiceMessage({
      orderId: order.id,
      pharmacyName: settings.pharmacyName || 'الصيدلية',
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      governorate: order.governorate,
      shippingCost: order.shippingCost,
      subtotal: order.subtotal,
      notes: order.notes,
      items: order.items.map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice
      })),
      totalAmount: order.totalAmount,
      currency: settings.currency || currency,
      date: order.createdAt
    })

    navigator.clipboard.writeText(invoiceMsg)
    setCopiedInvoice(true)
    setTimeout(() => setCopiedInvoice(false), 3000)
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <ShoppingCart className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">إجمالي الطلبات</p>
                <p className="text-xl font-bold">{totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">قيد الانتظار</p>
                <p className="text-xl font-bold text-amber-600">{pendingOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">تم التسليم</p>
                <p className="text-xl font-bold text-green-600">{deliveredOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <span className="text-lg font-bold text-emerald-600">{currency}</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">إجمالي المبيعات</p>
                <p className="text-xl font-bold text-emerald-600">{totalRevenue.toFixed(2)} <span className="text-xs font-normal">{currency}</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <ShoppingCart className="h-5 w-5" />
              سجل الطلبات والفواتير ({filteredOrders.length})
            </CardTitle>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-9 rounded-md border border-input bg-white px-3 text-xs"
              >
                <option value="all">جميع الحالات</option>
                <option value="pending">قيد الانتظار</option>
                <option value="confirmed">مؤكد</option>
                <option value="preparing">قيد التحضير</option>
                <option value="ready">جاهز</option>
                <option value="delivered">تم التسليم</option>
                <option value="cancelled">ملغي</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>لا توجد طلبات مسجلة حالياً</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الطلب</TableHead>
                    <TableHead>العميل</TableHead>
                    <TableHead>رقم الهاتف</TableHead>
                    <TableHead className="text-center">الأصناف</TableHead>
                    <TableHead className="text-center">الإجمالي</TableHead>
                    <TableHead className="text-center">الحالة</TableHead>
                    <TableHead className="text-center">التاريخ</TableHead>
                    <TableHead className="text-center">فاتورة واتساب</TableHead>
                    <TableHead className="text-center">تفاصيل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const normalizedCustPhone = normalizeWhatsAppNumber(order.customerPhone)
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs font-bold text-emerald-700">
                          #{order.id.slice(-6).toUpperCase()}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {order.customerName}
                        </TableCell>
                        <TableCell className="font-mono text-xs" dir="ltr">
                          {order.customerPhone}
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          {order.items.reduce((s, i) => s + i.quantity, 0)} قطعة ({order.items.length} صنف)
                        </TableCell>
                        <TableCell className="text-center font-bold text-emerald-600 text-sm">
                          {order.totalAmount.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">{currency}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={`text-xs border ${ORDER_STATUS_COLORS[order.status] || ''}`} variant="outline">
                            {ORDER_STATUS_LABELS[order.status] || order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString('ar-EG', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 gap-1.5"
                            onClick={() => handleSendInvoiceToCustomer(order)}
                          >
                            <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                            إرسال واتساب
                          </Button>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      {selectedOrder && (
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-lg p-6" dir="rtl">
            <DialogHeader className="text-right">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <span>طلب رقم #{selectedOrder.id.slice(-6).toUpperCase()}</span>
                  <Badge className={`text-xs border ${ORDER_STATUS_COLORS[selectedOrder.status]}`} variant="outline">
                    {ORDER_STATUS_LABELS[selectedOrder.status]}
                  </Badge>
                </DialogTitle>
              </div>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/* Customer Info */}
              <div className="bg-gray-50 p-3.5 rounded-lg border space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">اسم العميل:</span>
                  <span className="font-bold text-sm text-gray-900">{selectedOrder.customerName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">رقم الهاتف:</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm" dir="ltr">
                    {selectedOrder.customerPhone} (المعالج: +{normalizeWhatsAppNumber(selectedOrder.customerPhone)})
                  </span>
                </div>
                {selectedOrder.governorate && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">المحافظة:</span>
                    <span className="font-bold text-slate-800 bg-emerald-100/70 text-emerald-900 px-2 py-0.5 rounded">
                      {selectedOrder.governorate}
                    </span>
                  </div>
                )}
                {selectedOrder.customerAddress && (
                  <div className="pt-1 border-t">
                    <span className="text-muted-foreground block mb-0.5">العنوان بالتفصيل:</span>
                    <p className="bg-white p-2 rounded border text-gray-800">{selectedOrder.customerAddress}</p>
                  </div>
                )}
                {selectedOrder.notes && (
                  <div className="pt-1 border-t">
                    <span className="text-muted-foreground block mb-0.5">ملاحظات إضافية:</span>
                    <p className="bg-white p-2 rounded border text-gray-800">{selectedOrder.notes}</p>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t text-[11px] text-muted-foreground">
                  <span>تاريخ الطلب:</span>
                  <span>{new Date(selectedOrder.createdAt).toLocaleString('ar-EG')}</span>
                </div>
              </div>

              {/* Status Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">تغيير حالة الطلب:</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((st) => (
                    <Button
                      key={st}
                      variant={selectedOrder.status === st ? 'default' : 'outline'}
                      size="sm"
                      className={`text-xs h-8 ${selectedOrder.status === st ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                      onClick={() => updateOrderStatus(selectedOrder.id, st)}
                    >
                      {ORDER_STATUS_LABELS[st]}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Order Items & Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-900">الأصناف المطلوبة:</h4>
                <div className="divide-y border rounded-lg overflow-hidden bg-white text-xs">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{item.productName}</p>
                        <p className="text-[11px] text-muted-foreground">{item.quantity} × {item.unitPrice.toFixed(2)} {currency}</p>
                      </div>
                      <span className="font-bold text-emerald-600">
                        {item.totalPrice.toFixed(2)} {currency}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Shipping & Subtotal Breakdown */}
                <div className="bg-slate-50 p-3 rounded-lg border text-xs space-y-1.5">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>إجمالي المنتجات:</span>
                    <span className="font-semibold font-mono text-slate-900">
                      {(selectedOrder.subtotal ?? selectedOrder.totalAmount - (selectedOrder.shippingCost || 0)).toFixed(2)} {currency}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>قيمة التوصيل ({selectedOrder.governorate || 'الشحن'}):</span>
                    <span className="font-semibold font-mono text-slate-900">
                      {selectedOrder.shippingCost !== undefined ? `${selectedOrder.shippingCost.toFixed(2)} ${currency}` : '—'}
                    </span>
                  </div>
                  <div className="pt-1.5 border-t flex justify-between items-center font-bold text-emerald-950 text-sm">
                    <span>الإجمالي الكلي النهائي:</span>
                    <span className="text-base font-extrabold text-emerald-700 font-mono">
                      {selectedOrder.totalAmount.toFixed(2)} {currency}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2 border-t">
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs font-semibold"
                  onClick={() => handleSendInvoiceToCustomer(selectedOrder)}
                >
                  <MessageCircle className="h-4 w-4" />
                  إرسال الفاتورة لواتساب العميل مباشرة
                </Button>

                <Button
                  variant="outline"
                  className="w-full gap-2 text-xs"
                  onClick={() => handleCopyInvoice(selectedOrder)}
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copiedInvoice ? 'تم نسخ نص الفاتورة!' : 'نسخ نص الفاتورة كرسالة نصية'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
