export interface GovernorateInfo {
  id: string
  name: string
  defaultCost: number
}

export interface ShippingAreaItem {
  id: string
  name: string
  cost: number
  isCustom?: boolean
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
 * Returns default shipping areas as ShippingAreaItem list
 */
export function getDefaultShippingAreas(): ShippingAreaItem[] {
  return EGYPTIAN_GOVERNORATES.map((g) => ({
    id: g.id,
    name: g.name,
    cost: g.defaultCost,
    isCustom: false
  }))
}

/**
 * Parses shipping rates JSON or returns default Egyptian rates as an Area List
 */
export function getShippingAreasList(rawJson?: string): ShippingAreaItem[] {
  if (!rawJson) return getDefaultShippingAreas()

  try {
    const parsed = JSON.parse(rawJson)
    // 1. If stored as an array of objects [{ id, name, cost }]
    if (Array.isArray(parsed)) {
      return parsed.map((item, idx) => ({
        id: item.id || `area-${idx}-${Date.now()}`,
        name: String(item.name || '').trim(),
        cost: typeof item.cost === 'number' ? item.cost : parseFloat(item.cost) || 0,
        isCustom: item.isCustom ?? true
      })).filter((item) => item.name.length > 0)
    }

    // 2. If stored as an object Record<string, number>
    if (typeof parsed === 'object' && parsed !== null) {
      const entries = Object.entries(parsed)
      if (entries.length > 0) {
        return entries.map(([name, cost], idx) => {
          const govMatch = EGYPTIAN_GOVERNORATES.find((g) => g.name === name)
          return {
            id: govMatch ? govMatch.id : `area-custom-${idx}`,
            name,
            cost: typeof cost === 'number' ? cost : parseFloat(String(cost)) || 0,
            isCustom: !govMatch
          }
        })
      }
    }
  } catch (err) {
    console.error('Error parsing shipping areas JSON:', err)
  }

  return getDefaultShippingAreas()
}

/**
 * Parses shipping rates JSON into a Record<string, number> map
 */
export function parseShippingRates(rawJson?: string): Record<string, number> {
  const areas = getShippingAreasList(rawJson)
  const map: Record<string, number> = {}
  areas.forEach((area) => {
    map[area.name] = area.cost
  })
  return map
}

/**
 * Calculates shipping cost for a given area/governorate and order subtotal
 */
export function calculateShippingFee(
  areaOrGovernorate: string,
  subtotal: number,
  shippingRates: Record<string, number>,
  freeShippingThreshold?: number,
  defaultShippingCost = 35
): { cost: number; isFree: boolean; originalCost: number } {
  if (!areaOrGovernorate) {
    return { cost: 0, isFree: false, originalCost: 0 }
  }

  const configuredCost =
    typeof shippingRates[areaOrGovernorate] === 'number'
      ? shippingRates[areaOrGovernorate]
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
