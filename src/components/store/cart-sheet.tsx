import { useState, useEffect, useMemo } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  MessageCircle,
  Smartphone,
  Monitor,
  CheckCircle2,
  ExternalLink,
  Copy,
  AlertCircle,
  Truck,
  MapPin,
  Gift,
  PackageCheck,
  User,
  Phone,
  FileText
} from 'lucide-react'
import Image from '@/components/common/Image'
import { useCartStore } from '@/store/cart-store'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  normalizeWhatsAppNumber,
  generateWhatsAppInvoiceMessage,
  openWhatsApp,
  buildWhatsAppUrl
} from '@/lib/phone-utils'
import {
  getShippingAreasList,
  parseShippingRates,
  calculateShippingFee
} from '@/lib/shipping-utils'
import { createOrderInFirebase } from '@/lib/firebase'
import type { PharmacySettings, WhatsAppEntry, Order } from '@/lib/types'

interface CartSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: PharmacySettings
}

export function CartSheet({ open, onOpenChange, settings }: CartSheetProps) {
  const items = useCartStore((s) => s.items)
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const clearCart = useCartStore((s) => s.clearCart)
  const getTotal = useCartStore((s) => s.getTotal)
  const isMobile = useIsMobile()

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [selectedGovernorate, setSelectedGovernorate] = useState<string>('القاهرة')
  const [customerAddress, setCustomerAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedWhatsApp, setSelectedWhatsApp] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successOrder, setSuccessOrder] = useState<{
    orderId: string
    whatsappUrl: string
    messageText: string
    targetPhone: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  const subtotal = getTotal()
  const totalItemsCount = useMemo(() => {
    return items.reduce((acc, item) => acc + item.quantity, 0)
  }, [items])

  // Parse shipping rates & area list
  const shippingAreas = useMemo(() => {
    return getShippingAreasList(settings.shippingRates)
  }, [settings.shippingRates])

  const shippingRates = useMemo(() => {
    return parseShippingRates(settings.shippingRates)
  }, [settings.shippingRates])

  // Ensure selected governorate/area is valid
  useEffect(() => {
    if (shippingAreas.length > 0) {
      if (!selectedGovernorate || !shippingAreas.some((a) => a.name === selectedGovernorate)) {
        setSelectedGovernorate(shippingAreas[0].name)
      }
    }
  }, [shippingAreas, selectedGovernorate])

  // Calculate live shipping cost
  const { cost: shippingCost, isFree: isFreeShipping } = useMemo(() => {
    return calculateShippingFee(
      selectedGovernorate,
      subtotal,
      shippingRates,
      settings.freeShippingThreshold,
      settings.defaultShippingCost || 35
    )
  }, [selectedGovernorate, subtotal, shippingRates, settings.freeShippingThreshold, settings.defaultShippingCost])

  const grandTotal = subtotal + shippingCost
  const currency = settings.currency || 'ج.م'

  // Parse available whatsapp numbers
  let whatsappList: WhatsAppEntry[] = []
  try {
    if (settings.whatsappNumbers) {
      const parsed = JSON.parse(settings.whatsappNumbers)
      if (Array.isArray(parsed) && parsed.length > 0) {
        whatsappList = parsed.filter((e) => e.number && e.number.trim())
      }
    }
  } catch (e) {
    console.error('Error parsing whatsapp numbers:', e)
  }

  // Set default whatsapp target
  useEffect(() => {
    if (whatsappList.length > 0) {
      setSelectedWhatsApp(whatsappList[0].number)
    } else {
      setSelectedWhatsApp(settings.whatsappNumber || '')
    }
  }, [settings.whatsappNumber, settings.whatsappNumbers])

  // Reset states when opened
  useEffect(() => {
    if (open) {
      setError('')
      setSuccessOrder(null)
    }
  }, [open])

  const targetRecipientNumber = selectedWhatsApp || settings.whatsappNumber || ''
  const normalizedTarget = normalizeWhatsAppNumber(targetRecipientNumber)

  const handleSubmitOrder = async () => {
    setError('')
    if (!customerName.trim()) {
      setError('يرجى كتابة اسم العميل')
      return
    }
    if (!customerPhone.trim()) {
      setError('يرجى كتابة رقم الهاتف للتواصل')
      return
    }
    if (items.length === 0) {
      setError('سلة المشتريات فارغة')
      return
    }

    if (!normalizedTarget) {
      setError('يرجى إعداد رقم واتساب الصيدلية في لوحة التحكم')
      return
    }

    setIsSubmitting(true)
    try {
      const orderId = `order-${Date.now()}`
      const newOrder: Order = {
        id: orderId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        governorate: selectedGovernorate,
        shippingCost,
        subtotal,
        status: 'pending',
        totalAmount: grandTotal,
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: items.map((item, idx) => ({
          id: `item-${Date.now()}-${idx}`,
          orderId,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.price * item.quantity,
          productImage: item.image
        }))
      }

      // 1. Save order in Firebase (and local backup)
      await createOrderInFirebase(newOrder)

      // 2. Generate Professional Invoice Text with shipping and governorate
      const invoiceMessage = generateWhatsAppInvoiceMessage({
        orderId,
        pharmacyName: settings.pharmacyName || 'الصيدلية',
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        governorate: selectedGovernorate,
        shippingCost,
        subtotal,
        notes: notes.trim(),
        items: items.map((i) => ({
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: i.price,
          totalPrice: i.price * i.quantity
        })),
        totalAmount: grandTotal,
        currency
      })

      // 3. Build URL & Open WhatsApp
      const whatsappUrl = buildWhatsAppUrl(targetRecipientNumber, invoiceMessage)
      openWhatsApp(targetRecipientNumber, invoiceMessage)

      // 4. Store success state for direct recovery/re-send
      setSuccessOrder({
        orderId,
        whatsappUrl,
        messageText: invoiceMessage,
        targetPhone: normalizedTarget
      })

      // 5. Clear cart & inputs
      clearCart()
      setCustomerName('')
      setCustomerPhone('')
      setCustomerAddress('')
      setNotes('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء إتمام الطلب')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyMessage = () => {
    if (successOrder?.messageText) {
      navigator.clipboard.writeText(successOrder.messageText)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-xl flex flex-col p-0 bg-slate-50 text-slate-900 border-l border-slate-200 shadow-2xl overflow-hidden h-full"
        dir="rtl"
      >
        {/* Sticky Header */}
        <SheetHeader className="p-4 sm:p-5 bg-white border-b border-slate-200 flex-shrink-0 text-right">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-slate-900">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <span>سلة التسوق</span>
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-bold text-xs px-2.5 py-0.5 rounded-full">
                {items.length} صنف ({totalItemsCount} قطعة)
              </Badge>
            </SheetTitle>

            {items.length > 0 && !successOrder && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 px-2 gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                تفريغ السلة
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Success View */}
        {successOrder ? (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center space-y-4 bg-white">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
              <CheckCircle2 className="h-10 w-10 animate-bounce" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-gray-900">تم تسجيل الطلب بنجاح!</h3>
              <p className="text-xs text-muted-foreground">
                رقم الطلب: <span className="font-mono font-bold text-emerald-700">#{successOrder.orderId.slice(-6).toUpperCase()}</span>
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 w-full text-right space-y-2 text-sm">
              <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                <MessageCircle className="h-4 w-4" />
                <span>تم تجهيز الفاتورة وإرسالها إلى واتساب الصيدلية</span>
              </div>
              <p className="text-xs text-emerald-700">
                الرقم المستلم: <span className="font-mono font-bold" dir="ltr">+{successOrder.targetPhone}</span>
              </p>
            </div>

            <div className="flex flex-col gap-2.5 w-full pt-2">
              <a
                href={successOrder.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow transition"
              >
                <ExternalLink className="h-4 w-4" />
                إعادة فتح واتساب الفاتورة
              </a>

              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2 text-xs bg-white text-slate-800 border-slate-300 h-10 rounded-xl"
                onClick={handleCopyMessage}
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? 'تم نسخ نص الفاتورة!' : 'نسخ نص الفاتورة'}
              </Button>

              <Button
                variant="ghost"
                className="w-full text-slate-600 hover:text-slate-900 mt-2"
                onClick={() => {
                  setSuccessOrder(null)
                  onOpenChange(false)
                }}
              >
                متابعة التسوق
              </Button>
            </div>
          </div>
        ) : items.length > 0 ? (
          /* Main Scrollable Body */
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
            
            {/* SECTION 1: PROMINENT PRODUCTS LIST */}
            <div className="bg-white rounded-2xl p-4 border-2 border-emerald-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <PackageCheck className="h-4 w-4 text-emerald-600" />
                  <span>الأصناف والمنتجات المختارة بالسلة</span>
                </div>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  {items.length} منتج
                </span>
              </div>

              {/* Items Cards */}
              <div className="space-y-3">
                {items.map((item) => {
                  const itemTotal = (item.price * item.quantity).toFixed(2)
                  return (
                    <div
                      key={item.productId}
                      className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100/80 p-3 rounded-xl border border-slate-200 transition-colors"
                    >
                      {/* Product Thumbnail */}
                      <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center p-1 shadow-2xs">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.productName}
                            className="object-contain w-full h-full"
                          />
                        ) : (
                          <ShoppingBag className="h-6 w-6 text-slate-400" />
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-slate-900 leading-snug line-clamp-1">
                          {item.productName}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-semibold text-emerald-700 font-mono">
                            {item.price} {currency}
                          </span>
                          <span className="text-[10px] text-slate-400">للقطعة</span>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-md text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <span className="text-xs font-bold w-7 text-center font-mono text-slate-900">
                              {item.quantity}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-md text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              disabled={item.quantity >= item.maxStock}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg mr-auto"
                            onClick={() => removeItem(item.productId)}
                            title="حذف من السلة"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Line Item Total */}
                      <div className="text-left flex-shrink-0 pl-1">
                        <span className="text-sm font-extrabold text-slate-900 font-mono block">
                          {itemTotal}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">{currency}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* SECTION 2: CUSTOMER & DELIVERY DATA */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3.5">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm pb-2 border-b border-slate-100">
                <MapPin className="h-4 w-4 text-emerald-600" />
                <span>بيانات العميل ومكان التوصيل</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="cust-name" className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    اسم العميل *
                  </Label>
                  <Input
                    id="cust-name"
                    placeholder="مثال: أحمد محمد"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-10 text-sm bg-slate-50/70 border-slate-300 text-slate-900 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="cust-phone" className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    رقم الهاتف للتواصل *
                  </Label>
                  <Input
                    id="cust-phone"
                    placeholder="مثال: 01012345678"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    dir="ltr"
                    className="h-10 text-sm bg-slate-50/70 border-slate-300 text-slate-900 rounded-xl font-mono text-right"
                  />
                </div>
              </div>

              {/* Governorate Selector */}
              <div className="space-y-1.5 bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
                <div className="flex items-center justify-between">
                  <Label htmlFor="cust-gov" className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-emerald-600" />
                    منطقة / محافظة التوصيل (لتحديد تكلفة الشحن) *
                  </Label>
                  <div>
                    {isFreeShipping ? (
                      <Badge className="bg-emerald-600 text-white text-[11px] font-bold">
                        🎉 شحن مجاني
                      </Badge>
                    ) : (
                      <span className="text-xs font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-emerald-300 font-mono">
                        الشحن: {shippingCost} {currency}
                      </span>
                    )}
                  </div>
                </div>

                <select
                  id="cust-gov"
                  value={selectedGovernorate}
                  onChange={(e) => setSelectedGovernorate(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-emerald-300 bg-white text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                >
                  {shippingAreas.map((area) => {
                    const cost = shippingRates[area.name] ?? area.cost
                    return (
                      <option key={area.id} value={area.name}>
                        {area.name} — (شحن {cost} {currency})
                      </option>
                    )
                  })}
                </select>

                {settings.freeShippingThreshold && settings.freeShippingThreshold > 0 && !isFreeShipping && (
                  <p className="text-[11px] text-emerald-700 flex items-center gap-1 mt-1">
                    <Gift className="h-3.5 w-3.5 inline text-emerald-600 flex-shrink-0" />
                    <span>
                      أضف منتجات بقيمة {(settings.freeShippingThreshold - subtotal).toFixed(2)} {currency} إضافية للحصول على <strong>شحن مجاني</strong>!
                    </span>
                  </p>
                )}
              </div>

              {/* Detailed Address */}
              <div className="space-y-1">
                <Label htmlFor="cust-address" className="text-xs font-bold text-slate-700">العنوان بالتفصيل</Label>
                <Input
                  id="cust-address"
                  placeholder="اسم الشارع، رقم العمارة، الشقة، المنطقة..."
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="h-10 text-sm bg-slate-50/70 border-slate-300 text-slate-900 rounded-xl"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <Label htmlFor="cust-notes" className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 text-slate-400" />
                  ملاحظات إضافية (اختياري)
                </Label>
                <Textarea
                  id="cust-notes"
                  placeholder="أي تعليمات صيدلانية أو موعد مفضل للتسليم..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="text-xs resize-none bg-slate-50/70 border-slate-300 text-slate-900 rounded-xl"
                />
              </div>

              {/* Multiple WhatsApp destination selection */}
              {whatsappList.length > 1 && (
                <div className="space-y-1 pt-1">
                  <Label className="text-xs font-bold text-slate-700">إرسال الطلب إلى فرع / رقم:</Label>
                  <select
                    value={selectedWhatsApp}
                    onChange={(e) => setSelectedWhatsApp(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs"
                  >
                    {whatsappList.map((entry, idx) => (
                      <option key={idx} value={entry.number}>
                        {entry.label || 'فرع'} ({entry.number})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-1.5 text-rose-700 text-xs bg-rose-50 p-3 rounded-xl border border-rose-200 font-semibold">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* SECTION 3: INVOICE BREAKDOWN */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>إجمالي سعر الأدوية والمنتجات ({totalItemsCount} قطعة):</span>
                <span className="font-bold text-slate-900 font-mono text-sm">
                  {subtotal.toFixed(2)} {currency}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  <Truck className="h-3.5 w-3.5 text-slate-400" />
                  تكلفة الشحن ({selectedGovernorate}):
                </span>
                {isFreeShipping ? (
                  <span className="font-bold text-emerald-700">مجاناً (عرض التوصيل)</span>
                ) : (
                  <span className="font-bold text-slate-900 font-mono text-sm">
                    {shippingCost.toFixed(2)} {currency}
                  </span>
                )}
              </div>

              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">المبلغ الإجمالي النهائي المطلوب للدفع:</span>
                <span className="text-lg font-extrabold text-emerald-700 font-mono">
                  {grandTotal.toFixed(2)} {currency}
                </span>
              </div>
            </div>

            {/* Target WhatsApp Info */}
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-950 font-semibold flex items-center gap-1.5">
                  <MessageCircle className="h-4 w-4 text-emerald-600" />
                  إرسال الفاتورة لواتساب: <strong>{settings.pharmacyName}</strong>
                </span>
                <span className="font-mono text-emerald-800 font-bold" dir="ltr">
                  +{normalizedTarget || 'لم يحدد'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1">
                {isMobile ? <Smartphone className="h-3.5 w-3.5 inline flex-shrink-0" /> : <Monitor className="h-3.5 w-3.5 inline flex-shrink-0" />}
                <span>سيتم فتح تطبيق واتساب مباشرة ومرفق به تفاصيل الفاتورة كاملة وقيمة الشحن</span>
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-3">
                <ShoppingBag className="h-10 w-10" />
              </div>
              <p className="text-slate-800 text-lg font-bold">سلة التسوق فارغة</p>
              <p className="text-slate-500 text-xs mt-1">تصفح المنتجات في المتجر وأضف ما ترغب بشرائه</p>
            </div>
          </div>
        )}

        {/* Sticky Footer */}
        {items.length > 0 && !successOrder && (
          <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex-shrink-0 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-xs text-slate-500 font-medium block">الإجمالي الكلي النهائي</span>
                <span className="text-xl sm:text-2xl font-extrabold text-emerald-600 font-mono">
                  {grandTotal.toFixed(2)} <span className="text-xs font-bold text-slate-700">{currency}</span>
                </span>
              </div>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold text-xs">
                شامل المنتجات + التوصيل
              </Badge>
            </div>

            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white w-full h-12 sm:h-13 text-sm sm:text-base font-bold rounded-xl shadow-md cursor-pointer transition flex items-center justify-center gap-2"
              onClick={handleSubmitOrder}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  جاري التجهيز والإرسال...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  إتمام الشراء وإرسال الفاتورة للواتساب
                </div>
              )}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
