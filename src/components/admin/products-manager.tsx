import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Pencil, Trash2, Search, Package, ToggleLeft, ToggleRight, Zap } from 'lucide-react'
import Image from '@/components/common/Image'
import { ProductFormDialog, type ProductFormData } from './product-form-dialog'
import {
  subscribeToProducts,
  saveProductToFirebase,
  deleteProductFromFirebase
} from '@/lib/firebase'
import type { Product, ProductImage } from '@/lib/types'

const CATEGORIES = ['أدوية', 'فيتامينات', 'عناية شخصية', 'مستلزمات طبية', 'أخرى']

export function ProductsManager({ currency }: { currency: string }) {
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Realtime subscription to all products (including inactive)
    const unsubscribe = subscribeToProducts((products) => {
      setAllProducts(products)
      setIsLoading(false)
    }, false)

    return () => unsubscribe()
  }, [])

  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      const matchesSearch =
        !search ||
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.description.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = filterCategory === 'all' || product.category === filterCategory
      return matchesSearch && matchesCategory
    })
  }, [allProducts, search, filterCategory])

  const handleAdd = () => {
    setEditProduct(null)
    setFormOpen(true)
  }

  const handleEdit = (product: Product) => {
    setEditProduct(product)
    setFormOpen(true)
  }

  const handleSave = async (data: ProductFormData) => {
    try {
      const productId = editProduct ? editProduct.id : `prod-${Date.now()}`
      const imageList: ProductImage[] = Array.isArray(data.images)
        ? data.images.map((url: string, idx: number) => ({
            id: `img-${Date.now()}-${idx}`,
            productId,
            url,
            sortOrder: idx
          }))
        : []

      const productPayload: Product = {
        id: productId,
        name: data.name,
        description: data.description || '',
        price: parseFloat(data.price) || 0,
        stock: parseInt(data.stock, 10) || 0,
        category: data.category || 'أخرى',
        isActive: editProduct ? editProduct.isActive : true,
        createdAt: editProduct ? editProduct.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        images: imageList
      }

      await saveProductToFirebase(productPayload)
      setFormOpen(false)
    } catch (error) {
      console.error('Error saving product:', error)
    }
  }

  const handleDelete = async () => {
    if (!deleteProduct) return
    try {
      await deleteProductFromFirebase(deleteProduct.id)
      setDeleteProduct(null)
    } catch (error) {
      console.error('Error deleting product:', error)
    }
  }

  const toggleActive = async (product: Product) => {
    try {
      const updated: Product = {
        ...product,
        isActive: !product.isActive,
        updatedAt: new Date().toISOString()
      }
      await saveProductToFirebase(updated)
    } catch (error) {
      console.error('Error toggling product:', error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            إدارة المنتجات ({allProducts.length})
          </CardTitle>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleAdd}>
            <Plus className="h-4 w-4 ml-2" />
            إضافة منتج
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث عن منتج..."
              className="pr-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[140px]"
          >
            <option value="all">كل التصنيفات</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {(search || filterCategory !== 'all') && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span>عرض {filteredProducts.length} من {allProducts.length} منتج</span>
            <button
              className="text-emerald-600 hover:underline"
              onClick={() => { setSearch(''); setFilterCategory('all') }}
            >
              مسح الفلتر
            </button>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{(search || filterCategory !== 'all') ? 'لا توجد منتجات تطابق البحث' : 'لا توجد منتجات بعد'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">الصورة</TableHead>
                  <TableHead>الاسم</TableHead>
                  <TableHead>التصنيف</TableHead>
                  <TableHead className="text-center">السعر</TableHead>
                  <TableHead className="text-center">المخزون</TableHead>
                  <TableHead className="text-center">الحالة</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden">
                        {product.images && product.images[0] ? (
                          <Image
                            src={product.images[0].url}
                            alt={product.name}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{product.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{product.category}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-semibold text-emerald-600">
                      {product.price} <span className="text-xs font-normal text-muted-foreground">{currency}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={product.stock <= 5 ? 'text-destructive font-semibold' : ''}>
                        {product.stock}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={() => toggleActive(product)}
                        className="inline-flex items-center gap-1"
                      >
                        {product.isActive ? (
                          <>
                            <ToggleRight className="h-5 w-5 text-emerald-600" />
                            <span className="text-xs text-emerald-600">نشط</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">معطل</span>
                          </>
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(product)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteProduct(product)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <ProductFormDialog
        product={editProduct}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSave={handleSave}
        categories={CATEGORIES}
      />

      <AlertDialog open={!!deleteProduct} onOpenChange={() => setDeleteProduct(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>حذف المنتج</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف "{deleteProduct?.name}"؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row justify-end gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
