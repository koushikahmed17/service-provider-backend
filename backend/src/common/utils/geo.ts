/**
 * Calculate the distance between two points using the Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Generate Prisma raw query for finding professionals within a radius
 * @param lat Latitude of center point
 * @param lng Longitude of center point
 * @param radiusKm Radius in kilometers
 * @returns Prisma raw query string
 */
export function getProfessionalsWithinRadiusQuery(
  lat: number,
  lng: number,
  radiusKm: number
): string {
  return `
    SELECT 
      pp.*,
      u."fullName",
      u."email",
      u."phone",
      u."avatarUrl",
      (
        6371 * acos(
          cos(radians(${lat})) 
          * cos(radians(pp."locationLat")) 
          * cos(radians(pp."locationLng") - radians(${lng})) 
          + sin(radians(${lat})) 
          * sin(radians(pp."locationLat"))
        )
      ) AS distance
    FROM "professional_profiles" pp
    JOIN "users" u ON u.id = pp."userId"
    WHERE 
      pp."locationLat" IS NOT NULL 
      AND pp."locationLng" IS NOT NULL
      AND (
        6371 * acos(
          cos(radians(${lat})) 
          * cos(radians(pp."locationLat")) 
          * cos(radians(pp."locationLng") - radians(${lng})) 
          + sin(radians(${lat})) 
          * sin(radians(pp."locationLat"))
        )
      ) <= ${radiusKm}
    ORDER BY distance
  `;
}

/**
 * Generate Prisma raw query for finding services within a radius with filters
 * @param lat Latitude of center point
 * @param lng Longitude of center point
 * @param radiusKm Radius in kilometers
 * @param minPrice Minimum price filter
 * @param maxPrice Maximum price filter
 * @param rateType Rate type filter (HOURLY/FIXED)
 * @param categoryIds Array of category IDs
 * @returns Prisma raw query string
 */
export function getServicesWithinRadiusQuery(
  lat: number,
  lng: number,
  radiusKm: number,
  minPrice?: number,
  maxPrice?: number,
  rateType?: string,
  categoryIds?: string[]
): string {
  let whereConditions = [
    `pp."locationLat" IS NOT NULL`,
    `pp."locationLng" IS NOT NULL`,
    `ps."isActive" = true`,
    `pp."isVerified" = true`,
  ];

  // Add radius condition
  whereConditions.push(`
    (
      6371 * acos(
        cos(radians(${lat})) 
        * cos(radians(pp."locationLat")) 
        * cos(radians(pp."locationLng") - radians(${lng})) 
        + sin(radians(${lat})) 
        * sin(radians(pp."locationLat"))
      )
    ) <= ${radiusKm}
  `);

  // Add price filters
  if (minPrice !== undefined) {
    whereConditions.push(`
      (
        (ps."rateType" = 'HOURLY' AND ps."hourlyRateBDT" >= ${minPrice}) OR
        (ps."rateType" = 'FIXED' AND ps."fixedPriceBDT" >= ${minPrice})
      )
    `);
  }

  if (maxPrice !== undefined) {
    whereConditions.push(`
      (
        (ps."rateType" = 'HOURLY' AND ps."hourlyRateBDT" <= ${maxPrice}) OR
        (ps."rateType" = 'FIXED' AND ps."fixedPriceBDT" <= ${maxPrice})
      )
    `);
  }

  // Add rate type filter
  if (rateType) {
    whereConditions.push(`ps."rateType" = '${rateType}'`);
  }

  // Add category filter
  if (categoryIds && categoryIds.length > 0) {
    const categoryIdsStr = categoryIds.map((id) => `'${id}'`).join(",");
    whereConditions.push(`ps."categoryId" IN (${categoryIdsStr})`);
  }

  return `
    SELECT 
      ps.*,
      sc.name as "categoryName",
      sc.slug as "categorySlug",
      pp."locationLat",
      pp."locationLng",
      u."fullName",
      u."email",
      u."phone",
      u."avatarUrl",
      (
        6371 * acos(
          cos(radians(${lat})) 
          * cos(radians(pp."locationLat")) 
          * cos(radians(pp."locationLng") - radians(${lng})) 
          + sin(radians(${lat})) 
          * sin(radians(pp."locationLat"))
        )
      ) AS distance
    FROM "professional_services" ps
    JOIN "professional_profiles" pp ON pp.id = ps."professionalId"
    JOIN "users" u ON u.id = pp."userId"
    JOIN "service_categories" sc ON sc.id = ps."categoryId"
    WHERE ${whereConditions.join(" AND ")}
    ORDER BY distance
  `;
}

/**
 * Format currency amount
 * @param amount Amount to format
 * @param currency Currency code (default: BDT)
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  currency: string = "BDT"
): string {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: currency,
  }).format(amount);
}

/**
 * Format phone number for Bangladesh
 * @param phone Phone number string
 * @returns Formatted phone number
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, "");

  // Check if it's a valid Bangladesh mobile number
  if (cleaned.length === 11 && cleaned.startsWith("01")) {
    return `+880${cleaned}`;
  }

  // Check if it already has country code
  if (cleaned.length === 13 && cleaned.startsWith("880")) {
    return `+${cleaned}`;
  }

  return phone; // Return original if format is not recognized
}
