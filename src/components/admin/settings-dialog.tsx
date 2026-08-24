import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Settings,
  Save,
  Plus,
  X,
  User,
  Lock,
  Eye,
  EyeOff,
  PhoneCall,
  MessageCircle,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { normalizeWhatsAppNumber, buildWhatsAppUrl } from '@/lib/phone-utils'
import { saveSettingsToFirebase } from '@/lib/firebase'
import type { PharmacySettings, WhatsAppEntry } from '@/lib/types'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: PharmacySettings
  onSave: (settings: PharmacySettings) => void
}

export function SettingsDialog({
  open,
  onOpenChange,
  settings,
  onSave,
}: SettingsDialogProps) {
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [whatsappEntries, setWhatsappEntries] = useState<WhatsAppEntry[]>([])
  const [currency, setCurrency] = useState('ج.م')
  const [adminUsername, setAdminUsername] = useState('admin')
  const [adminPassword, setAdminPassword] = useState('admin123')
  const [showPassword, setShowPassword] = useState(false)
  const [freeThreshold, setFreeThreshold] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    setName(settings.pharmacyName || 'الصيدلية')
    setWhatsapp(settings.whatsappNumber || '')
    setCurrency(settings.currency || 'ج.م')
    setAdminUsername(settings.adminUsername || 'admin')
    setAdminPassword(settings.adminPassword || 'admin123')
    setFreeThreshold(
      settings.freeShippingThreshold ? String(settings.freeShippingThreshold) : ''
    )
    setSaveSuccess(false)

    try {
      if (settings.whatsappNumbers) {
        const parsed = JSON.parse(settings.whatsappNumbers)
        if (Array.isArray(parsed)) {
          setWhatsappEntries(parsed)
        } else {
          setWhatsappEntries([])
        }
      } else {
        setWhatsappEntries([])
      }
    } catch {
      setWhatsappEntries([])
    }
  }, [settings, open])

  const addEntry = () => {
    setWhatsappEntries([...whatsappEntries, { label: '', number: '' }])
  }

  const removeEntry = (index: number) => {
    setWhatsappEntries(whatsappEntries.filter((_, i) => i !== index))
  }

  const updateEntry = (index: number, field: keyof WhatsAppEntry, value: string) => {
    const updated = [...whatsappEntries]
    updated[index] = { ...updated[index], [field]: value }
    setWhatsappEntries(updated)
  }

  const normalizedPrimary = normalizeWhatsAppNumber(whatsapp)

  const handleTestWhatsApp = (numberToTest: string) => {
    const norm = normalizeWhatsAppNumber(numberToTest)
    if (!norm) return
    const testUrl = buildWhatsAppUrl(
      norm,
      `مرحباً، هذه رسالة تجريبية من لوحة تحكم صيدلية ${name || 'الصيدلية'}. نظام إرسال الفواتير التلقائي يعمل بنجاح! 🚀`
    )
    window.open(testUrl, '_blank')
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const primaryNumber = whatsapp.trim() || (whatsappEntries[0]?.number.trim() || '')
      const cleanedEntries = whatsappEntries.filter((e) => e.number.trim())
      const thresholdNum = parseFloat(freeThreshold)

      const payload: PharmacySettings = {
        id: settings.id || 'default',
        pharmacyName: name.trim() || 'الصيدلية',
        whatsappNumber: primaryNumber,
        whatsappNumbers: JSON.stringify(cleanedEntries),
        currency: currency.trim() || 'ج.م',
        adminUsername: adminUsername.trim() || 'admin',
        adminPassword: adminPassword.trim() || 'admin123',
        shippingRates: settings.shippingRates,
        defaultShippingCost: settings.defaultShippingCost,
        freeShippingThreshold: !isNaN(thresholdNum) && thresholdNum > 0 ? thresholdNum : 0
      }

      await saveSettingsToFirebase(payload)
      onSave(payload)
      setSaveSuccess(true)
      setTimeout(() => {
        setSaveSuccess(false)
        onOpenChange(false)
      }, 1000)
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-6" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Settings className="h-5 w-5 text-emerald-600" />
            إعدادات الصيدلية والواتساب
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Pharmacy Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">اسم الصيدلية</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: صيدلية النور"
              className="text-sm"
            />
          </div>

          {/* WhatsApp Primary Configuration */}
          <div className="space-y-2 border border-emerald-200 bg-emerald-50/40 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4 text-emerald-600" />
                رقم واتساب استلام الفواتير الرئيسي
              </Label>
              {normalizedPrimary && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                  onClick={() => handleTestWhatsApp(whatsapp)}
                >
                  <ExternalLink className="h-3 w-3 ml-1" />
                  اختبار الرقم
                </Button>
              )}
            </div>

            <Input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="مثال: 01116664299 أو +201116664299"
              dir="ltr"
              className="font-mono text-sm bg-white"
            />

            {/* Smart Preview */}
            <div className="text-xs bg-white border border-emerald-200 rounded-lg p-2.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">الرقم بعد المعالجة التلقائية:</span>
                <span className="font-mono font-bold text-emerald-700 text-sm" dir="ltr">
                  {normalizedPrimary ? `+${normalizedPrimary}` : '— (يرجى إدخال رقم)'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                ✅ يقبل إدخال الرقم بمفتاح الدولة (مثل <code>+20</code> أو <code>00966</code>) أو كرقم محلي عادي (مثل <code>010...</code> أو <code>050...</code>).
              </p>
            </div>
          </div>

          {/* Multiple WhatsApp Numbers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-bold">أرقام وفروع إضافية (اختياري)</Label>
                <p className="text-[11px] text-muted-foreground">
                  أضف أرقام واتساب إضافية ليختار العميل الفرع المراد إرسال الفاتورة له
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1 border-dashed"
                onClick={addEntry}
              >
                <Plus className="h-3.5 w-3.5" />
                إضافة رقم
              </Button>
            </div>

            <div className="space-y-2">
              {whatsappEntries.map((entry, index) => {
                const norm = normalizeWhatsAppNumber(entry.number)
                return (
                  <div key={index} className="flex flex-col gap-1.5 p-2.5 bg-gray-50 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="اسم الفرع (مثلاً: فرع وسط البلد)"
                        value={entry.label}
                        onChange={(e) => updateEntry(index, 'label', e.target.value)}
                        className="h-8 text-xs bg-white"
                      />
                      <Input
                        placeholder="الرقم: 01xxxxxxxxx"
                        value={entry.number}
                        onChange={(e) => updateEntry(index, 'number', e.target.value)}
                        className="h-8 text-xs font-mono bg-white"
                        dir="ltr"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                        onClick={() => removeEntry(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {norm && (
                      <div className="flex items-center justify-between text-[11px] text-emerald-700 px-1">
                        <span>الرقم المعتمد: <strong className="font-mono">+{norm}</strong></span>
                        <button
                          type="button"
                          onClick={() => handleTestWhatsApp(entry.number)}
                          className="hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" /> تجربة
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Currency */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">رمز العملة</Label>
            <Input
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder="ج.م أو ر.س أو $"
              className="text-sm"
            />
          </div>

          <Separator />

          {/* Admin Credentials */}
          <div className="space-y-3 bg-gray-50 p-4 rounded-xl border">
            <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
              <Lock className="h-4 w-4 text-amber-600" />
              <span>بيانات دخول لوحة التحكم</span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">اسم المستخدم</Label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="admin"
                  className="pr-9 h-9 text-sm bg-white"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">كلمة المرور</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-9 pl-9 h-9 text-sm bg-white"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t flex-row justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                جاري الحفظ...
              </div>
            ) : saveSuccess ? (
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                تم الحفظ بنجاح
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Save className="h-4 w-4" />
                حفظ الإعدادات
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
