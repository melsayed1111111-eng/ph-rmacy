import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import { ProductCard } from './product-card'
import { ProductDetailDialog } from './product-detail-dialog'
import type { Product } from '@/lib/types'

interface ProductGridProps {
  products: Product[]
  currency: string
}

const CATEGORIES = ['الكل', 'أدوية', 'فيتامينات', 'عناية شخصية', 'مستلزمات طبية', 'أخرى']

export function ProductGrid({ products, currency }: ProductGridProps) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('الكل')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        !search ||
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.description.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = category === 'الكل' || product.category === category
      return matchesSearch && matchesCategory
    })
  }, [products, search, category])

  const handleViewDetails = (product: Product) => {
    setSelectedProduct(product)
    setDetailOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ابحث عن دواء، مكمل غذائي، مستلزمات..."
            className="pr-10 bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat}
            variant={category === cat ? 'default' : 'outline'}
            size="sm"
            className={`whitespace-nowrap transition-all rounded-full px-4 ${
              category === cat ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm' : 'bg-white hover:bg-emerald-50'
            }`}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Product Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              currency={currency}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed p-8">
          <svg className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-muted-foreground text-lg font-medium">لم يتم العثور على منتجات مطابقة</p>
          <p className="text-muted-foreground text-sm mt-1">جرب البحث بكلمات أخرى أو اختر تصنيفاً مختلفاً</p>
        </div>
      )}

      {/* Product Detail Dialog */}
      <ProductDetailDialog
        product={selectedProduct}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        currency={currency}
      />
    </div>
  )
}
