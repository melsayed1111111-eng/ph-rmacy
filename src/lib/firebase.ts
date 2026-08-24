import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  enableIndexedDbPersistence
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getDatabase, ref, onValue, set as setRtdb } from 'firebase/database'
import type { Product, Order, PharmacySettings } from './types'

export const firebaseConfig = {
  apiKey: "AIzaSyCHfzyC8OkXUdD8YwaetMFVqOCO1m0Vfe8",
  authDomain: "pharmacy-89268.firebaseapp.com",
  databaseURL: "https://pharmacy-89268-default-rtdb.firebaseio.com",
  projectId: "pharmacy-89268",
  storageBucket: "pharmacy-89268.firebasestorage.app",
  messagingSenderId: "294444860642",
  appId: "1:294444860642:web:3e1f82ab3ddd4bdba34abb",
  measurementId: "G-DTKTNW0S3D"
}

// Initialize Firebase App singleton
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
export const db = getFirestore(app)
export const auth = getAuth(app)
export const rtdb = getDatabase(app)

// Enable offline caching if supported
if (typeof window !== 'undefined') {
  try {
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Firestore persistence failed: Multiple tabs open')
      } else if (err.code === 'unimplemented') {
        console.warn('Firestore persistence is not supported by this browser')
      }
    })
  } catch {
    // Ignore persistence errors
  }
}

// ================= Realtime Subscriptions =================

/**
 * Subscribe to products with realtime updates
 */
export function subscribeToProducts(
  onUpdate: (products: Product[]) => void,
  activeOnly = false
): () => void {
  try {
    const productsColl = collection(db, 'products')
    const q = activeOnly
      ? query(productsColl, where('isActive', '==', true))
      : query(productsColl)

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: Product[] = []
        snapshot.forEach((docSnap) => {
          items.push({ ...(docSnap.data() as Product), id: docSnap.id })
        })
        
        // Sort by updatedAt or createdAt descending
        items.sort((a, b) => {
          const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime()
          const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime()
          return timeB - timeA
        })

        onUpdate(items)
      },
      (error) => {
        console.warn('Firestore products onSnapshot warning, fetching from API fallback:', error)
        // Fallback to API
        fetch(`/api/products${activeOnly ? '?active=true' : ''}`)
          .then((res) => res.json())
          .then((data) => onUpdate(data))
          .catch((err) => console.error('API fallback error:', err))
      }
    )

    return unsubscribe
  } catch (err) {
    console.error('Error creating Firestore listener:', err)
    fetch(`/api/products${activeOnly ? '?active=true' : ''}`)
      .then((res) => res.json())
      .then((data) => onUpdate(data))
      .catch((e) => console.error(e))
    return () => {}
  }
}

/**
 * Subscribe to orders with realtime updates
 */
export function subscribeToOrders(onUpdate: (orders: Order[]) => void): () => void {
  try {
    const ordersColl = collection(db, 'orders')
    const q = query(ordersColl)

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: Order[] = []
        snapshot.forEach((docSnap) => {
          items.push({ ...(docSnap.data() as Order), id: docSnap.id })
        })

        // Sort orders descending by createdAt
        items.sort((a, b) => {
          const timeA = new Date(a.createdAt || 0).getTime()
          const timeB = new Date(b.createdAt || 0).getTime()
          return timeB - timeA
        })

        onUpdate(items)
      },
      (error) => {
        console.warn('Firestore orders onSnapshot warning, fallback to API:', error)
        fetch('/api/orders')
          .then((res) => res.json())
          .then((data) => onUpdate(data))
          .catch((err) => console.error('API orders fallback error:', err))
      }
    )

    return unsubscribe
  } catch (err) {
    console.error('Error creating Firestore orders listener:', err)
    fetch('/api/orders')
      .then((res) => res.json())
      .then((data) => onUpdate(data))
      .catch((e) => console.error(e))
    return () => {}
  }
}

/**
 * Subscribe to store settings in realtime
 */
export function subscribeToSettings(onUpdate: (settings: PharmacySettings) => void): () => void {
  try {
    const settingsDoc = doc(db, 'settings', 'global')
    const unsubscribe = onSnapshot(
      settingsDoc,
      (docSnap) => {
        if (docSnap.exists()) {
          onUpdate(docSnap.data() as PharmacySettings)
        } else {
          // Fallback to API if settings doc doesn't exist yet in Firestore
          fetch('/api/settings')
            .then((res) => res.json())
            .then((data) => {
              if (data) onUpdate(data)
            })
            .catch(() => {})
        }
      },
      (error) => {
        console.warn('Firestore settings onSnapshot warning, fallback to API:', error)
        fetch('/api/settings')
          .then((res) => res.json())
          .then((data) => {
            if (data) onUpdate(data)
          })
          .catch(() => {})
      }
    )

    return unsubscribe
  } catch (err) {
    console.error('Error subscribing to settings:', err)
    return () => {}
  }
}

