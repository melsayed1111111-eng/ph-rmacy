import { useState, useRef, useEffect, type ChangeEvent } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { X, Upload, Loader2 } from 'lucide-react'
import Image from '@/components/common/Image'
import type { Product } from '@/lib/types'

interface ProductFormDialogProps {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: ProductFormData) => void
  categories: string[]
}

export interface ProductFormData {
  name: string
  description: string
  price: string
  stock: string
  category: string
  images: string[]
}

function getInitialFormState(product: Product | null): ProductFormData {
  return {
    name: product?.name ?? '',
    description: product?.description ?? '',
    price: product ? String(product.price) : '',
    stock: product ? String(product.stock) : '',
    category: product?.category ?? 'أخرى',
    images: product?.images?.map((img) => img.url) ?? []
  }
}

export function ProductFormDialog({
  product,
  open,
  onOpenChange,
  onSave,
  categories
}: ProductFormDialogProps) {
  const [form, setForm] = useState<ProductFormData>(() => getInitialFormState(product))
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isEditing = !!product

  useEffect(() => {
    setForm(getInitialFormState(product))
  }, [product, open])

  const updateField = (field: keyof ProductFormData, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      setForm(getInitialFormState(null))
    }
    onOpenChange(newOpen)
  }

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    setIsUploading(true)
    const fileList: File[] = Array.from(files)

    fileList.forEach((file: File) => {
      if (file.size > 5 * 1024 * 1024) {
        setIsUploading(false)
        return
      }
      const reader = new FileReader()
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string
        setForm((prev) => ({
          ...prev,
          images: [...prev.images, dataUrl]
        }))
        setIsUploading(false)
      }
      reader.readAsDataURL(file)
    })

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = () => {
    if (!form.name.trim() || !form.price) return
    onSave({
      name: form.name.trim(),
      description: form.description.trim(),
      price: form.price,
      stock: form.stock || '0',
      category: form.category,
      images: form.images
    })
    setForm(getInitialFormState(null))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="text-lg font-bold">
            {isEditing ? 'تعديل بيانات المنتج' : 'إضافة منتج صيدلية جديد'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">اسم المنتج / الدواء *</Label>
            <Input
              placeholder="مثال: باراسيتامول 500 مجم"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">الوصف ودواعي الاستعمال</Label>
            <Textarea
              placeholder="وصف مختصر للمنتج أو الجرعة..."
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">السعر *</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={form.price}
                onChange={(e) => updateField('price', e.target.value)}
                min="0"
                step="0.01"
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">المخزون المتوفر</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.stock}
                onChange={(e) => updateField('stock', e.target.value)}
                min="0"
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">التصنيف</Label>
              <select
                value={form.category}
                onChange={(e) => updateField('category', e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-white px-3 text-xs"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">صور المنتج</Label>
            <div className="grid grid-cols-4 gap-2">
              {form.images.map((img, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted border">
                  <Image
                    src={img}
                    alt={`صورة ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 rounded-full"
                    onClick={() => removeImage(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  {index === 0 && (
                    <Badge className="absolute bottom-1 right-1 text-[10px] bg-emerald-600">رئيسية</Badge>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-emerald-500 hover:bg-emerald-50 transition-colors"
              >
                {isUploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                ) : (
                  <div className="text-center p-2">
                    <Upload className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                    <span className="text-[11px] text-muted-foreground font-medium block">إضافة صورة</span>
                  </div>
                )}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
            <p className="text-[11px] text-muted-foreground">
              الصورة الأولى ستكون الرئيسية في المتجر • يمكنك رفع عدة صور للمنتج
            </p>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t flex-row justify-end gap-2">
          <Button variant="outline" onClick={() => handleClose(false)}>
            إلغاء
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            onClick={handleSubmit}
            disabled={!form.name.trim() || !form.price}
          >
            {isEditing ? 'حفظ التعديلات' : 'إضافة المنتج'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
