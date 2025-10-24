import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create roles
  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: {
      name: "ADMIN",
      description: "Administrator role with full access",
    },
  });

  const customerRole = await prisma.role.upsert({
    where: { name: "CUSTOMER" },
    update: {},
    create: {
      name: "CUSTOMER",
      description: "Customer role",
    },
  });

  const professionalRole = await prisma.role.upsert({
    where: { name: "PROFESSIONAL" },
    update: {},
    create: {
      name: "PROFESSIONAL",
      description: "Professional service provider role",
    },
  });

  // Create permissions
  const permissions = [
    {
      name: "user.read",
      description: "Read users",
      resource: "user",
      action: "read",
    },
    {
      name: "user.write",
      description: "Write users",
      resource: "user",
      action: "write",
    },
    {
      name: "user.delete",
      description: "Delete users",
      resource: "user",
      action: "delete",
    },
    {
      name: "service.read",
      description: "Read services",
      resource: "service",
      action: "read",
    },
    {
      name: "service.write",
      description: "Write services",
      resource: "service",
      action: "write",
    },
    {
      name: "booking.read",
      description: "Read bookings",
      resource: "booking",
      action: "read",
    },
    {
      name: "booking.write",
      description: "Write bookings",
      resource: "booking",
      action: "write",
    },
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {},
      create: permission,
    });
  }

  // Create service categories
  const categories = [
    // Home Services
    {
      name: "Home Cleaning",
      slug: "home-cleaning",
      description: "Professional home cleaning services",
      icon: "fa-solid fa-broom",
    },
    {
      name: "Deep Cleaning",
      slug: "deep-cleaning",
      description: "Thorough deep cleaning services",
      icon: "fa-solid fa-brush",
    },
    {
      name: "Window Cleaning",
      slug: "window-cleaning",
      description: "Professional window and glass cleaning",
      icon: "fa-solid fa-window-maximize",
    },
    {
      name: "Carpet Cleaning",
      slug: "carpet-cleaning",
      description: "Carpet and upholstery cleaning services",
      icon: "fa-solid fa-couch",
    },

    // Plumbing
    {
      name: "Plumbing",
      slug: "plumbing",
      description: "General plumbing services",
      icon: "fa-solid fa-wrench",
    },
    {
      name: "Pipe Repair",
      slug: "pipe-repair",
      description: "Pipe installation and repair services",
      icon: "fa-solid fa-pipe",
    },
    {
      name: "Drain Cleaning",
      slug: "drain-cleaning",
      description: "Drain unclogging and cleaning",
      icon: "fa-solid fa-toilet",
    },
    {
      name: "Water Heater",
      slug: "water-heater",
      description: "Water heater installation and repair",
      icon: "fa-solid fa-fire-flame-simple",
    },

    // Electrical
    {
      name: "Electrical",
      slug: "electrical",
      description: "General electrical services",
      icon: "fa-solid fa-bolt",
    },
    {
      name: "Wiring",
      slug: "wiring",
      description: "Electrical wiring and installation",
      icon: "fa-solid fa-plug",
    },
    {
      name: "Lighting",
      slug: "lighting",
      description: "Light fixture installation and repair",
      icon: "fa-solid fa-lightbulb",
    },
    {
      name: "Generator",
      slug: "generator",
      description: "Generator installation and maintenance",
      icon: "fa-solid fa-battery-full",
    },

    // HVAC
    {
      name: "Air Conditioning",
      slug: "air-conditioning",
      description: "AC installation, repair, and maintenance",
      icon: "fa-solid fa-snowflake",
    },
    {
      name: "Heating",
      slug: "heating",
      description: "Heating system services",
      icon: "fa-solid fa-thermometer-half",
    },
    {
      name: "Ventilation",
      slug: "ventilation",
      description: "Ventilation and air quality services",
      icon: "fa-solid fa-wind",
    },

    // Maintenance
    {
      name: "Home Maintenance",
      slug: "home-maintenance",
      description: "General home maintenance services",
      icon: "fa-solid fa-hammer",
    },
    {
      name: "Painting",
      slug: "painting",
      description: "Interior and exterior painting services",
      icon: "fa-solid fa-paint-brush",
    },
    {
      name: "Flooring",
      slug: "flooring",
      description: "Floor installation and repair",
      icon: "fa-solid fa-th",
    },
    {
      name: "Roofing",
      slug: "roofing",
      description: "Roof repair and maintenance",
      icon: "fa-solid fa-home",
    },

    // Technology
    {
      name: "IT Support",
      slug: "it-support",
      description: "Computer and IT support services",
      icon: "fa-solid fa-laptop",
    },
    {
      name: "Network Setup",
      slug: "network-setup",
      description: "Internet and network installation",
      icon: "fa-solid fa-wifi",
    },
    {
      name: "Security Systems",
      slug: "security-systems",
      description: "Security camera and alarm installation",
      icon: "fa-solid fa-shield-halved",
    },

    // Garden & Outdoor
    {
      name: "Gardening",
      slug: "gardening",
      description: "Garden maintenance and landscaping",
      icon: "fa-solid fa-seedling",
    },
    {
      name: "Pest Control",
      slug: "pest-control",
      description: "Pest control and extermination",
      icon: "fa-solid fa-bug",
    },
    {
      name: "Pool Maintenance",
      slug: "pool-maintenance",
      description: "Swimming pool cleaning and maintenance",
      icon: "fa-solid fa-swimming-pool",
    },

    // Moving & Storage
    {
      name: "Moving",
      slug: "moving",
      description: "Moving and relocation services",
      icon: "fa-solid fa-truck",
    },
    {
      name: "Storage",
      slug: "storage",
      description: "Storage and warehousing services",
      icon: "fa-solid fa-boxes-stacked",
    },

    // Appliance Repair
    {
      name: "Appliance Repair",
      slug: "appliance-repair",
      description: "Home appliance repair services",
      icon: "fa-solid fa-tools",
    },
    {
      name: "Refrigerator",
      slug: "refrigerator",
      description: "Refrigerator repair and maintenance",
      icon: "fa-solid fa-ice-cream",
    },
    {
      name: "Washing Machine",
      slug: "washing-machine",
      description: "Washing machine repair services",
      icon: "fa-solid fa-soap",
    },

    // Other Services
    {
      name: "Event Planning",
      slug: "event-planning",
      description: "Event planning and coordination",
      icon: "fa-solid fa-calendar",
    },
    {
      name: "Photography",
      slug: "photography",
      description: "Professional photography services",
      icon: "fa-solid fa-camera",
    },
    {
      name: "Tutoring",
      slug: "tutoring",
      description: "Educational tutoring services",
      icon: "fa-solid fa-graduation-cap",
    },
  ];

  for (const category of categories) {
    await prisma.serviceCategory.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }

  // Create some nested categories
  const deepCleaning = await prisma.serviceCategory.findUnique({
    where: { slug: "deep-cleaning" },
  });

  const windowCleaning = await prisma.serviceCategory.findUnique({
    where: { slug: "window-cleaning" },
  });

  const carpetCleaning = await prisma.serviceCategory.findUnique({
    where: { slug: "carpet-cleaning" },
  });

  if (deepCleaning && windowCleaning && carpetCleaning) {
    await prisma.serviceCategory.update({
      where: { id: windowCleaning.id },
      data: { parentId: deepCleaning.id },
    });

    await prisma.serviceCategory.update({
      where: { id: carpetCleaning.id },
      data: { parentId: deepCleaning.id },
    });
  }

  // Create service tags
  const tags = [
    { name: "Emergency", slug: "emergency" },
    { name: "Same Day", slug: "same-day" },
    { name: "Weekend", slug: "weekend" },
    { name: "Commercial", slug: "commercial" },
    { name: "Residential", slug: "residential" },
    { name: "Eco-Friendly", slug: "eco-friendly" },
    { name: "Insured", slug: "insured" },
    { name: "Licensed", slug: "licensed" },
    { name: "24/7", slug: "24-7" },
    { name: "Free Quote", slug: "free-quote" },
  ];

  for (const tag of tags) {
    await prisma.serviceTag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: tag,
    });
  }

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 12);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      password: hashedPassword,
      fullName: "Admin User",
      phone: "+8801712345678",
      isEmailVerified: true,
      isPhoneVerified: true,
    },
  });

  // Assign admin role to admin user
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });

  // Create sample customer
  const customerPassword = await bcrypt.hash("customer123", 12);
  const customer = await prisma.user.upsert({
    where: { email: "customer@example.com" },
    update: {},
    create: {
      email: "customer@example.com",
      password: customerPassword,
      fullName: "John Customer",
      phone: "+8801712345679",
      isEmailVerified: true,
      isPhoneVerified: true,
    },
  });

  // Assign customer role
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: customer.id, roleId: customerRole.id } },
    update: {},
    create: {
      userId: customer.id,
      roleId: customerRole.id,
    },
  });

  // Create sample professional
  const professionalPassword = await bcrypt.hash("professional123", 12);
  const professional = await prisma.user.upsert({
    where: { email: "professional@example.com" },
    update: {},
    create: {
      email: "professional@example.com",
      password: professionalPassword,
      fullName: "Jane Professional",
      phone: "+8801712345680",
      isEmailVerified: true,
      isPhoneVerified: true,
    },
  });

  // Assign professional role
  await prisma.userRole.upsert({
    where: {
      userId_roleId: { userId: professional.id, roleId: professionalRole.id },
    },
    update: {},
    create: {
      userId: professional.id,
      roleId: professionalRole.id,
    },
  });

  // Create professional profile
  const professionalProfile = await prisma.professionalProfile.upsert({
    where: { userId: professional.id },
    update: {},
    create: {
      userId: professional.id,
      skills: ["Plumbing", "Electrical", "Home Repair"],
      categories: ["Plumbing", "Electrical", "Home Maintenance"],
      hourlyRateBDT: 500,
      fixedRates: [
        { service: "Pipe Repair", rate: 2000 },
        { service: "Wiring Installation", rate: 3000 },
      ],
      availability: [
        { day: "Monday", startTime: "09:00", endTime: "17:00" },
        { day: "Tuesday", startTime: "09:00", endTime: "17:00" },
        { day: "Wednesday", startTime: "09:00", endTime: "17:00" },
        { day: "Thursday", startTime: "09:00", endTime: "17:00" },
        { day: "Friday", startTime: "09:00", endTime: "17:00" },
      ],
      bio: "Experienced professional with 5+ years in home repair and maintenance",
      experience: 5,
      isVerified: true,
      locationLat: 23.8103,
      locationLng: 90.4125,
    },
  });

  // Create some professional services
  const plumbingCategory = await prisma.serviceCategory.findUnique({
    where: { slug: "plumbing" },
  });

  const electricalCategory = await prisma.serviceCategory.findUnique({
    where: { slug: "electrical" },
  });

  if (plumbingCategory && electricalCategory) {
    await prisma.professionalService.upsert({
      where: {
        professionalId_categoryId: {
          professionalId: professionalProfile.id,
          categoryId: plumbingCategory.id,
        },
      },
      update: {},
      create: {
        professionalId: professionalProfile.id,
        categoryId: plumbingCategory.id,
        rateType: "HOURLY",
        hourlyRateBDT: 500,
        minHours: 2,
        notes: "Professional plumbing services with warranty",
        isActive: true,
      },
    });

    await prisma.professionalService.upsert({
      where: {
        professionalId_categoryId: {
          professionalId: professionalProfile.id,
          categoryId: electricalCategory.id,
        },
      },
      update: {},
      create: {
        professionalId: professionalProfile.id,
        categoryId: electricalCategory.id,
        rateType: "FIXED",
        fixedPriceBDT: 3000,
        notes: "Complete electrical installation and repair",
        isActive: true,
      },
    });
  }

  // Create some sample bookings for reviews
  const sampleBooking1 = await prisma.booking.create({
    data: {
      customerId: customer.id,
      professionalId: professional.id,
      categoryId: plumbingCategory?.id || "",
      status: "COMPLETED",
      scheduledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      addressText: "123 Main Street, Dhaka",
      lat: 23.8103,
      lng: 90.4125,
      details: "Kitchen sink repair and faucet replacement",
      pricingModel: "HOURLY",
      quotedPriceBDT: 2000.0,
      commissionPercent: 15.0,
      finalAmountBDT: 2000.0,
      checkInAt: new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000
      ),
      checkOutAt: new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000
      ),
      actualHours: 2.0,
    },
  });

  const sampleBooking2 = await prisma.booking.create({
    data: {
      customerId: customer.id,
      professionalId: professional.id,
      categoryId: electricalCategory?.id || "",
      status: "COMPLETED",
      scheduledAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      addressText: "456 Park Avenue, Dhaka",
      lat: 23.8103,
      lng: 90.4125,
      details: "Electrical outlet installation",
      pricingModel: "FIXED",
      quotedPriceBDT: 3000.0,
      commissionPercent: 15.0,
      finalAmountBDT: 3000.0,
      checkInAt: new Date(
        Date.now() - 14 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000
      ),
      checkOutAt: new Date(
        Date.now() - 14 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000
      ),
      actualHours: 2.0,
    },
  });

  // Create sample reviews
  const review1 = await prisma.review.create({
    data: {
      bookingId: sampleBooking1.id,
      customerId: customer.id,
      professionalId: professional.id,
      rating: 5,
      comment:
        "Excellent service! The plumber was very professional and fixed the issue quickly. Highly recommended!",
      photos: ["https://example.com/plumbing-work-1.jpg"],
      flagged: false,
    },
  });

  const review2 = await prisma.review.create({
    data: {
      bookingId: sampleBooking2.id,
      customerId: customer.id,
      professionalId: professional.id,
      rating: 4,
      comment:
        "Good work overall, but took a bit longer than expected. The final result was satisfactory.",
      photos: [],
      flagged: false,
    },
  });

  // Create a review response
  await prisma.reviewResponse.create({
    data: {
      reviewId: review1.id,
      professionalId: professional.id,
      comment:
        "Thank you for your kind feedback! I'm glad I could help with your plumbing needs. Feel free to contact me for any future services.",
    },
  });

  // Create professional rating aggregate
  await prisma.professionalRatingAggregate.upsert({
    where: { professionalId: professional.id },
    update: {},
    create: {
      professionalId: professional.id,
      avgRating: 4.5,
      totalReviews: 2,
      weightedScore: 4.6,
      lastCalculated: new Date(),
    },
  });

  // ===== DYNAMIC ANALYTICS CONFIGURATION =====
  console.log("🔧 Creating analytics configuration...");

  // Create Analytics Metrics
  const metrics = [
    // Revenue Metrics
    {
      name: "Total Revenue",
      slug: "total-revenue",
      description: "Total revenue from completed bookings",
      category: "revenue",
      dataSource: "bookings",
      aggregation: "sum",
      field: "finalAmountBDT",
      filters: { status: "COMPLETED" },
      format: "currency",
      icon: "DollarSign",
      color: "#10b981",
    },
    {
      name: "Monthly Recurring Revenue",
      slug: "mrr",
      description: "Average monthly revenue",
      category: "revenue",
      dataSource: "bookings",
      aggregation: "sum",
      field: "finalAmountBDT",
      filters: { status: "COMPLETED" },
      calculation: { type: "divide_by_months" },
      format: "currency",
      icon: "TrendingUp",
      color: "#10b981",
    },
    {
      name: "Average Booking Value",
      slug: "avg-booking-value",
      description: "Average value per booking",
      category: "revenue",
      dataSource: "bookings",
      aggregation: "avg",
      field: "finalAmountBDT",
      filters: { status: "COMPLETED" },
      format: "currency",
      icon: "DollarSign",
      color: "#f59e0b",
    },
    // Booking Metrics
    {
      name: "Total Bookings",
      slug: "total-bookings",
      description: "Total number of bookings",
      category: "bookings",
      dataSource: "bookings",
      aggregation: "count",
      field: "id",
      format: "number",
      icon: "Calendar",
      color: "#3b82f6",
    },
    {
      name: "Completed Bookings",
      slug: "completed-bookings",
      description: "Number of completed bookings",
      category: "bookings",
      dataSource: "bookings",
      aggregation: "count",
      field: "id",
      filters: { status: "COMPLETED" },
      format: "number",
      icon: "CheckCircle",
      color: "#10b981",
    },
    {
      name: "Pending Bookings",
      slug: "pending-bookings",
      description: "Number of pending bookings",
      category: "bookings",
      dataSource: "bookings",
      aggregation: "count",
      field: "id",
      filters: { status: "PENDING" },
      format: "number",
      icon: "Clock",
      color: "#f59e0b",
    },
    {
      name: "Cancelled Bookings",
      slug: "cancelled-bookings",
      description: "Number of cancelled bookings",
      category: "bookings",
      dataSource: "bookings",
      aggregation: "count",
      field: "id",
      filters: { status: "CANCELLED" },
      format: "number",
      icon: "XCircle",
      color: "#ef4444",
    },
    // User Metrics
    {
      name: "Total Users",
      slug: "total-users",
      description: "Total number of users",
      category: "users",
      dataSource: "users",
      aggregation: "count",
      field: "id",
      format: "number",
      icon: "Users",
      color: "#8b5cf6",
    },
    {
      name: "Active Professionals",
      slug: "active-professionals",
      description: "Number of active professionals",
      category: "users",
      dataSource: "users",
      aggregation: "count",
      field: "id",
      filters: {
        isActive: true,
        roles: { some: { role: { name: "PROFESSIONAL" } } },
      },
      format: "number",
      icon: "UserCheck",
      color: "#8b5cf6",
    },
    {
      name: "Active Customers",
      slug: "active-customers",
      description: "Number of active customers",
      category: "users",
      dataSource: "users",
      aggregation: "count",
      field: "id",
      filters: {
        isActive: true,
        roles: { some: { role: { name: "CUSTOMER" } } },
      },
      format: "number",
      icon: "Users",
      color: "#3b82f6",
    },
    // Rating Metrics
    {
      name: "Average Rating",
      slug: "avg-rating",
      description: "Average customer rating",
      category: "ratings",
      dataSource: "reviews",
      aggregation: "avg",
      field: "rating",
      format: "decimal",
      icon: "Star",
      color: "#f59e0b",
    },
    {
      name: "Total Reviews",
      slug: "total-reviews",
      description: "Total number of reviews",
      category: "ratings",
      dataSource: "reviews",
      aggregation: "count",
      field: "id",
      format: "number",
      icon: "MessageSquare",
      color: "#3b82f6",
    },
  ];

  const createdMetrics: any = {};
  for (const metric of metrics) {
    const created = await prisma.analyticsMetric.upsert({
      where: { slug: metric.slug },
      update: {},
      create: metric,
    });
    createdMetrics[metric.slug] = created;
  }

  // Create Dashboards
  // 1. Admin Dashboard
  const adminDashboard = await prisma.analyticsDashboard.upsert({
    where: { slug: "admin-overview" },
    update: {},
    create: {
      name: "Admin Overview",
      slug: "admin-overview",
      roleId: adminRole.id,
      description: "Comprehensive analytics dashboard for administrators",
      isActive: true,
      layout: { type: "grid", columns: 12 },
      config: { refreshInterval: 300000 }, // 5 minutes
    },
  });

  // Admin Dashboard Widgets
  const adminWidgets = [
    {
      dashboardId: adminDashboard.id,
      metricId: createdMetrics["mrr"].id,
      name: "Monthly Recurring Revenue",
      type: "kpi",
      position: { x: 0, y: 0, w: 3, h: 2 },
      config: { showTrend: true, showGrowth: true },
      visualization: { icon: "DollarSign", color: "#10b981" },
    },
    {
      dashboardId: adminDashboard.id,
      metricId: createdMetrics["total-bookings"].id,
      name: "Total Bookings",
      type: "kpi",
      position: { x: 3, y: 0, w: 3, h: 2 },
      config: { showTrend: true, showGrowth: true },
      visualization: { icon: "Calendar", color: "#3b82f6" },
    },
    {
      dashboardId: adminDashboard.id,
      metricId: createdMetrics["total-users"].id,
      name: "Active Users",
      type: "kpi",
      position: { x: 6, y: 0, w: 3, h: 2 },
      config: { showTrend: true, showGrowth: true },
      visualization: { icon: "Users", color: "#8b5cf6" },
    },
    {
      dashboardId: adminDashboard.id,
      metricId: createdMetrics["avg-booking-value"].id,
      name: "Avg Booking Value",
      type: "kpi",
      position: { x: 9, y: 0, w: 3, h: 2 },
      config: { showTrend: true, showGrowth: true },
      visualization: { icon: "DollarSign", color: "#f59e0b" },
    },
    {
      dashboardId: adminDashboard.id,
      metricId: null,
      name: "Service Distribution",
      type: "chart",
      position: { x: 0, y: 2, w: 6, h: 4 },
      config: { dataType: "service_distribution" },
      visualization: {
        chartType: "pie",
        colors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"],
      },
    },
    {
      dashboardId: adminDashboard.id,
      metricId: null,
      name: "Revenue Trend",
      type: "chart",
      position: { x: 6, y: 2, w: 6, h: 4 },
      config: { dataType: "revenue_trend", period: "monthly" },
      visualization: { chartType: "line", colors: ["#10b981"] },
    },
    {
      dashboardId: adminDashboard.id,
      metricId: null,
      name: "Geographic Distribution",
      type: "map",
      position: { x: 0, y: 6, w: 12, h: 4 },
      config: { dataType: "geo_heatmap" },
      visualization: { mapType: "heatmap" },
    },
    {
      dashboardId: adminDashboard.id,
      metricId: null,
      name: "Top Categories",
      type: "table",
      position: { x: 0, y: 10, w: 6, h: 3 },
      config: { dataType: "top_categories", limit: 5 },
      visualization: { showRank: true, showGrowth: true },
    },
    {
      dashboardId: adminDashboard.id,
      metricId: null,
      name: "User Growth",
      type: "chart",
      position: { x: 6, y: 10, w: 6, h: 3 },
      config: { dataType: "user_growth", period: "monthly" },
      visualization: { chartType: "bar", colors: ["#8b5cf6", "#3b82f6"] },
    },
  ];

  for (const widget of adminWidgets) {
    await prisma.analyticsWidget.create({ data: widget });
  }

  // 2. Professional Dashboard
  const professionalDashboard = await prisma.analyticsDashboard.upsert({
    where: { slug: "professional-overview" },
    update: {},
    create: {
      name: "Professional Overview",
      slug: "professional-overview",
      roleId: professionalRole.id,
      description: "Analytics dashboard for service professionals",
      isActive: true,
      layout: { type: "grid", columns: 12 },
      config: { refreshInterval: 300000 },
    },
  });

  // Professional Dashboard Widgets
  const professionalWidgets = [
    {
      dashboardId: professionalDashboard.id,
      metricId: createdMetrics["total-revenue"].id,
      name: "Total Earnings",
      type: "kpi",
      position: { x: 0, y: 0, w: 4, h: 2 },
      config: { showTrend: true, showGrowth: true, userScope: "self" },
      visualization: { icon: "DollarSign", color: "#10b981" },
    },
    {
      dashboardId: professionalDashboard.id,
      metricId: createdMetrics["completed-bookings"].id,
      name: "Completed Bookings",
      type: "kpi",
      position: { x: 4, y: 0, w: 4, h: 2 },
      config: { showTrend: true, showGrowth: true, userScope: "self" },
      visualization: { icon: "Calendar", color: "#3b82f6" },
    },
    {
      dashboardId: professionalDashboard.id,
      metricId: createdMetrics["avg-rating"].id,
      name: "Average Rating",
      type: "kpi",
      position: { x: 8, y: 0, w: 4, h: 2 },
      config: { showTrend: true, userScope: "self" },
      visualization: { icon: "Star", color: "#f59e0b" },
    },
    {
      dashboardId: professionalDashboard.id,
      metricId: null,
      name: "Monthly Earnings",
      type: "chart",
      position: { x: 0, y: 2, w: 8, h: 4 },
      config: {
        dataType: "monthly_earnings",
        period: "monthly",
        userScope: "self",
      },
      visualization: { chartType: "bar", colors: ["#10b981"] },
    },
    {
      dashboardId: professionalDashboard.id,
      metricId: null,
      name: "Booking Status",
      type: "chart",
      position: { x: 8, y: 2, w: 4, h: 4 },
      config: { dataType: "booking_status", userScope: "self" },
      visualization: {
        chartType: "donut",
        colors: ["#10b981", "#f59e0b", "#3b82f6", "#ef4444"],
      },
    },
    {
      dashboardId: professionalDashboard.id,
      metricId: null,
      name: "Top Services",
      type: "table",
      position: { x: 0, y: 6, w: 6, h: 3 },
      config: { dataType: "top_services", limit: 5, userScope: "self" },
      visualization: { showRank: true },
    },
    {
      dashboardId: professionalDashboard.id,
      metricId: null,
      name: "Rating Trend",
      type: "chart",
      position: { x: 6, y: 6, w: 6, h: 3 },
      config: {
        dataType: "rating_trend",
        period: "monthly",
        userScope: "self",
      },
      visualization: { chartType: "line", colors: ["#f59e0b"] },
    },
  ];

  for (const widget of professionalWidgets) {
    await prisma.analyticsWidget.create({ data: widget });
  }

  // 3. Customer Dashboard
  const customerDashboard = await prisma.analyticsDashboard.upsert({
    where: { slug: "customer-overview" },
    update: {},
    create: {
      name: "Customer Overview",
      slug: "customer-overview",
      roleId: customerRole.id,
      description: "Analytics dashboard for customers",
      isActive: true,
      layout: { type: "grid", columns: 12 },
      config: { refreshInterval: 300000 },
    },
  });

  // Customer Dashboard Widgets
  const customerWidgets = [
    {
      dashboardId: customerDashboard.id,
      metricId: createdMetrics["total-revenue"].id,
      name: "Total Spending",
      type: "kpi",
      position: { x: 0, y: 0, w: 4, h: 2 },
      config: { showTrend: true, userScope: "self" },
      visualization: { icon: "DollarSign", color: "#3b82f6" },
    },
    {
      dashboardId: customerDashboard.id,
      metricId: createdMetrics["total-bookings"].id,
      name: "Total Bookings",
      type: "kpi",
      position: { x: 4, y: 0, w: 4, h: 2 },
      config: { showTrend: true, userScope: "self" },
      visualization: { icon: "Calendar", color: "#8b5cf6" },
    },
    {
      dashboardId: customerDashboard.id,
      metricId: createdMetrics["avg-booking-value"].id,
      name: "Avg Spending",
      type: "kpi",
      position: { x: 8, y: 0, w: 4, h: 2 },
      config: { userScope: "self" },
      visualization: { icon: "DollarSign", color: "#f59e0b" },
    },
    {
      dashboardId: customerDashboard.id,
      metricId: null,
      name: "Monthly Spending",
      type: "chart",
      position: { x: 0, y: 2, w: 8, h: 4 },
      config: {
        dataType: "monthly_spending",
        period: "monthly",
        userScope: "self",
      },
      visualization: { chartType: "area", colors: ["#3b82f6"] },
    },
    {
      dashboardId: customerDashboard.id,
      metricId: null,
      name: "Service Categories",
      type: "chart",
      position: { x: 8, y: 2, w: 4, h: 4 },
      config: { dataType: "service_categories", userScope: "self" },
      visualization: {
        chartType: "donut",
        colors: ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"],
      },
    },
    {
      dashboardId: customerDashboard.id,
      metricId: null,
      name: "Favorite Services",
      type: "table",
      position: { x: 0, y: 6, w: 12, h: 3 },
      config: { dataType: "favorite_services", limit: 5, userScope: "self" },
      visualization: { showCount: true },
    },
  ];

  for (const widget of customerWidgets) {
    await prisma.analyticsWidget.create({ data: widget });
  }

  console.log("✅ Analytics configuration created successfully!");

  console.log("✅ Database seeded successfully!");
  console.log("👤 Admin user: admin@example.com / admin123");
  console.log("👤 Customer user: customer@example.com / customer123");
  console.log(
    "👤 Professional user: professional@example.com / professional123"
  );
  console.log("🔗 PgAdmin: http://localhost:5050 (admin@example.com / admin)");
  console.log("📝 Sample reviews and responses created");
  console.log("📊 Dynamic analytics dashboards created for all roles");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