// ================= Firestore CRUD Operations =================

/**
 * Add or update a product in Firestore & API
 */
export async function saveProductToFirebase(product: Product): Promise<void> {
  try {
    const docRef = doc(db, 'products', product.id)
    await setDoc(docRef, product, { merge: true })
  } catch (err) {
    console.warn('Firestore write failed, saving to local API:', err)
  }

  // Also sync to local backend API for redundancy
  try {
    await fetch(`/api/products/${product.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    })
  } catch {
    // Ignore local API error
  }
}

/**
 * Delete a product from Firestore & API
 */
export async function deleteProductFromFirebase(productId: string): Promise<void> {
  try {
    const docRef = doc(db, 'products', productId)
    await deleteDoc(docRef)
  } catch (err) {
    console.warn('Firestore delete failed:', err)
  }

  try {
    await fetch(`/api/products/${productId}`, { method: 'DELETE' })
  } catch {
    // Ignore
  }
}

/**
 * Update stock count in Firestore & API
 */
export async function updateProductStockInFirebase(productId: string, newStock: number): Promise<void> {
  try {
    const docRef = doc(db, 'products', productId)
    await updateDoc(docRef, {
      stock: newStock,
      updatedAt: new Date().toISOString()
    })
  } catch (err) {
    console.warn('Firestore stock update failed:', err)
  }

  try {
    await fetch(`/api/products/${productId}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: newStock })
    })
  } catch {
    // Ignore
  }
}

/**
 * Create a new order in Firestore & update stock
 */
export async function createOrderInFirebase(order: Order): Promise<void> {
  try {
    const docRef = doc(db, 'orders', order.id)
    await setDoc(docRef, order)

    // Deduct stock for ordered items
    for (const item of order.items) {
      try {
        const prodRef = doc(db, 'products', item.productId)
        const prodSnap = await getDoc(prodRef)
        if (prodSnap.exists()) {
          const currentStock = prodSnap.data().stock || 0
          const updatedStock = Math.max(0, currentStock - item.quantity)
          await updateDoc(prodRef, {
            stock: updatedStock,
            updatedAt: new Date().toISOString()
          })
        }
      } catch (stockErr) {
        console.warn('Error adjusting product stock in Firestore:', stockErr)
      }
    }
  } catch (err) {
    console.warn('Firestore order create failed, falling back to API:', err)
  }

  // Redundancy in API
  try {
    await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    })
  } catch {
    // Ignore
  }
}

/**
 * Update order status
 */
export async function updateOrderStatusInFirebase(orderId: string, status: Order['status']): Promise<void> {
  try {
    const docRef = doc(db, 'orders', orderId)
    await updateDoc(docRef, {
      status,
      updatedAt: new Date().toISOString()
    })
  } catch (err) {
    console.warn('Firestore order status update failed:', err)
  }

  try {
    await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
  } catch {
    // Ignore
  }
}

/**
 * Delete order
 */
export async function deleteOrderFromFirebase(orderId: string): Promise<void> {
  try {
    const docRef = doc(db, 'orders', orderId)
    await deleteDoc(docRef)
  } catch (err) {
    console.warn('Firestore order delete failed:', err)
  }

  try {
    await fetch(`/api/orders/${orderId}`, { method: 'DELETE' })
  } catch {
    // Ignore
  }
}

/**
 * Save pharmacy settings in Firestore
 */
export async function saveSettingsToFirebase(settings: PharmacySettings): Promise<void> {
  try {
    const docRef = doc(db, 'settings', 'global')
    await setDoc(docRef, settings, { merge: true })
  } catch (err) {
    console.warn('Firestore settings update failed:', err)
  }

  try {
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    })
  } catch {
    // Ignore
  }
}

/**
 * Seed initial sample products to Firestore if empty
 */
export async function seedFirebaseIfEmpty(initialProducts: Product[], initialSettings: PharmacySettings): Promise<void> {
  try {
    const snap = await getDocs(collection(db, 'products'))
    if (snap.empty) {
      console.log('Seeding initial products to Firebase Firestore...')
      for (const prod of initialProducts) {
        await setDoc(doc(db, 'products', prod.id), prod)
      }
      await setDoc(doc(db, 'settings', 'global'), initialSettings)
      console.log('Firebase Firestore seeding complete!')
    }
  } catch (err) {
    console.warn('Could not seed Firestore (might be offline or initializing):', err)
  }
}
