import { useState, useEffect, useCallback } from 'react'
import {
  Pill,
  ShoppingBag,
  Settings as SettingsIcon,
  LogIn,
  LogOut,
  Package,
  Warehouse,
  FileSpreadsheet,
  BarChart3,
  Search,
  MessageCircle,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Flame,
  Zap,
  Truck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProductGrid } from '@/components/store/product-grid'
import { CartSheet } from '@/components/store/cart-sheet'
import { ProductsManager } from '@/components/admin/products-manager'
import { InventoryManager } from '@/components/admin/inventory-manager'
import { OrdersManager } from '@/components/admin/orders-manager'
import { ShippingManager } from '@/components/admin/shipping-manager'
import { ReportsManager } from '@/components/admin/reports-manager'
import { SettingsDialog } from '@/components/admin/settings-dialog'
import { LoginDialog } from '@/components/admin/login-dialog'
import { useAuthStore } from '@/store/auth-store'
import { useCartStore } from '@/store/cart-store'
import { normalizeWhatsAppNumber } from '@/lib/phone-utils'
import {
  subscribeToProducts,
  subscribeToSettings,
  seedFirebaseIfEmpty,
  saveSettingsToFirebase
} from '@/lib/firebase'
import type { Product, PharmacySettings } from '@/lib/types'

