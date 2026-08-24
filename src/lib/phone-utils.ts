/**
 * Phone Number Normalization and WhatsApp Invoice Utilities
 */

// Convert Eastern Arabic / Persian numerals to Latin numerals
export function convertArabicNumerals(str: string): string {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
  const persianNumerals = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
  
  let result = str
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(arabicNumerals[i], 'g'), String(i))
    result = result.replace(new RegExp(persianNumerals[i], 'g'), String(i))
  }
  return result
}

/**
 * Normalizes any phone number into standard WhatsApp international format (digits only, no + or 00).
 * Handles Egyptian numbers (01xxxxxxxxx -> 201xxxxxxxxx), Saudi numbers (05xxxxxxxx -> 9665xxxxxxxx),
 * international numbers with +, 00, or raw country codes.
 */
export function normalizeWhatsAppNumber(phone: string): string {
  if (!phone) return ''
  
  // 1. Convert any Arabic numerals
  let cleaned = convertArabicNumerals(phone.trim())
  
  // 2. Remove all non-digit characters except leading +
  cleaned = cleaned.replace(/[\s\-\(\)\.\,\/]/g, '')
  
  // 3. Remove leading '+' or '00'
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1)
  } else if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2)
  }
  
  // 4. Remove any remaining non-digits
  cleaned = cleaned.replace(/[^0-9]/g, '')
  
  if (!cleaned) return ''

  // 5. Check Egyptian local formats:
  // - 010xxxxxxxx, 011xxxxxxxx, 012xxxxxxxx, 015xxxxxxxx (11 digits starting with 01)
  if (/^01[0125][0-9]{8}$/.test(cleaned)) {
    return '20' + cleaned.substring(1)
  }
  // - 10xxxxxxxx, 11xxxxxxxx, 12xxxxxxxx, 15xxxxxxxx (10 digits starting with 1)
  if (/^1[0125][0-9]{8}$/.test(cleaned)) {
    return '20' + cleaned
  }
  // - 2010xxxxxxxx, 2011xxxxxxxx, 2012xxxxxxxx, 2015xxxxxxxx (12 digits with Egypt code)
  if (/^201[0125][0-9]{8}$/.test(cleaned)) {
    return cleaned
  }

  // 6. Check Saudi local formats:
  // - 05xxxxxxxx (10 digits starting with 05)
  if (/^05[0-9]{8}$/.test(cleaned)) {
    return '966' + cleaned.substring(1)
  }
  // - 5xxxxxxxx (9 digits starting with 5)
  if (/^5[0-9]{8}$/.test(cleaned)) {
    return '966' + cleaned
  }
  // - 9665xxxxxxxx (12 digits with Saudi code)
  if (/^9665[0-9]{8}$/.test(cleaned)) {
    return cleaned
  }

  // 7. Generic local format handling (e.g. starts with single leading 0 followed by 8-10 digits)
  // If it still starts with a single '0' and has not matched specific country rules:
  if (cleaned.startsWith('0') && cleaned.length >= 9 && cleaned.length <= 11) {
    // Default to Egyptian prefix 20 if length is 11, otherwise strip leading 0
    if (cleaned.length === 11) {
      return '20' + cleaned.substring(1)
    }
    cleaned = cleaned.substring(1)
  }

  return cleaned
}

/**
 * Validates whether a phone number is sufficiently valid for WhatsApp messaging
 */
export function isValidPhoneNumber(phone: string): boolean {
  const normalized = normalizeWhatsAppNumber(phone)
  // WhatsApp valid numbers are typically between 8 and 15 digits
  return normalized.length >= 8 && normalized.length <= 16
}

export interface InvoiceItem {
  productName: string
  quantity: number
  unitPrice: number
  totalPrice?: number
}

