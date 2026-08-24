export interface GovernorateInfo {
  id: string
  name: string
  defaultCost: number
}

export const EGYPTIAN_GOVERNORATES: GovernorateInfo[] = [
  { id: 'cairo', name: 'القاهرة', defaultCost: 30 },
  { id: 'giza', name: 'الجيزة', defaultCost: 30 },
  { id: 'alexandria', name: 'الإسكندرية', defaultCost: 40 },
  { id: 'qalyubia', name: 'القليوبية', defaultCost: 35 },
  { id: 'monufia', name: 'المنوفية', defaultCost: 40 },
  { id: 'gharbia', name: 'الغربية', defaultCost: 40 },
  { id: 'sharqia', name: 'الشرقية', defaultCost: 40 },
  { id: 'dakahlia', name: 'الدقهلية', defaultCost: 40 },
  { id: 'beheira', name: 'البحيرة', defaultCost: 40 },
  { id: 'kafr_el_sheikh', name: 'كفر الشيخ', defaultCost: 45 },
  { id: 'damietta', name: 'دمياط', defaultCost: 45 },
  { id: 'port_said', name: 'بورسعيد', defaultCost: 45 },
  { id: 'ismailia', name: 'الإسماعيلية', defaultCost: 45 },
  { id: 'suez', name: 'السويس', defaultCost: 45 },
  { id: 'fayoum', name: 'الفيوم', defaultCost: 45 },
  { id: 'beni_suef', name: 'بني سويف', defaultCost: 45 },
  { id: 'minya', name: 'المنيا', defaultCost: 50 },
  { id: 'asyut', name: 'أسيوط', defaultCost: 55 },
  { id: 'sohag', name: 'سوهاج', defaultCost: 60 },
  { id: 'qena', name: 'قنا', defaultCost: 60 },
  { id: 'luxor', name: 'الأقصر', defaultCost: 65 },
  { id: 'aswan', name: 'أسوان', defaultCost: 70 },
  { id: 'red_sea', name: 'البحر الأحمر', defaultCost: 70 },
  { id: 'matrouh', name: 'مطروح', defaultCost: 65 },
  { id: 'new_valley', name: 'الوادي الجديد', defaultCost: 80 },
  { id: 'north_sinai', name: 'شمال سيناء', defaultCost: 75 },
  { id: 'south_sinai', name: 'جنوب سيناء', defaultCost: 75 }
]

/**
 * Returns default shipping rates map for all governorates
 */
export function getDefaultShippingRates(): Record<string, number> {
  const rates: Record<string, number> = {}
  EGYPTIAN_GOVERNORATES.forEach((gov) => {
    rates[gov.name] = gov.defaultCost
  })
  return rates
}

/**
 * Parses shipping rates JSON or returns default Egyptian rates
 */
export function parseShippingRates(rawJson?: string): Record<string, number> {
  const defaultRates = getDefaultShippingRates()
  if (!rawJson) return defaultRates

  try {
    const parsed = JSON.parse(rawJson)
    if (typeof parsed === 'object' && parsed !== null) {
      // Merge with defaults so all governorates always exist
      return { ...defaultRates, ...parsed }
    }
  } catch (err) {
    console.error('Error parsing shipping rates JSON:', err)
  }

  return defaultRates
}

/**
 * Calculates shipping cost for a given governorate and order subtotal
 */
export function calculateShippingFee(
  governorate: string,
  subtotal: number,
  shippingRates: Record<string, number>,
  freeShippingThreshold?: number,
  defaultShippingCost = 35
): { cost: number; isFree: boolean; originalCost: number } {
  if (!governorate) {
    return { cost: 0, isFree: false, originalCost: 0 }
  }

  const configuredCost =
    typeof shippingRates[governorate] === 'number'
      ? shippingRates[governorate]
      : defaultShippingCost

  if (
    freeShippingThreshold &&
    freeShippingThreshold > 0 &&
    subtotal >= freeShippingThreshold
  ) {
    return { cost: 0, isFree: true, originalCost: configuredCost }
  }

  return { cost: configuredCost, isFree: false, originalCost: configuredCost }
}
