import { useState, useEffect, useMemo } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
  Gift
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
  EGYPTIAN_GOVERNORATES,
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

  // Parse shipping rates
  const shippingRates = useMemo(() => {
    return parseShippingRates(settings.shippingRates)
  }, [settings.shippingRates])

  // Calculate live shipping cost
  const { cost: shippingCost, isFree: isFreeShipping, originalCost } = useMemo(() => {
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
      setError('يرجى إدخال اسم العميل')
      return
    }
    if (!customerPhone.trim()) {
      setError('يرجى إدخال رقم هاتف العميل')
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

      // 3. Normalize WhatsApp phone number and build URL
      const whatsappUrl = buildWhatsAppUrl(targetRecipientNumber, invoiceMessage)

      // 4. Open WhatsApp
      openWhatsApp(targetRecipientNumber, invoiceMessage)

      // 5. Store success state for direct recovery/re-send
      setSuccessOrder({
        orderId,
        whatsappUrl,
        messageText: invoiceMessage,
        targetPhone: normalizedTarget
      })

      // 6. Clear cart & inputs
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
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-6 overflow-y-auto bg-white text-slate-900 border-l border-slate-200 shadow-2xl" dir="rtl">
        <SheetHeader className="text-right pb-2 border-b border-slate-100">
          <SheetTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <ShoppingBag className="h-5 w-5 text-emerald-600" />
            سلة التسوق ({items.length} منتج)
          </SheetTitle>
        </SheetHeader>

        {successOrder ? (
          /* Order Confirmation View */
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6 space-y-4">
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

            <div className="flex flex-col gap-2 w-full pt-2">
              <a
                href={successOrder.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-4 rounded-lg shadow transition"
              >
                <ExternalLink className="h-4 w-4" />
                إعادة فتح واتساب الفاتورة
              </a>

              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2 text-xs bg-white text-slate-800 border-slate-300"
                onClick={handleCopyMessage}
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? 'تم نسخ نص الفاتورة!' : 'نسخ نص الفاتورة'}
              </Button>

              <Button
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground mt-2"
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
          <>
            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto -mx-6 px-6 py-2">
              <div className="space-y-3 py-2">
                {items.map((item) => (
                  <div key={item.productId} className="flex gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="w-14 h-14 rounded-lg bg-white border border-slate-200 overflow-hidden flex-shrink-0">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.productName}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <ShoppingBag className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate text-slate-900">{item.productName}</p>
                      <p className="text-emerald-600 text-xs font-semibold">{item.price} {currency}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6 bg-white border-slate-300"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-xs font-bold w-5 text-center text-slate-800">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6 bg-white border-slate-300"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= item.maxStock}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-rose-500 hover:text-rose-700 hover:bg-rose-50 mr-auto"
                          onClick={() => removeItem(item.productId)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-left flex-shrink-0">
                      <span className="text-sm font-bold text-slate-900">
                        {(item.price * item.quantity).toFixed(2)}
                      </span>
                      <span className="text-[11px] text-slate-500 block">{currency}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="my-2 bg-slate-200" />

            {/* Customer & Delivery Form */}
            <div className="space-y-3.5 py-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-600" />
                بيانات العميل ومكان التوصيل
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="cust-name" className="text-xs font-semibold text-slate-700">اسم العميل *</Label>
                  <Input
                    id="cust-name"
                    placeholder="مثال: أحمد محمد"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-10 text-sm bg-white border-slate-300 text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="cust-phone" className="text-xs font-semibold text-slate-700">رقم الهاتف للتواصل *</Label>
                  <Input
                    id="cust-phone"
                    placeholder="مثال: 01012345678"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    dir="ltr"
                    className="h-10 text-sm bg-white border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              {/* Governorate Dropdown Selector (Requested by User) */}
              <div className="space-y-1.5 bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
                <div className="flex items-center justify-between">
                  <Label htmlFor="cust-gov" className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-emerald-600" />
                    المحافظة (لتحديد تكلفة الشحن) *
                  </Label>
                  <div className="flex items-center gap-1">
                    {isFreeShipping ? (
                      <Badge className="bg-emerald-600 text-white text-[11px] font-bold">
                        🎉 شحن مجاني
                      </Badge>
                    ) : (
                      <span className="text-xs font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-emerald-300">
                        الشحن: {shippingCost} {currency}
                      </span>
                    )}
                  </div>
                </div>

                <select
                  id="cust-gov"
                  value={selectedGovernorate}
                  onChange={(e) => setSelectedGovernorate(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-emerald-300 bg-white text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                >
                  {EGYPTIAN_GOVERNORATES.map((gov) => {
                    const cost = shippingRates[gov.name] ?? gov.defaultCost
                    return (
                      <option key={gov.id} value={gov.name}>
                        {gov.name} — (شحن {cost} {currency})
                      </option>
                    )
                  })}
                </select>
                
                {settings.freeShippingThreshold && settings.freeShippingThreshold > 0 && !isFreeShipping && (
                  <p className="text-[11px] text-emerald-700 flex items-center gap-1 mt-1">
                    <Gift className="h-3 w-3 inline text-emerald-600" />
                    <span>
                      أضف منتجات بقيمة {(settings.freeShippingThreshold - subtotal).toFixed(2)} {currency} إضافية للحصول على <strong>شحن مجاني</strong>!
                    </span>
                  </p>
                )}
              </div>

              {/* Detailed Address */}
              <div className="space-y-1">
                <Label htmlFor="cust-address" className="text-xs font-semibold text-slate-700">العنوان بالتفصيل</Label>
                <Input
                  id="cust-address"
                  placeholder="اسم الشارع، رقم العمارة، الشقة، المنطقة..."
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="h-10 text-sm bg-white border-slate-300 text-slate-900"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <Label htmlFor="cust-notes" className="text-xs font-semibold text-slate-700">ملاحظات إضافية (اختياري)</Label>
                <Textarea
                  id="cust-notes"
                  placeholder="أي تعليمات صيدلانية أو موعد مفضل للتسليم..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="text-xs resize-none bg-white border-slate-300 text-slate-900"
                />
              </div>

              {/* Multiple WhatsApp destination selection if configured */}
              {whatsappList.length > 1 && (
                <div className="space-y-1 pt-1">
                  <Label className="text-xs font-semibold text-slate-700">إرسال الطلب إلى فرع / رقم:</Label>
                  <select
                    value={selectedWhatsApp}
                    onChange={(e) => setSelectedWhatsApp(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs"
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
                <div className="flex items-center gap-1.5 text-rose-700 text-xs bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <Separator className="my-2 bg-slate-200" />

            {/* Price Breakdown (Requested: Shows transparently what the customer will pay) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>إجمالي سعر الأدوية والمنتجات:</span>
                <span className="font-semibold text-slate-900 font-mono">
                  {subtotal.toFixed(2)} {currency}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  <Truck className="h-3.5 w-3.5 text-slate-500" />
                  تكلفة الشحن ({selectedGovernorate}):
                </span>
                {isFreeShipping ? (
                  <span className="font-bold text-emerald-700">مجاناً (عرض التوصيل)</span>
                ) : (
                  <span className="font-semibold text-slate-900 font-mono">
                    {shippingCost.toFixed(2)} {currency}
                  </span>
                )}
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">المبلغ النهائي المطلوب للدفع:</span>
                <span className="text-lg font-extrabold text-emerald-700 font-mono">
                  {grandTotal.toFixed(2)} {currency}
                </span>
              </div>
            </div>

            {/* WhatsApp Target Notification */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-900 font-semibold flex items-center gap-1.5">
                  <MessageCircle className="h-4 w-4 text-emerald-600" />
                  إرسال الفاتورة لواتساب: <strong>{settings.pharmacyName}</strong>
                </span>
                <span className="font-mono text-emerald-800 font-bold" dir="ltr">
                  +{normalizedTarget || 'لم يحدد'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1">
                {isMobile ? <Smartphone className="h-3.5 w-3.5 inline" /> : <Monitor className="h-3.5 w-3.5 inline" />}
                <span>سيتم فتح تطبيق واتساب ومرفق به تفاصيل الفاتورة كاملة وقيمة الشحن للمحافظة</span>
              </p>
            </div>

            {/* Footer / Total & Checkout Button */}
            <SheetFooter className="flex-col sm:flex-row gap-3 pt-3 border-t border-slate-200 mt-auto">
              <div className="flex items-center justify-between sm:flex-col sm:items-start w-full sm:w-auto">
                <span className="text-xs text-slate-500 font-medium">الإجمالي الكلي بالشحن</span>
                <span className="text-2xl font-bold text-emerald-600">
                  {grandTotal.toFixed(2)} <span className="text-xs font-normal text-slate-600">{currency}</span>
                </span>
              </div>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 h-12 text-sm font-bold rounded-xl shadow-md cursor-pointer transition"
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
                    <MessageCircle className="h-4 w-4" />
                    إتمام الشراء وإرسال الفاتورة للواتساب
                  </div>
                )}
              </Button>
            </SheetFooter>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-12">
              <ShoppingBag className="h-16 w-16 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-800 text-lg font-bold">سلة التسوق فارغة</p>
              <p className="text-slate-500 text-xs mt-1">تصفح المنتجات في المتجر وأضف ما ترغب لشرائه</p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
