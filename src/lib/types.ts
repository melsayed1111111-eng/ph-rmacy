export interface Product {
  id: string
  name: string
  description: string
  price: number
  stock: number
  category: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  images: ProductImage[]
}

export interface ProductImage {
  id: string
  productId: string
  url: string
  sortOrder: number
}

export interface ShippingRate {
  governorate: string
  cost: number
}

export interface Order {
  id: string
  customerName: string
  customerPhone: string
  customerAddress?: string
  governorate?: string
  shippingCost?: number
  subtotal?: number
  status: OrderStatus
  totalAmount: number
  notes: string
  createdAt: string
  updatedAt: string
  items: OrderItem[]
}

export interface OrderItem {
  id: string
  orderId: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  productImage?: string
}

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'

export interface WhatsAppEntry {
  label: string
  number: string
}

export interface PharmacySettings {
  id: string
  pharmacyName: string
  whatsappNumber: string
  whatsappNumbers: string
  currency: string
  adminUsername: string
  adminPassword: string
  shippingRates?: string // JSON Record<string, number>
  defaultShippingCost?: number
  freeShippingThreshold?: number
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'قيد الانتظار',
  confirmed: 'مؤكد',
  preparing: 'قيد التحضير',
  ready: 'جاهز',
  delivered: 'تم التسليم',
  cancelled: 'ملغي'
}

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  preparing: 'bg-orange-100 text-orange-800 border-orange-200',
  ready: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-rose-100 text-rose-800 border-rose-200'
}
