import express from 'express'
import path from 'path'
import fs from 'fs'
import { createServer as createViteServer } from 'vite'

interface ProductImage {
  id: string
  productId: string
  url: string
  sortOrder: number
}

interface Product {
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

interface OrderItem {
  id: string
  orderId: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  productImage?: string
}

interface Order {
  id: string
  customerName: string
  customerPhone: string
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
  totalAmount: number
  notes: string
  createdAt: string
  updatedAt: string
  items: OrderItem[]
}

interface PharmacySettings {
  id: string
  pharmacyName: string
  whatsappNumber: string
  whatsappNumbers: string
  currency: string
  adminUsername: string
  adminPassword: string
}

interface DatabaseSchema {
  products: Product[]
  orders: Order[]
  settings: PharmacySettings
}

const DATA_DIR = path.join(process.cwd(), 'data')
const DB_FILE = path.join(DATA_DIR, 'db.json')

// Default seed data
const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'بانادول إكسترا 500 ملجم (Panadol Extra)',
    description: 'مسكن للآلام وخافض للحرارة فعال للصداع وآلام الجسم والأسنان',
    price: 35.0,
    stock: 45,
    category: 'أدوية',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    images: [
      {
        id: 'img-1',
        productId: 'prod-1',
        url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60',
        sortOrder: 0
      }
    ]
  },
  {
    id: 'prod-2',
    name: 'فيتامين سي 1000 مجم فوار (Vitamin C Effervescent)',
    description: 'لتقوية المناعة ومقاومة نزلات البرد والإنفلونزا بطعم البرتقال اللذيذ',
    price: 60.0,
    stock: 30,
    category: 'فيتامينات',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    images: [
      {
        id: 'img-2',
        productId: 'prod-2',
        url: 'https://images.unsplash.com/photo-1550572017-ed200f5e6343?w=500&auto=format&fit=crop&q=60',
        sortOrder: 0
      }
    ]
  },
  {
    id: 'prod-3',
    name: 'أوميجا 3 بلس 1000 ملجم (Omega 3 Plus)',
    description: 'زيت السمك النقي لدعم صحة القلب والشرايين والنشاط الذهني والذاكرة',
    price: 110.0,
    stock: 22,
    category: 'فيتامينات',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    images: [
      {
        id: 'img-3',
        productId: 'prod-3',
        url: 'https://images.unsplash.com/photo-1577401239170-897942555fb3?w=500&auto=format&fit=crop&q=60',
        sortOrder: 0
      }
    ]
  },
  {
    id: 'prod-4',
    name: 'كريم مرطب بيبانثين للجلد (Bepanthen Cream)',
    description: 'مرطب طبي مجدد لخلايا البشرة ومهدئ للالتهابات والجفاف وحروق الشمس',
    price: 85.0,
    stock: 18,
    category: 'عناية شخصية',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    images: [
      {
        id: 'img-4',
        productId: 'prod-4',
        url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&auto=format&fit=crop&q=60',
        sortOrder: 0
      }
    ]
  },
  {
    id: 'prod-5',
    name: 'جهاز قياس ضغط الدم ديجيتال أومرون (Omron Blood Pressure)',
    description: 'جهاز رقمي دقيق جداً لقياس ضغط الدم ونبضات القلب مع شاشة واضحة',
    price: 650.0,
    stock: 8,
    category: 'مستلزمات طبية',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    images: [
      {
        id: 'img-5',
        productId: 'prod-5',
        url: 'https://images.unsplash.com/photo-1631815589968-fdb09a223b1e?w=500&auto=format&fit=crop&q=60',
        sortOrder: 0
      }
    ]
  },
  {
    id: 'prod-6',
    name: 'جهاز قياس نسبة السكر في الدم أكيوتشيك (Accu-Chek)',
    description: 'جهاز فحص السكر السريع مع قلم الوخز وعلبة شرائط اختبار مرفقة',
    price: 320.0,
    stock: 14,
    category: 'مستلزمات طبية',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    images: [
      {
        id: 'img-6',
        productId: 'prod-6',
        url: 'https://images.unsplash.com/photo-1615486511484-92e172cc4fe0?w=500&auto=format&fit=crop&q=60',
        sortOrder: 0
      }
    ]
  }
]