export interface InvoiceData {
  orderId?: string
  pharmacyName: string
  customerName: string
  customerPhone: string
  customerAddress?: string
  governorate?: string
  shippingCost?: number
  subtotal?: number
  notes?: string
  items: InvoiceItem[]
  totalAmount: number
  currency: string
  date?: Date | string
}

/**
 * Builds a structured, beautiful WhatsApp invoice message
 */
export function generateWhatsAppInvoiceMessage(data: InvoiceData): string {
  const dateObj = data.date ? new Date(data.date) : new Date()
  const formattedDate = dateObj.toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  const formattedTime = dateObj.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit'
  })

  let msg = `🏥 *${data.pharmacyName}*\n`
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`
  msg += `🧾 *فاتورة طلب شراء جديد*\n`
  if (data.orderId) {
    msg += `🔢 *رقم الطلب:* #${data.orderId.slice(-6).toUpperCase()}\n`
  }
  msg += `📅 *التاريخ:* ${formattedDate} (${formattedTime})\n`
  msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`

  msg += `👤 *بيانات العميل والتوصيل:*\n`
  msg += `• *الاسم:* ${data.customerName}\n`
  msg += `• *الهاتف:* ${data.customerPhone}\n`
  if (data.governorate) {
    msg += `• *المحافظة:* ${data.governorate}\n`
  }
  if (data.customerAddress && data.customerAddress.trim()) {
    msg += `• *العنوان بالتفصيل:* ${data.customerAddress.trim()}\n`
  }
  if (data.notes && data.notes.trim()) {
    msg += `• *ملاحظات إضافية:* ${data.notes.trim()}\n`
  }
  msg += `\n━━━━━━━━━━━━━━━━━━━━━\n`
  msg += `📦 *الأصناف والمنتجات:*\n`

  data.items.forEach((item, index) => {
    const itemTotal = item.totalPrice ?? (item.unitPrice * item.quantity)
    msg += `${index + 1}️⃣ *${item.productName}*\n`
    msg += `   ↳ ${item.quantity} × ${item.unitPrice.toFixed(2)} = *${itemTotal.toFixed(2)} ${data.currency}*\n`
  })

  msg += `━━━━━━━━━━━━━━━━━━━━━\n`
  msg += `💵 *تفاصيل الحساب والفاتورة:*\n`
  if (typeof data.subtotal === 'number') {
    msg += `• *إجمالي المنتجات:* ${data.subtotal.toFixed(2)} ${data.currency}\n`
  }
  if (typeof data.shippingCost === 'number') {
    if (data.shippingCost === 0 && data.governorate) {
      msg += `• *تكلفة الشحن (${data.governorate}):* 🎁 مجاناً\n`
    } else {
      msg += `• *تكلفة الشحن (${data.governorate || 'التوصيل'}):* ${data.shippingCost.toFixed(2)} ${data.currency}\n`
    }
  }
  msg += `💰 *الإجمالي النهائي المطلوب: ${data.totalAmount.toFixed(2)} ${data.currency}*\n`
  msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`
  msg += `✨ _شكراً لتعاملكم مع ${data.pharmacyName}_\n`
  msg += `_تم إنشاء الفاتورة وإرسالها عبر النظام الذكي_`

  return msg
}

/**
 * Builds the direct WhatsApp Web and Mobile URL for an invoice
 */
export function buildWhatsAppUrl(phoneNumber: string, message: string): string {
  const cleanNumber = normalizeWhatsAppNumber(phoneNumber)
  const encodedText = encodeURIComponent(message)
  return `https://wa.me/${cleanNumber}?text=${encodedText}`
}

/**
 * Safely opens WhatsApp in a new tab or app
 */
export function openWhatsApp(phoneNumber: string, message: string): boolean {
  const url = buildWhatsAppUrl(phoneNumber, message)
  try {
    const link = document.createElement('a')
    link.href = url
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    return true
  } catch (err) {
    console.error('Failed to open WhatsApp window:', err)
    window.location.href = url
    return false
  }
}
