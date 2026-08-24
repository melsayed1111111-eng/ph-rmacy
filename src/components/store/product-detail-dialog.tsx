import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ShoppingCart, Plus, Minus, ChevronLeft, ChevronRight } from 'lucide-react'
import Image from '@/components/common/Image'
import type { Product } from '@/lib/types'
import { useCartStore } from '@/store/cart-store'

interface ProductDetailDialogProps {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
  currency: string
}

export function ProductDetailDialog({
  product,
  open,
  onOpenChange,
  currency
}: ProductDetailDialogProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const addItem = useCartStore((s) => s.addItem)
  const items = useCartStore((s) => s.items)
  const updateQuantity = useCartStore((s) => s.updateQuantity)

  const cartItem = product ? items.find((i) => i.productId === product.id) : null

  useEffect(() => {
    setCurrentImageIndex(0)
  }, [product])

  if (!product) return null

  const images = product.images && product.images.length > 0 ? product.images : []
  const currentImage = images[currentImageIndex]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden" dir="rtl">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Image gallery */}
          <div className="relative aspect-square bg-muted">
            {currentImage ? (
              <Image
                src={currentImage.url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
            )}

            {images.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full shadow"
                  onClick={() => setCurrentImageIndex((prev) => (prev + 1) % images.length)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full shadow"
                  onClick={() => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentImageIndex ? 'bg-emerald-600 ring-2 ring-white' : 'bg-white/70'
                      }`}
                      onClick={() => setCurrentImageIndex(index)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Details */}
          <div className="p-6 flex flex-col">
            <DialogHeader className="text-right p-0 mb-3">
              <Badge variant="outline" className="w-fit text-xs mb-2">{product.category}</Badge>
              <DialogTitle className="text-xl font-bold">{product.name}</DialogTitle>
            </DialogHeader>

            <p className="text-muted-foreground text-sm mb-4 leading-relaxed">{product.description}</p>
            
            <div className="text-2xl font-bold text-emerald-600 mb-1">
              {product.price} <span className="text-sm font-normal text-muted-foreground">{currency}</span>
            </div>
            
            <p className="text-sm text-muted-foreground mb-6">
              المخزون: {product.stock > 0 ? `${product.stock} قطعة` : <span className="text-rose-600 font-semibold">نفذ المخزون</span>}
            </p>

            {/* Image thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                {images.map((img, index) => (
                  <button
                    key={img.id || index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                      index === currentImageIndex ? 'border-emerald-600 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <Image
                      src={img.url}
                      alt={`${product.name} ${index + 1}`}
                      className="object-cover w-full h-full"
                    />
                  </button>
                ))}
              </div>
            )}

            <div className="mt-auto pt-4 border-t">
              {cartItem ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateQuantity(product.id, cartItem.quantity - 1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-lg font-semibold w-8 text-center">{cartItem.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateQuantity(product.id, cartItem.quantity + 1)}
                      disabled={cartItem.quantity >= product.stock}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <span className="text-emerald-700 font-bold text-base">
                    = {(cartItem.quantity * product.price).toFixed(2)} {currency}
                  </span>
                </div>
              ) : (
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  size="lg"
                  disabled={product.stock <= 0}
                  onClick={() =>
                    addItem({
                      id: product.id,
                      productId: product.id,
                      productName: product.name,
                      price: product.price,
                      image: images[0]?.url || '',
                      maxStock: product.stock
                    })
                  }
                >
                  <ShoppingCart className="h-5 w-5 ml-2" />
                  أضف للسلة
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
