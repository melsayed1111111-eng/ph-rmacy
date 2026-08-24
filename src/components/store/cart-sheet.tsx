import { useState, useEffect } from 'react'
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
  AlertCircle
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
import type { PharmacySettings, WhatsAppEntry } from '@/lib/types'

interface CartSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: PharmacySettings
}

export function CartSheet({ open, onOpenChange, settings }: CartSheetProps) {
  const items = useCartStore((s) => s.items)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)
  const clearCart = useCartStore((s) => s.clearCart)
  const getTotal = useCartStore((s) => s.getTotal)
  const isMobile = useIsMobile()

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
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

  const total = getTotal()

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
      const orderData = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        items: items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.price
        })),
        notes: notes.trim()
      }

      // 1. Save order in the database
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'فشل في حفظ الطلب')
      }

      const createdOrder = await res.json()
      const orderId = createdOrder.id || ''

      // 2. Generate Professional Invoice Text
      const invoiceMessage = generateWhatsAppInvoiceMessage({
        orderId,
        pharmacyName: settings.pharmacyName || 'الصيدلية',
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        notes: notes.trim(),
        items: items.map((i) => ({
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: i.price,
          totalPrice: i.price * i.quantity
        })),
        totalAmount: total,
        currency: settings.currency || 'ج.م'
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
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-6 overflow-y-auto" dir="rtl">
        <SheetHeader className="text-right">
          <SheetTitle className="flex items-center gap-2 text-lg font-bold">
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
                className="w-full flex items-center justify-center gap-2 text-xs"
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
                  <div key={item.productId} className="flex gap-3 items-center bg-gray-50/70 p-3 rounded-lg border">
                    <div className="w-14 h-14 rounded-md bg-white border overflow-hidden flex-shrink-0">
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
                      <p className="font-semibold text-sm truncate">{item.productName}</p>
                      <p className="text-emerald-600 text-xs font-semibold">{item.price} {settings.currency}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6 bg-white"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-xs font-bold w-5 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6 bg-white"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= item.maxStock}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive mr-auto"
                          onClick={() => removeItem(item.productId)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-left flex-shrink-0">
                      <span className="text-sm font-bold text-gray-900">
                        {(item.price * item.quantity).toFixed(2)}
                      </span>
                      <span className="text-[11px] text-muted-foreground block">{settings.currency}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="my-2" />

            {/* Customer & Delivery Form */}
            <div className="space-y-3 py-2">
              <h3 className="font-bold text-sm text-gray-900">بيانات التوصيل والفاتورة</h3>
              
              <div className="space-y-1">
                <Label htmlFor="cust-name" className="text-xs">اسم العميل *</Label>
                <Input
                  id="cust-name"
                  placeholder="مثال: أحمد محمد"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="cust-phone" className="text-xs">رقم الهاتف للتواصل *</Label>
                <Input
                  id="cust-phone"
                  placeholder="مثال: 01012345678"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  dir="ltr"
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="cust-notes" className="text-xs">العنوان / ملاحظات إضافية</Label>
                <Textarea
                  id="cust-notes"
                  placeholder="العنوان بالتفصيل أو أي تعليمات للتوصيل..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>

              {/* Multiple WhatsApp destination selection if configured */}
              {whatsappList.length > 1 && (
                <div className="space-y-1 pt-1">
                  <Label className="text-xs">إرسال الطلب إلى فرع / رقم:</Label>
                  <select
                    value={selectedWhatsApp}
                    onChange={(e) => setSelectedWhatsApp(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-input bg-white text-xs"
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
                <div className="flex items-center gap-1.5 text-destructive text-xs bg-red-50 p-2.5 rounded-lg border border-red-200">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <Separator className="my-2" />

            {/* WhatsApp Target Notification */}
            <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-lg p-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-800 font-medium flex items-center gap-1.5">
                  <MessageCircle className="h-4 w-4 text-emerald-600" />
                  إرسال لواتساب: <strong>{settings.pharmacyName}</strong>
                </span>
                <span className="font-mono text-emerald-700 font-semibold" dir="ltr">
                  +{normalizedTarget || 'لم يحدد'}
                </span>
              </div>
              <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
                {isMobile ? <Smartphone className="h-3 w-3 inline" /> : <Monitor className="h-3 w-3 inline" />}
                <span>سيتم فتح تطبيق واتساب وإرسال تفاصيل الفاتورة كاملة ومباشرة</span>
              </p>
            </div>

            {/* Footer / Total & Checkout Button */}
            <SheetFooter className="flex-col sm:flex-row gap-3 pt-3 border-t mt-auto">
              <div className="flex items-center justify-between sm:flex-col sm:items-start w-full sm:w-auto">
                <span className="text-xs text-muted-foreground">الإجمالي الكلي</span>
                <span className="text-xl font-bold text-emerald-600">
                  {total.toFixed(2)} <span className="text-xs font-normal text-gray-600">{settings.currency}</span>
                </span>
              </div>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 h-11 text-sm font-semibold shadow-md"
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
              <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-gray-700 text-lg font-semibold">سلة التسوق فارغة</p>
              <p className="text-muted-foreground text-xs mt-1">تصفح المنتجات في المتجر وأضف ما ترغب لشرائه</p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