export default function App() {
  const [products, setProducts] = useState<Product[]>([])
  const [settings, setSettings] = useState<PharmacySettings>({
    id: 'default',
    pharmacyName: 'صيدلية الشفاء أونلاين',
    whatsappNumber: '01116664299',
    whatsappNumbers: '[]',
    currency: 'ج.م',
    adminUsername: 'admin',
    adminPassword: 'admin123'
  })
  const [isLoading, setIsLoading] = useState(true)
  const [cartOpen, setCartOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [adminTab, setAdminTab] = useState<'products' | 'inventory' | 'orders' | 'shipping' | 'reports'>('products')
  const [viewMode, setViewMode] = useState<'store' | 'admin'>('store')
  const [firebaseConnected, setFirebaseConnected] = useState(true)

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const logout = useAuthStore((s) => s.logout)
  const totalCartItems = useCartStore((s) => s.getTotalItems())

  // Realtime Firebase Subscriptions for Instant Data
  useEffect(() => {
    let isMounted = true

    // Set initial title and favicon
    document.title = `${settings.pharmacyName || 'صيدلية الشفاء أونلاين'} | طلب أدوية ومستلزمات طبية`
    let faviconLink = document.querySelector("link[rel~='icon']") as HTMLLinkElement
    if (!faviconLink) {
      faviconLink = document.createElement('link')
      faviconLink.rel = 'icon'
      faviconLink.type = 'image/svg+xml'
      document.head.appendChild(faviconLink)
    }
    faviconLink.href = '/favicon.svg'

    // 1. Subscribe to active products in real-time
    const unsubscribeProducts = subscribeToProducts((realtimeProducts) => {
      if (isMounted) {
        setProducts(realtimeProducts)
        setIsLoading(false)
        setFirebaseConnected(true)
      }
    }, true)

    // 2. Subscribe to settings in real-time
    const unsubscribeSettings = subscribeToSettings((realtimeSettings) => {
      if (isMounted && realtimeSettings) {
        setSettings(realtimeSettings)
        if (realtimeSettings.pharmacyName) {
          document.title = `${realtimeSettings.pharmacyName} | طلب أدوية ومستلزمات طبية وتوصيل للمنازل`
        }
      }
    })

    // 3. Check and seed initial products to Firebase if database is new
    fetch('/api/products?active=false')
      .then((res) => res.json())
      .then((initialProducts) => {
        if (Array.isArray(initialProducts) && initialProducts.length > 0) {
          seedFirebaseIfEmpty(initialProducts, settings)
        }
      })
      .catch(() => {})

    return () => {
      isMounted = false
      unsubscribeProducts()
      unsubscribeSettings()
    }
  }, [])

  const normalizedWhatsApp = normalizeWhatsAppNumber(settings.whatsappNumber)

  const handleSaveSettings = async (newSettings: PharmacySettings) => {
    setSettings(newSettings)
    await saveSettingsToFirebase(newSettings)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans" dir="rtl">
      {/* Top Announcement / Info Bar */}
      <div className="bg-emerald-900 text-emerald-100 text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="flex items-center gap-1.5 font-medium">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              قاعدة بيانات Firebase متصلة بالكامل (pharmacy-89268) — تحديثات وبيانات مباشرة وفورية
            </span>
          </div>
          {normalizedWhatsApp && (
            <a
              href={`https://wa.me/${normalizedWhatsApp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-white transition font-mono"
              dir="ltr"
            >
              <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
              +{normalizedWhatsApp}
            </a>
          )}
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo & Name */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => setViewMode('store')}
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
              <Pill className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight text-slate-900">
                {settings.pharmacyName || 'الصيدلية'}
              </h1>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <span>صيدلية وخدمة توصيل فورية</span>
                <span className="text-emerald-600 font-semibold">• متاح أونلاين</span>
              </p>
            </div>
          </div>

          {/* Navigation & Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Store / Admin switcher */}
            {isAuthenticated ? (
              <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                <Button
                  variant={viewMode === 'store' ? 'default' : 'ghost'}
                  size="sm"
                  className={`h-8 text-xs ${viewMode === 'store' ? 'bg-emerald-600 text-white' : 'text-slate-700'}`}
                  onClick={() => setViewMode('store')}
                >
                  المتجر
                </Button>
                <Button
                  variant={viewMode === 'admin' ? 'default' : 'ghost'}
                  size="sm"
                  className={`h-8 text-xs ${viewMode === 'admin' ? 'bg-emerald-600 text-white' : 'text-slate-700'}`}
                  onClick={() => setViewMode('admin')}
                >
                  لوحة التحكم
                </Button>
              </div>
            ) : null}

            {/* Cart Button */}
            <Button
              variant="outline"
              className="relative h-10 px-3.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900 bg-white"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingBag className="h-4 w-4 ml-1 text-emerald-600" />
              <span className="font-semibold text-xs">السلة</span>
              {totalCartItems > 0 && (
                <Badge className="absolute -top-2 -left-2 bg-emerald-600 text-white text-[11px] h-5 min-w-5 flex items-center justify-center rounded-full p-1 border-2 border-white">
                  {totalCartItems}
                </Badge>
              )}
            </Button>

            {/* Admin Login / Logout */}
            {isAuthenticated ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 text-slate-700 hover:bg-slate-100"
                  onClick={() => setSettingsOpen(true)}
                  title="إعدادات الواتساب والصيدلية"
                >
                  <SettingsIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 text-xs text-rose-600 hover:bg-rose-50"
                  onClick={() => {
                    logout()
                    setViewMode('store')
                  }}
                >
                  <LogOut className="h-4 w-4 ml-1" />
                  خروج
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-10 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                onClick={() => setLoginOpen(true)}
              >
                <LogIn className="h-4 w-4 ml-1.5" />
                لوحة الإدارة
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {viewMode === 'admin' && isAuthenticated ? (
          /* ================= ADMIN VIEW ================= */
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border shadow-sm">
              <div>
                <h2 className="text-xl font-bold text-slate-900">لوحة تحكم الصيدلية</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  إدارة المنتجات، المخزون، الطلبات، والواتساب المعتمد للفواتير
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                onClick={() => setSettingsOpen(true)}
              >
                <SettingsIcon className="h-4 w-4 ml-2 text-emerald-600" />
                إعدادات الواتساب والصيدلية
              </Button>
            </div>

            <Tabs value={adminTab} onValueChange={(v) => setAdminTab(v as any)}>
              <TabsList className="bg-white border p-1 rounded-xl w-full sm:w-auto grid grid-cols-2 sm:flex gap-1">
                <TabsTrigger value="products" className="text-xs gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                  <Package className="h-4 w-4" />
                  المنتجات
                </TabsTrigger>
                <TabsTrigger value="inventory" className="text-xs gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                  <Warehouse className="h-4 w-4" />
                  المخزون
                </TabsTrigger>
                <TabsTrigger value="orders" className="text-xs gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                  <FileSpreadsheet className="h-4 w-4" />
                  الطلبات والفواتير
                </TabsTrigger>
                <TabsTrigger value="shipping" className="text-xs gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                  <Truck className="h-4 w-4" />
                  أسعار الشحن والمحافظات
                </TabsTrigger>
                <TabsTrigger value="reports" className="text-xs gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                  <BarChart3 className="h-4 w-4" />
                  التقارير
                </TabsTrigger>
              </TabsList>

              <div className="mt-4">
                <TabsContent value="products">
                  <ProductsManager currency={settings.currency || 'ج.م'} />
                </TabsContent>
                <TabsContent value="inventory">
                  <InventoryManager currency={settings.currency || 'ج.م'} />
                </TabsContent>
                <TabsContent value="orders">
                  <OrdersManager currency={settings.currency || 'ج.م'} settings={settings} />
                </TabsContent>
                <TabsContent value="shipping">
                  <ShippingManager settings={settings} onSaveSettings={handleSaveSettings} />
                </TabsContent>
                <TabsContent value="reports">
                  <ReportsManager currency={settings.currency || 'ج.م'} settings={settings} />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        ) : (
          /* ================= STORE VIEW ================= */
          <div className="space-y-6">
            {/* Hero / Information Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-emerald-700 via-emerald-800 to-teal-900 text-white p-6 sm:p-8 shadow-lg">
              <div className="relative z-10 max-w-2xl space-y-3">
                <Badge className="bg-emerald-500/30 text-emerald-200 border-emerald-400/40 text-xs px-3 py-1">
                  طلب سهل وسريع عبر الواتساب ⚡
                </Badge>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  أهلاً بك في {settings.pharmacyName || 'الصيدلية'}
                </h2>
                <p className="text-emerald-100 text-sm leading-relaxed">
                  اطلب أدويتك ومستلزماتك الطبية بضغطة واحدة، وسيتم تحويل الفاتورة تلقائياً إلى واتساب الصيدلية للتجهيز والتوصيل الفوري.
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-emerald-200">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    منتجات أصلية 100%
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MessageCircle className="h-4 w-4 text-emerald-400" />
                    فاتورة تلقائية منظمة
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    خدمة وتوصيل موثوق
                  </span>
                </div>
              </div>
              <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            </div>

            {/* Products Grid */}
            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="h-10 w-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <ProductGrid
                products={products}
                currency={settings.currency || 'ج.م'}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-white py-6 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p>© {new Date().getFullYear()} {settings.pharmacyName || 'صيدلية أونلاين'}. جميع الحقوق محفوظة.</p>
          <p className="text-[11px] text-slate-400">
            نظام إدارة الصيدليات والطلب الذكي وإرسال الفواتير التلقائية عبر WhatsApp
          </p>
        </div>
      </footer>

      {/* Cart Sheet */}
      <CartSheet
        open={cartOpen}
        onOpenChange={setCartOpen}
        settings={settings}
      />

      {/* Admin Login Dialog */}
      <LoginDialog
        open={loginOpen}
        onOpenChange={(open) => {
          setLoginOpen(open)
          if (!open && useAuthStore.getState().isAuthenticated) {
            setViewMode('admin')
          }
        }}
      />

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onSave={handleSaveSettings}
      />
    </div>
  )
}
