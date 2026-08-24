import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Truck,
  Search,
  Save,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Gift,
  Zap,
  DollarSign
} from 'lucide-react'
import {
  EGYPTIAN_GOVERNORATES,
  parseShippingRates,
  getDefaultShippingRates
} from '@/lib/shipping-utils'
import { saveSettingsToFirebase } from '@/lib/firebase'
import type { PharmacySettings } from '@/lib/types'

interface ShippingManagerProps {
  settings: PharmacySettings
  onSaveSettings: (settings: PharmacySettings) => void
}

export function ShippingManager({ settings, onSaveSettings }: ShippingManagerProps) {
  const [shippingRates, setShippingRates] = useState<Record<string, number>>({})
  const [freeThreshold, setFreeThreshold] = useState<string>('')
  const [selectedGovForEdit, setSelectedGovForEdit] = useState<string>(EGYPTIAN_GOVERNORATES[0].name)
  const [selectedGovPrice, setSelectedGovPrice] = useState<string>('30')
  const [bulkPrice, setBulkPrice] = useState<string>('35')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Initialize from settings
  useEffect(() => {
    const rates = parseShippingRates(settings.shippingRates)
    setShippingRates(rates)
    setFreeThreshold(
      settings.freeShippingThreshold ? String(settings.freeShippingThreshold) : ''
    )
    if (rates[selectedGovForEdit] !== undefined) {
      setSelectedGovPrice(String(rates[selectedGovForEdit]))
    }
  }, [settings])

  // When dropdown selection changes, update the price input
  const handleGovernorateDropdownChange = (govName: string) => {
    setSelectedGovForEdit(govName)
    const currentPrice = shippingRates[govName] ?? 35
    setSelectedGovPrice(String(currentPrice))
  }

  // Update a single governorate price
  const handleApplySingleGovPrice = () => {
    const priceNum = parseFloat(selectedGovPrice)
    if (isNaN(priceNum) || priceNum < 0) return

    setShippingRates((prev) => ({
      ...prev,
      [selectedGovForEdit]: priceNum
    }))
  }

  // Handle inline table edits
  const handleRateChange = (govName: string, value: string) => {
    const num = parseFloat(value)
    if (isNaN(num) || num < 0) {
      setShippingRates((prev) => ({ ...prev, [govName]: 0 }))
    } else {
      setShippingRates((prev) => ({ ...prev, [govName]: num }))
    }
  }

  // Apply bulk price to all governorates
  const handleApplyBulkPrice = () => {
    const priceNum = parseFloat(bulkPrice)
    if (isNaN(priceNum) || priceNum < 0) return

    const newRates: Record<string, number> = {}
    EGYPTIAN_GOVERNORATES.forEach((gov) => {
      newRates[gov.name] = priceNum
    })
    setShippingRates(newRates)
    setSelectedGovPrice(String(priceNum))
  }

  // Reset to default Egyptian rates
  const handleResetToDefaults = () => {
    const defaults = getDefaultShippingRates()
    setShippingRates(defaults)
    setSelectedGovPrice(String(defaults[selectedGovForEdit] || 35))
  }

  // Save all shipping rates to settings & Firebase
  const handleSaveAll = async () => {
    setIsSaving(true)
    try {
      const thresholdNum = parseFloat(freeThreshold)
      const updatedSettings: PharmacySettings = {
        ...settings,
        shippingRates: JSON.stringify(shippingRates),
        freeShippingThreshold: !isNaN(thresholdNum) && thresholdNum > 0 ? thresholdNum : 0
      }

      await saveSettingsToFirebase(updatedSettings)
      onSaveSettings(updatedSettings)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Error saving shipping settings:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Filter governorates by search
  const filteredGovernorates = useMemo(() => {
    return EGYPTIAN_GOVERNORATES.filter((gov) =>
      gov.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
    )
  }, [searchQuery])

  const currency = settings.currency || 'ج.م'

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header & Quick Action Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                إدارة أسعار الشحن والتوصيل للمحافظات
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                  27 محافظة
                </Badge>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                حدد تكلفة الشحن المناسبة لكل محافظة، وسيتم احتسابها تلقائياً وإضافتها لفاتورة العميل
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetToDefaults}
              className="text-xs text-slate-600 border-slate-200"
            >
              <RefreshCw className="h-3.5 w-3.5 ml-1.5" />
              استعادة الأسعار الافتراضية
            </Button>

            <Button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 shadow-sm"
            >
              {isSaving ? (
                <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : saveSuccess ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-200" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saveSuccess ? 'تم الحفظ بنجاح!' : 'حفظ أسعار الشحن'}
            </Button>
          </div>
        </div>

        {/* Quick Set via Dropdown (Requested by User) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Dropdown Governorate Selector */}
          <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 space-y-3">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <span>تعديل سعر محافظة محددة (قائمة منسدلة)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-6">
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                  اختر المحافظة
                </Label>
                <select
                  value={selectedGovForEdit}
                  onChange={(e) => handleGovernorateDropdownChange(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {EGYPTIAN_GOVERNORATES.map((gov) => (
                    <option key={gov.id} value={gov.name}>
                      {gov.name} ({shippingRates[gov.name] ?? gov.defaultCost} {currency})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                  سعر الشحن ({currency})
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={selectedGovPrice}
                  onChange={(e) => setSelectedGovPrice(e.target.value)}
                  className="h-10 bg-white text-sm text-center font-bold text-emerald-700"
                />
              </div>

              <div className="sm:col-span-3 flex items-end">
                <Button
                  onClick={handleApplySingleGovPrice}
                  className="w-full h-10 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                >
                  تطبيق السعر
                </Button>
              </div>
            </div>
          </div>

          {/* 2. Bulk Controls & Free Shipping Threshold */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
              <Gift className="h-4 w-4 text-amber-600" />
              <span>أدوات سريعة وتوصيل مجاني</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                  تطبيق سعر موحد للكل ({currency})
                </Label>
                <div className="flex gap-1.5">
                  <Input
                    type="number"
                    min="0"
                    value={bulkPrice}
                    onChange={(e) => setBulkPrice(e.target.value)}
                    placeholder="35"
                    className="h-9 text-xs bg-white"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleApplyBulkPrice}
                    className="h-9 text-xs shrink-0"
                  >
                    تطبيق للكل
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                  شحن مجاني للطلبات فوق ({currency})
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={freeThreshold}
                  onChange={(e) => setFreeThreshold(e.target.value)}
                  placeholder="مثال: 500 (اختياري)"
                  className="h-9 text-xs bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Governorates Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-sm text-slate-800">
              قائمة أسعار الشحن لجميع المحافظات ({filteredGovernorates.length})
            </h4>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن محافظة..."
              className="pr-9 h-9 text-xs bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-100/70">
              <TableRow>
                <TableHead className="text-right text-xs font-bold text-slate-700 w-16">#</TableHead>
                <TableHead className="text-right text-xs font-bold text-slate-700">المحافظة</TableHead>
                <TableHead className="text-center text-xs font-bold text-slate-700 w-44">
                  تكلفة الشحن ({currency})
                </TableHead>
                <TableHead className="text-right text-xs font-bold text-slate-700 w-40">الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGovernorates.map((gov, idx) => {
                const currentCost = shippingRates[gov.name] ?? gov.defaultCost
                return (
                  <TableRow key={gov.id} className="hover:bg-slate-50/80 transition-colors">
                    <TableCell className="text-xs text-slate-400 font-mono">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900">{gov.name}</span>
                        {currentCost === 0 && (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] py-0">
                            شحن مجاني
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          value={currentCost}
                          onChange={(e) => handleRateChange(gov.name, e.target.value)}
                          className="w-24 h-8 text-center text-xs font-bold text-emerald-800 bg-white border-slate-300 focus:border-emerald-500"
                        />
                        <span className="text-xs text-slate-500">{currency}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-500">
                        {currentCost === gov.defaultCost ? 'السعر القياسي' : 'معدل مخصص'}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
