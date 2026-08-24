import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Warehouse, AlertTriangle, Save, Zap } from 'lucide-react'
import Image from '@/components/common/Image'
import { subscribeToProducts, updateProductStockInFirebase } from '@/lib/firebase'
import type { Product } from '@/lib/types'

export function InventoryManager({ currency }: { currency: string }) {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingStock, setEditingStock] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeToProducts((data) => {
      setProducts(data)
      setIsLoading(false)
      const initialStock: Record<string, string> = {}
      data.forEach((p) => {
        initialStock[p.id] = String(p.stock)
      })
      setEditingStock((prev) => ({ ...initialStock, ...prev }))
    }, false)

    return () => unsubscribe()
  }, [])

  const handleStockChange = (productId: string, value: string) => {
    setEditingStock((prev) => ({ ...prev, [productId]: value }))
  }

  const handleSaveStock = async (productId: string) => {
    const newStock = parseInt(editingStock[productId], 10)
    if (isNaN(newStock) || newStock < 0) return
    setSaving(productId)
    try {
      await updateProductStockInFirebase(productId, newStock)
    } catch (error) {
      console.error('Error updating stock:', error)
    } finally {
      setSaving(null)
    }
  }

  const lowStockProducts = products.filter((p) => p.stock <= 5 && p.isActive)
  const totalProducts = products.length
  const outOfStock = products.filter((p) => p.stock === 0 && p.isActive).length
  const totalStockValue = products.reduce((sum, p) => sum + p.price * p.stock, 0)

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <Warehouse className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">إجمالي المنتجات</p>
                <p className="text-xl font-bold">{totalProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">نفذ المخزون</p>
                <p className="text-xl font-bold text-red-600">{outOfStock}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">مخزون منخفض</p>
                <p className="text-xl font-bold text-amber-600">{lowStockProducts.length}</p>
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
                <p className="text-xs text-muted-foreground">قيمة المخزون</p>
                <p className="text-xl font-bold">{totalStockValue.toFixed(2)} <span className="text-xs font-normal">{currency}</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <Warehouse className="h-5 w-5" />
            إدارة المخزون والتوافر
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المنتج</TableHead>
                    <TableHead>التصنيف</TableHead>
                    <TableHead className="text-center">السعر</TableHead>
                    <TableHead className="text-center">المخزون الحالي</TableHead>
                    <TableHead className="text-center">تعديل المخزون</TableHead>
                    <TableHead className="text-center">حالة المخزون</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-muted overflow-hidden flex-shrink-0">
                            {product.images && product.images[0] ? (
                              <Image
                                src={product.images[0].url}
                                alt={product.name}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Warehouse className="h-3 w-3 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{product.name}</p>
                            {!product.isActive && (
                              <Badge variant="secondary" className="text-[10px]">معطل</Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{product.category}</Badge>
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {product.price} <span className="text-xs text-muted-foreground">{currency}</span>
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {product.stock}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Input
                            type="number"
                            className="w-20 h-8 text-center text-sm bg-white"
                            value={editingStock[product.id] || ''}
                            onChange={(e) => handleStockChange(product.id, e.target.value)}
                            min="0"
                            dir="ltr"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleSaveStock(product.id)}
                            disabled={saving === product.id || editingStock[product.id] === String(product.stock)}
                          >
                            {saving === product.id ? (
                              <div className="h-4 w-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Save className="h-4 w-4 text-emerald-600" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {product.stock === 0 ? (
                          <Badge variant="destructive" className="text-xs">نفذ</Badge>
                        ) : product.stock <= 5 ? (
                          <Badge className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">منخفض ({product.stock})</Badge>
                        ) : product.stock <= 20 ? (
                          <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-200">متوسط</Badge>
                        ) : (
                          <Badge className="text-xs bg-green-100 text-green-800 border-green-200">جيد</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
