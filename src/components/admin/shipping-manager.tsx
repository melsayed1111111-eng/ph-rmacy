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
  Plus,
  Trash2,
  MapPin,
  Edit2,
  Check,
  X,
  AlertCircle
} from 'lucide-react'
import {
  ShippingAreaItem,
  getShippingAreasList,
  getDefaultShippingAreas
} from '@/lib/shipping-utils'
import { saveSettingsToFirebase } from '@/lib/firebase'
import type { PharmacySettings } from '@/lib/types'

interface ShippingManagerProps {
  settings: PharmacySettings
  onSaveSettings: (settings: PharmacySettings) => void
}

export function ShippingManager({ settings, onSaveSettings }: ShippingManagerProps) {
  const [areas, setAreas] = useState<ShippingAreaItem[]>([])
  const [freeThreshold, setFreeThreshold] = useState<string>('')
  const [bulkPrice, setBulkPrice] = useState<string>('35')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // New Area Form Inputs
  const [newAreaName, setNewAreaName] = useState('')
  const [newAreaCost, setNewAreaCost] = useState('35')

  // Inline editing of area name
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null)
  const [editingAreaName, setEditingAreaName] = useState('')

  // Quick Dropdown Selector for Quick Price Change
  const [selectedAreaForEdit, setSelectedAreaForEdit] = useState<string>('')
  const [selectedAreaPrice, setSelectedAreaPrice] = useState<string>('35')

  // Initialize from settings
  useEffect(() => {
    const loadedAreas = getShippingAreasList(settings.shippingRates)
    setAreas(loadedAreas)
    setFreeThreshold(
      settings.freeShippingThreshold ? String(settings.freeShippingThreshold) : ''
    )
    if (loadedAreas.length > 0) {
      setSelectedAreaForEdit(loadedAreas[0].name)
      setSelectedAreaPrice(String(loadedAreas[0].cost))
    }
  }, [settings])

  // When dropdown selection changes, update the price input
  const handleAreaDropdownChange = (areaName: string) => {
    setSelectedAreaForEdit(areaName)
    const found = areas.find((a) => a.name === areaName)
    if (found) {
      setSelectedAreaPrice(String(found.cost))
    }
  }

  // Update a single area price from quick selector
  const handleApplySingleAreaPrice = () => {
    const priceNum = parseFloat(selectedAreaPrice)
    if (isNaN(priceNum) || priceNum < 0 || !selectedAreaForEdit) return

    setAreas((prev) =>
      prev.map((a) => (a.name === selectedAreaForEdit ? { ...a, cost: priceNum } : a))
    )
  }

  // Handle adding a brand-new area/zone
  const handleAddNewArea = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setErrorMsg('')

    const trimmedName = newAreaName.trim()
    if (!trimmedName) {
      setErrorMsg('يرجى كتابة اسم المنطقة أو المحافظة')
      return
    }

    // Check if area already exists
    if (areas.some((a) => a.name.toLowerCase() === trimmedName.toLowerCase())) {
      setErrorMsg(`المنطقة "${trimmedName}" مضافة بالفعل في القائمة`)
      return
    }

    const priceNum = parseFloat(newAreaCost)
    if (isNaN(priceNum) || priceNum < 0) {
      setErrorMsg('يرجى إدخال تكلفة شحن صحيحة')
      return
    }

    const newItem: ShippingAreaItem = {
      id: `custom-area-${Date.now()}`,
      name: trimmedName,
      cost: priceNum,
      isCustom: true
    }

    setAreas((prev) => [newItem, ...prev])
    setNewAreaName('')
    setNewAreaCost('35')
  }

  // Handle deleting an area
  const handleDeleteArea = (id: string, name: string) => {
    setAreas((prev) => prev.filter((a) => a.id !== id))
    if (selectedAreaForEdit === name) {
      const remaining = areas.filter((a) => a.id !== id)
      if (remaining.length > 0) {
        setSelectedAreaForEdit(remaining[0].name)
        setSelectedAreaPrice(String(remaining[0].cost))
      } else {
        setSelectedAreaForEdit('')
      }
    }
  }

  // Handle inline cost change
  const handleCostChange = (id: string, value: string) => {
    const num = parseFloat(value)
    setAreas((prev) =>
      prev.map((a) => (a.id === id ? { ...a, cost: isNaN(num) || num < 0 ? 0 : num } : a))
    )
  }

  // Start inline rename
  const handleStartRename = (item: ShippingAreaItem) => {
    setEditingAreaId(item.id)
    setEditingAreaName(item.name)
  }

  // Save inline rename
  const handleSaveRename = (id: string) => {
    const trimmed = editingAreaName.trim()
    if (!trimmed) {
      setEditingAreaId(null)
      return
    }

    setAreas((prev) =>
      prev.map((a) => (a.id === id ? { ...a, name: trimmed } : a))
    )
    setEditingAreaId(null)
  }

  // Apply bulk price to all currently listed areas
  const handleApplyBulkPrice = () => {
    const priceNum = parseFloat(bulkPrice)
    if (isNaN(priceNum) || priceNum < 0) return

    setAreas((prev) => prev.map((a) => ({ ...a, cost: priceNum })))
    setSelectedAreaPrice(String(priceNum))
  }

  // Reset to default 27 Egyptian governorates
  const handleResetToDefaults = () => {
    if (window.confirm('هل تريد استعادة قائمة الـ 27 محافظة المصرية الافتراضية؟')) {
      const defaults = getDefaultShippingAreas()
      setAreas(defaults)
      if (defaults.length > 0) {
        setSelectedAreaForEdit(defaults[0].name)
        setSelectedAreaPrice(String(defaults[0].cost))
      }
    }
  }

  // Save all shipping rates and areas to settings & Firebase
  const handleSaveAll = async () => {
    setIsSaving(true)
    setErrorMsg('')
    try {
      const thresholdNum = parseFloat(freeThreshold)
      
      // Save areas as a clean JSON array to maintain custom names and order
      const serializedAreas = JSON.stringify(areas)

      const updatedSettings: PharmacySettings = {
        ...settings,
        shippingRates: serializedAreas,
        freeShippingThreshold: !isNaN(thresholdNum) && thresholdNum > 0 ? thresholdNum : 0
      }

      await saveSettingsToFirebase(updatedSettings)
      onSaveSettings(updatedSettings)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Error saving shipping settings:', err)
      setErrorMsg('حدث خطأ أثناء حفظ الإعدادات')
    } finally {
      setIsSaving(false)
    }
  }

  // Filter areas by search
  const filteredAreas = useMemo(() => {
    if (!searchQuery.trim()) return areas
    const q = searchQuery.toLowerCase().trim()
    return areas.filter((a) => a.name.toLowerCase().includes(q))
  }, [areas, searchQuery])

  const currency = settings.currency || 'ج.م'

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header & Main Save Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                إدارة مناطق ومحافظات الشحن والتوصيل
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                  {areas.length} منطقة / محافظة
                </Badge>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                أضف مناطق التوصيل المخصصة وحدد أسعارها بحرية، أو عدّل واحذف أي محافظة حسب تغطية صيدليتك
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetToDefaults}
              className="text-xs text-slate-600 border-slate-200 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5 ml-1.5" />
              استعادة الـ 27 محافظة الافتراضية
            </Button>

            <Button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 shadow-sm h-9 px-4"
            >
              {isSaving ? (
                <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : saveSuccess ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-200" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saveSuccess ? 'تم الحفظ بنجاح!' : 'حفظ أسعار ومناطق الشحن'}
            </Button>
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. NEW AREA CREATION FORM */}
        <div className="bg-linear-to-r from-emerald-50/90 via-emerald-50/40 to-slate-50 p-4 sm:p-5 rounded-2xl border-2 border-emerald-200 shadow-2xs">
          <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm mb-3">
            <Plus className="h-4 w-4 text-emerald-600 bg-emerald-100 p-0.5 rounded-full" />
            <span>إضافة منطقة / محافظة توصيل جديدة وتحديد سعرها</span>
          </div>

          <form onSubmit={handleAddNewArea} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6 space-y-1">
              <Label htmlFor="new-area-name" className="text-xs font-bold text-slate-700">
                اسم المنطقة أو الحي أو المدينة:
              </Label>
              <div className="relative">
                <MapPin className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="new-area-name"
                  placeholder="مثال: المعادي، مدينة نصر، الشيخ زايد، طنطا، حي الجامعة..."
                  value={newAreaName}
                  onChange={(e) => setNewAreaName(e.target.value)}
                  className="pr-9 h-10 text-xs sm:text-sm bg-white border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="sm:col-span-3 space-y-1">
              <Label htmlFor="new-area-cost" className="text-xs font-bold text-slate-700">
                تكلفة الشحن ({currency}):
              </Label>
              <Input
                id="new-area-cost"
                type="number"
                min="0"
                step="1"
                placeholder="35"
                value={newAreaCost}
                onChange={(e) => setNewAreaCost(e.target.value)}
                className="h-10 text-sm font-bold text-center text-emerald-700 bg-white border-slate-300 rounded-xl font-mono"
              />
            </div>

            <div className="sm:col-span-3 flex items-end">
              <Button
                type="submit"
                className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 rounded-xl shadow-xs"
              >
                <Plus className="h-4 w-4" />
                إضافة المنطقة للقائمة
              </Button>
            </div>
          </form>
        </div>

        {/* 2. Quick Controls & Free Shipping Threshold */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Quick Dropdown Adjuster */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <span>تعديل سريع لسعر منطقة من القائمة</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-6">
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                  اختر المنطقة / المحافظة
                </Label>
                <select
                  value={selectedAreaForEdit}
                  onChange={(e) => handleAreaDropdownChange(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {areas.map((a) => (
                    <option key={a.id} value={a.name}>
                      {a.name} ({a.cost} {currency})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                  السعر الجديد ({currency})
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={selectedAreaPrice}
                  onChange={(e) => setSelectedAreaPrice(e.target.value)}
                  className="h-9 bg-white text-xs text-center font-bold text-emerald-700"
                />
              </div>

              <div className="sm:col-span-3 flex items-end">
                <Button
                  onClick={handleApplySingleAreaPrice}
                  className="w-full h-9 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                >
                  تطبيق
                </Button>
              </div>
            </div>
          </div>

          {/* Bulk Price & Free Shipping */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Gift className="h-4 w-4 text-amber-600" />
              <span>تسعير موحد وشحن مجاني</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                  سعر موحد لكل المناطق ({currency})
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
                    className="h-9 text-xs shrink-0 bg-white"
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

      {/* 3. FULL AREAS TABLE WITH INLINE EDIT, RENAME & DELETE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-sm text-slate-900">
              قائمة مناطق ومحافظات التوصيل المعتمدة ({filteredAreas.length})
            </h4>
            <span className="text-xs text-slate-500">
              (يمكنك تعديل الاسم، السعر، أو حذف أي منطقة)
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن منطقة أو محافظة..."
              className="pr-9 h-9 text-xs bg-white rounded-lg"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-100/70">
              <TableRow>
                <TableHead className="text-right text-xs font-bold text-slate-700 w-14">#</TableHead>
                <TableHead className="text-right text-xs font-bold text-slate-700">اسم المنطقة / المحافظة</TableHead>
                <TableHead className="text-center text-xs font-bold text-slate-700 w-44">
                  تكلفة الشحن ({currency})
                </TableHead>
                <TableHead className="text-center text-xs font-bold text-slate-700 w-32">النوع</TableHead>
                <TableHead className="text-left text-xs font-bold text-slate-700 w-24">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAreas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-slate-500 text-sm">
                    لا توجد مناطق مطابقة للبحث
                  </TableCell>
                </TableRow>
              ) : (
                filteredAreas.map((area, idx) => {
                  const isEditingName = editingAreaId === area.id

                  return (
                    <TableRow key={area.id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="text-xs text-slate-400 font-mono">{idx + 1}</TableCell>
                      
                      {/* Name with inline editing */}
                      <TableCell>
                        {isEditingName ? (
                          <div className="flex items-center gap-1 max-w-sm">
                            <Input
                              value={editingAreaName}
                              onChange={(e) => setEditingAreaName(e.target.value)}
                              className="h-8 text-xs bg-white border-emerald-500 font-semibold"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename(area.id)
                                if (e.key === 'Escape') setEditingAreaId(null)
                              }}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-emerald-600 hover:bg-emerald-50"
                              onClick={() => handleSaveRename(area.id)}
                              title="حفظ الاسم"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-slate-400 hover:bg-slate-100"
                              onClick={() => setEditingAreaId(null)}
                              title="إلغاء"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group">
                            <span className="font-semibold text-sm text-slate-900">{area.name}</span>
                            <button
                              type="button"
                              onClick={() => handleStartRename(area)}
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 transition p-1"
                              title="تعديل اسم المنطقة"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                            {area.cost === 0 && (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] py-0">
                                شحن مجاني
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>

                      {/* Cost Input */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            value={area.cost}
                            onChange={(e) => handleCostChange(area.id, e.target.value)}
                            className="w-24 h-8 text-center text-xs font-bold text-emerald-800 bg-white border-slate-300 focus:border-emerald-500 rounded-lg font-mono"
                          />
                          <span className="text-xs text-slate-500 font-medium">{currency}</span>
                        </div>
                      </TableCell>

                      {/* Badge / Type */}
                      <TableCell className="text-center">
                        {area.isCustom ? (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]">
                            منطقة مخصصة
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[10px]">
                            محافظة
                          </Badge>
                        )}
                      </TableCell>

                      {/* Actions: Delete */}
                      <TableCell className="text-left">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteArea(area.id, area.name)}
                          className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                          title="حذف المنطقة من القائمة"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