const DEFAULT_SETTINGS: PharmacySettings = {
  id: 'settings-1',
  pharmacyName: 'صيدلية الشفاء أونلاين',
  whatsappNumber: '01116664299',
  whatsappNumbers: JSON.stringify([
    { label: 'الفرع الرئيسي', number: '01116664299' },
    { label: 'خدمة التوصيل السريع', number: '+201012345678' }
  ]),
  currency: 'ج.م',
  adminUsername: 'admin',
  adminPassword: 'admin123'
}

function initDatabase(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'))
      return {
        products: data.products || DEFAULT_PRODUCTS,
        orders: data.orders || [],
        settings: data.settings || DEFAULT_SETTINGS
      }
    } catch (e) {
      console.error('Error reading db.json, creating new:', e)
    }
  }

  const initialDb: DatabaseSchema = {
    products: DEFAULT_PRODUCTS,
    orders: [],
    settings: DEFAULT_SETTINGS
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8')
  return initialDb
}

let db = initDatabase()

function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to write db.json:', err)
  }
}

async function startServer() {
  const app = express()
  const PORT = 3000

  app.use(express.json({ limit: '20mb' }))
  app.use(express.urlencoded({ extended: true, limit: '20mb' }))

  // Static uploads if any
  const publicDir = path.join(process.cwd(), 'public')
  app.use('/public', express.static(publicDir))

  // ================= API ROUTES =================

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // Settings: GET
  app.get('/api/settings', (req, res) => {
    res.json(db.settings)
  })

  // Settings: PUT
  app.put('/api/settings', (req, res) => {
    const {
      pharmacyName,
      whatsappNumber,
      whatsappNumbers,
      currency,
      adminUsername,
      adminPassword
    } = req.body

    db.settings = {
      ...db.settings,
      pharmacyName: pharmacyName || db.settings.pharmacyName,
      whatsappNumber: whatsappNumber !== undefined ? whatsappNumber : db.settings.whatsappNumber,
      whatsappNumbers: whatsappNumbers !== undefined ? whatsappNumbers : db.settings.whatsappNumbers,
      currency: currency || db.settings.currency,
      adminUsername: adminUsername || db.settings.adminUsername,
      adminPassword: adminPassword || db.settings.adminPassword
    }

    saveDatabase()
    res.json(db.settings)
  })

  // Auth: Login
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body
    if (
      username === db.settings.adminUsername &&
      password === db.settings.adminPassword
    ) {
      return res.json({
        success: true,
        username: db.settings.adminUsername,
        token: `auth_token_${Date.now()}`
      })
    }
    return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' })
  })

  // Products: GET list
  app.get('/api/products', (req, res) => {
    const { active, category, search } = req.query
    let result = [...db.products]

    if (active === 'true') {
      result = result.filter((p) => p.isActive)
    }

    if (category && category !== 'الكل' && category !== 'all') {
      result = result.filter((p) => p.category === category)
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      )
    }

    res.json(result)
  })

  // Products: GET single
  app.get('/api/products/:id', (req, res) => {
    const product = db.products.find((p) => p.id === req.params.id)
    if (!product) {
      return res.status(404).json({ error: 'المنتج غير موجود' })
    }
    res.json(product)
  })

  // Products: POST create
  app.post('/api/products', (req, res) => {
    const { name, description, price, stock, category, images } = req.body
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'اسم المنتج والسعر مطلوبان' })
    }

    const productId = `prod-${Date.now()}`
    const imageList: ProductImage[] = Array.isArray(images)
      ? images.map((url: string, idx: number) => ({
          id: `img-${Date.now()}-${idx}`,
          productId,
          url,
          sortOrder: idx
        }))
      : []

    const newProduct: Product = {
      id: productId,
      name,
      description: description || '',
      price: parseFloat(price) || 0,
      stock: parseInt(stock, 10) || 0,
      category: category || 'أخرى',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      images: imageList
    }

    db.products.unshift(newProduct)
    saveDatabase()
    res.status(201).json(newProduct)
  })

  // Products: PUT update
  app.put('/api/products/:id', (req, res) => {
    const idx = db.products.findIndex((p) => p.id === req.params.id)
    if (idx === -1) {
      return res.status(404).json({ error: 'المنتج غير موجود' })
    }

    const current = db.products[idx]
    const { name, description, price, stock, category, isActive, images } = req.body

    let updatedImages = current.images
    if (Array.isArray(images)) {
      updatedImages = images.map((url: string, i: number) => ({
        id: `img-${Date.now()}-${i}`,
        productId: current.id,
        url,
        sortOrder: i
      }))
    }

    db.products[idx] = {
      ...current,
      name: name !== undefined ? name : current.name,
      description: description !== undefined ? description : current.description,
      price: price !== undefined ? parseFloat(price) : current.price,
      stock: stock !== undefined ? parseInt(stock, 10) : current.stock,
      category: category !== undefined ? category : current.category,
      isActive: isActive !== undefined ? Boolean(isActive) : current.isActive,
      images: updatedImages,
      updatedAt: new Date().toISOString()
    }

    saveDatabase()
    res.json(db.products[idx])
  })

  // Products: PATCH stock
  app.patch('/api/products/:id/stock', (req, res) => {
    const idx = db.products.findIndex((p) => p.id === req.params.id)
    if (idx === -1) {
      return res.status(404).json({ error: 'المنتج غير موجود' })
    }

    const { stock } = req.body
    if (stock === undefined || isNaN(parseInt(stock, 10))) {
      return res.status(400).json({ error: 'قيمة المخزون غير صالحة' })
    }

    db.products[idx].stock = Math.max(0, parseInt(stock, 10))
    db.products[idx].updatedAt = new Date().toISOString()
    saveDatabase()
    res.json(db.products[idx])
  })

  // Products: DELETE
  app.delete('/api/products/:id', (req, res) => {
    const idx = db.products.findIndex((p) => p.id === req.params.id)
    if (idx === -1) {
      return res.status(404).json({ error: 'المنتج غير موجود' })
    }

    const deleted = db.products.splice(idx, 1)[0]
    saveDatabase()
    res.json(deleted)
  })

  // Orders: GET list
  app.get('/api/orders', (req, res) => {
    res.json(db.orders)
  })

  // Orders: POST create
  app.post('/api/orders', (req, res) => {
    const { customerName, customerPhone, items, notes } = req.body

    if (!customerName || !customerPhone || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'بيانات الطلب غير مكتملة' })
    }

    const orderId = `order-${Date.now()}`
    let calculatedTotal = 0

    const orderItems: OrderItem[] = items.map((item: any, idx: number) => {
      const unitPrice = parseFloat(item.unitPrice) || 0
      const quantity = parseInt(item.quantity, 10) || 1
      const totalPrice = unitPrice * quantity
      calculatedTotal += totalPrice

      // Reduce product stock
      const prod = db.products.find((p) => p.id === item.productId)
      if (prod) {
        prod.stock = Math.max(0, prod.stock - quantity)
        prod.updatedAt = new Date().toISOString()
      }

      return {
        id: `item-${Date.now()}-${idx}`,
        orderId,
        productId: item.productId,
        productName: item.productName || prod?.name || 'صنف غير محدد',
        quantity,
        unitPrice,
        totalPrice,
        productImage: prod?.images[0]?.url
      }
    })

    const newOrder: Order = {
      id: orderId,
      customerName,
      customerPhone,
      status: 'pending',
      totalAmount: calculatedTotal,
      notes: notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: orderItems
    }

    db.orders.unshift(newOrder)
    saveDatabase()
    res.status(201).json(newOrder)
  })

  // Orders: PATCH status
  app.patch('/api/orders/:id/status', (req, res) => {
    const idx = db.orders.findIndex((o) => o.id === req.params.id)
    if (idx === -1) {
      return res.status(404).json({ error: 'الطلب غير موجود' })
    }

    const { status } = req.body
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'حالة الطلب غير صالحة' })
    }

    db.orders[idx].status = status
    db.orders[idx].updatedAt = new Date().toISOString()
    saveDatabase()
    res.json(db.orders[idx])
  })

  // Reports: GET
  app.get('/api/reports', (req, res) => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

    const validOrders = db.orders.filter((o) => o.status !== 'cancelled')
    const totalRevenue = validOrders.reduce((sum, o) => sum + o.totalAmount, 0)
    const deliveredRevenue = db.orders
      .filter((o) => o.status === 'delivered')
      .reduce((sum, o) => sum + o.totalAmount, 0)

    const todayOrdersList = validOrders.filter(
      (o) => new Date(o.createdAt).getTime() >= startOfToday
    )
    const weekOrdersList = validOrders.filter(
      (o) => new Date(o.createdAt).getTime() >= startOfWeek
    )
    const monthOrdersList = validOrders.filter(
      (o) => new Date(o.createdAt).getTime() >= startOfMonth
    )

    // Top selling products aggregation
    const productSalesMap: Record<string, { totalSold: number; totalRevenue: number; name: string; category: string }> = {}
    validOrders.forEach((o) => {
      o.items.forEach((item) => {
        if (!productSalesMap[item.productId]) {
          productSalesMap[item.productId] = {
            totalSold: 0,
            totalRevenue: 0,
            name: item.productName,
            category: db.products.find((p) => p.id === item.productId)?.category || 'أخرى'
          }
        }
        productSalesMap[item.productId].totalSold += item.quantity
        productSalesMap[item.productId].totalRevenue += item.totalPrice
      })
    })

    const topSellingProducts = Object.entries(productSalesMap)
      .map(([productId, val]) => ({
        productId,
        name: val.name,
        category: val.category,
        totalSold: val.totalSold,
        totalRevenue: val.totalRevenue,
        image: db.products.find((p) => p.id === productId)?.images[0]?.url
      }))
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 5)

    // Category breakdown
    const categoryMap: Record<string, { count: number; totalStock: number; value: number }> = {}
    db.products.forEach((p) => {
      if (!categoryMap[p.category]) {
        categoryMap[p.category] = { count: 0, totalStock: 0, value: 0 }
      }
      categoryMap[p.category].count += 1
      categoryMap[p.category].totalStock += p.stock
      categoryMap[p.category].value += p.stock * p.price
    })

    const categoryBreakdown = Object.entries(categoryMap).map(([category, val]) => ({
      category,
      products: val.count,
      totalStock: val.totalStock,
      value: val.value
    }))

    // Low stock products
    const lowStockProducts = db.products
      .filter((p) => p.stock <= 5 && p.isActive)
      .map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        stock: p.stock,
        price: p.price,
        image: p.images[0]?.url
      }))

    // Orders by status
    const statusCounts: Record<string, number> = {
      pending: 0,
      confirmed: 0,
      preparing: 0,
      ready: 0,
      delivered: 0,
      cancelled: 0
    }
    db.orders.forEach((o) => {
      if (statusCounts[o.status] !== undefined) {
        statusCounts[o.status] += 1
      }
    })

    const ordersByStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count
    }))

    const totalStockUnits = db.products.reduce((sum, p) => sum + p.stock, 0)
    const totalInventoryValue = db.products.reduce((sum, p) => sum + p.stock * p.price, 0)

    res.json({
      summary: {
        totalRevenue,
        deliveredRevenue,
        totalOrders: db.orders.length,
        averageOrderValue: validOrders.length > 0 ? totalRevenue / validOrders.length : 0,
        totalProducts: db.products.length,
        activeProducts: db.products.filter((p) => p.isActive).length,
        totalStockUnits,
        totalInventoryValue,
        outOfStockCount: db.products.filter((p) => p.stock === 0 && p.isActive).length,
        lowStockCount: lowStockProducts.length
      },
      sales: {
        todayRevenue: todayOrdersList.reduce((s, o) => s + o.totalAmount, 0),
        todayOrders: todayOrdersList.length,
        thisWeekRevenue: weekOrdersList.reduce((s, o) => s + o.totalAmount, 0),
        thisWeekOrders: weekOrdersList.length,
        thisMonthRevenue: monthOrdersList.reduce((s, o) => s + o.totalAmount, 0),
        thisMonthOrders: monthOrdersList.length,
        topSellingProducts
      },
      inventory: {
        categoryBreakdown,
        lowStockProducts
      },
      orders: {
        ordersByStatus,
        recentOrders: db.orders.slice(0, 10).map((o) => ({
          id: o.id,
          customerName: o.customerName,
          customerPhone: o.customerPhone,
          totalAmount: o.totalAmount,
          status: o.status,
          itemsCount: o.items.reduce((s, i) => s + i.quantity, 0),
          createdAt: o.createdAt
        }))
      }
    })
  })

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    })
    app.use(vite.middlewares)
  } else {
    const distPath = path.join(process.cwd(), 'dist')
    app.use(express.static(distPath))
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'))
    })
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pharmacy server running at http://0.0.0.0:${PORT}`)
  })
}

startServer()
