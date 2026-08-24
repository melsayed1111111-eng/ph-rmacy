import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ShoppingCart, Plus, Minus, Eye } from 'lucide-react'
import Image from '@/components/common/Image'
import type { Product } from '@/lib/types'
import { useCartStore } from '@/store/cart-store'

interface ProductCardProps {
  product: Product
  currency: string
  onViewDetails: (product: Product) => void
}

export function ProductCard({ product, currency, onViewDetails }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem)
  const items = useCartStore((s) => s.items)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const cartItem = items.find((i) => i.productId === product.id)
  const mainImage = product.images?.[0]

  return (
    <Card className="group overflow-hidden border shadow-sm hover:shadow-md transition-all duration-300">
      <div
        className="relative aspect-square bg-muted cursor-pointer overflow-hidden"
        onClick={() => onViewDetails(product)}
      >
        {mainImage ? (
          <Image
            src={mainImage.url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
        )}
        {product.images && product.images.length > 1 && (
          <Badge className="absolute top-2 left-2 text-xs" variant="secondary">
            {product.images.length} صور
          </Badge>
        )}
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation()
            onViewDetails(product)
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
        {product.stock <= 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="destructive" className="text-sm">نفذ المخزون</Badge>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <div className="mb-1">
          <Badge variant="outline" className="text-xs">{product.category}</Badge>
        </div>
        <h3 className="font-semibold text-sm mb-1 line-clamp-2 leading-relaxed">{product.name}</h3>
        <p className="text-muted-foreground text-xs mb-3 line-clamp-1">{product.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-emerald-600 font-bold text-lg">{product.price} <span className="text-xs font-normal">{currency}</span></span>
          {cartItem ? (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => updateQuantity(product.id, cartItem.quantity - 1)}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-8 text-center font-semibold text-sm">{cartItem.quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => updateQuantity(product.id, cartItem.quantity + 1)}
                disabled={cartItem.quantity >= product.stock}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={product.stock <= 0}
              onClick={() =>
                addItem({
                  id: product.id,
                  productId: product.id,
                  productName: product.name,
                  price: product.price,
                  image: mainImage?.url || '',
                  maxStock: product.stock
                })
              }
            >
              <ShoppingCart className="h-4 w-4 ml-1" />
              أضف
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
