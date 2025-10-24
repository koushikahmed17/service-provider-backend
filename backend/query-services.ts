import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function queryServices() {
  console.log("🔍 Querying Database to Show Service Structure...\n");
  console.log("=".repeat(80));

  try {
    // 1. Query Service Categories
    console.log("\n📁 SERVICE CATEGORIES (service_categories table):");
    console.log("-".repeat(80));
    const categories = await prisma.serviceCategory.findMany({
      take: 10,
      include: {
        parent: true,
        children: true,
        _count: {
          select: {
            professionalServices: true,
            bookings: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`Total categories found: ${categories.length}\n`);
    categories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.name} (${cat.slug})`);
      console.log(`   ID: ${cat.id}`);
      console.log(`   Description: ${cat.description || "N/A"}`);
      console.log(`   Icon: ${cat.icon || "N/A"}`);
      console.log(`   Parent: ${cat.parent?.name || "None (Root Category)"}`);
      console.log(`   Children: ${cat.children.length}`);
      console.log(`   Active: ${cat.isActive}`);
      console.log(
        `   Professional Services: ${cat._count.professionalServices}`
      );
      console.log(`   Bookings: ${cat._count.bookings}`);
      console.log(`   Created: ${cat.createdAt.toISOString()}`);
      console.log("");
    });

    // 2. Query Professional Services
    console.log("\n💼 PROFESSIONAL SERVICES (professional_services table):");
    console.log("-".repeat(80));
    const professionalServices = await prisma.professionalService.findMany({
      take: 10,
      include: {
        category: true,
        professional: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(
      `Total professional services found: ${professionalServices.length}\n`
    );
    professionalServices.forEach((service, index) => {
      console.log(
        `${index + 1}. Service by ${service.professional.user.fullName}`
      );
      console.log(`   Service ID: ${service.id}`);
      console.log(
        `   Category: ${service.category.name} (${service.category.slug})`
      );
      console.log(`   Professional: ${service.professional.user.fullName}`);
      console.log(`   Email: ${service.professional.user.email}`);
      console.log(`   Phone: ${service.professional.user.phone || "N/A"}`);
      console.log(`   Rate Type: ${service.rateType}`);
      console.log(
        `   Hourly Rate: ${
          service.hourlyRateBDT ? `BDT ${service.hourlyRateBDT}` : "N/A"
        }`
      );
      console.log(
        `   Fixed Price: ${
          service.fixedPriceBDT ? `BDT ${service.fixedPriceBDT}` : "N/A"
        }`
      );
      console.log(`   Min Hours: ${service.minHours || "N/A"}`);
      console.log(`   Notes: ${service.notes || "N/A"}`);
      console.log(`   Active: ${service.isActive}`);
      console.log(`   Created: ${service.createdAt.toISOString()}`);
      console.log("");
    });

    // 3. Query Professional Profiles
    console.log("\n👨‍💼 PROFESSIONAL PROFILES (professional_profiles table):");
    console.log("-".repeat(80));
    const professionals = await prisma.professionalProfile.findMany({
      take: 5,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            isActive: true,
            nidNumber: true,
            avatarUrl: true,
            locationLat: true,
            locationLng: true,
          },
        },
        professionalServices: {
          include: {
            category: true,
          },
        },
        _count: {
          select: {
            professionalServices: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`Total professionals found: ${professionals.length}\n`);
    professionals.forEach((prof, index) => {
      console.log(`${index + 1}. ${prof.user.fullName}`);
      console.log(`   Profile ID: ${prof.id}`);
      console.log(`   User ID: ${prof.userId}`);
      console.log(`   Email: ${prof.user.email}`);
      console.log(`   Phone: ${prof.user.phone || "N/A"}`);
      console.log(`   NID: ${prof.user.nidNumber || "Not provided"}`);
      console.log(`   Verified: ${prof.isVerified}`);
      console.log(`   Skills: ${prof.skills.join(", ") || "None"}`);
      console.log(`   Categories: ${prof.categories.join(", ") || "None"}`);
      console.log(
        `   Hourly Rate: ${
          prof.hourlyRateBDT ? `BDT ${prof.hourlyRateBDT}` : "N/A"
        }`
      );
      console.log(`   Bio: ${prof.bio || "Not provided"}`);
      console.log(
        `   Experience: ${
          prof.experience ? `${prof.experience} years` : "Not specified"
        }`
      );
      console.log(
        `   Location: ${
          prof.locationLat && prof.locationLng
            ? `${prof.locationLat}, ${prof.locationLng}`
            : "Not set"
        }`
      );
      console.log(`   Services Offered: ${prof._count.professionalServices}`);
      console.log(`   Service Details:`);
      prof.professionalServices.forEach((service, idx) => {
        console.log(
          `     ${idx + 1}. ${service.category.name} - ${service.rateType} - ${
            service.hourlyRateBDT || service.fixedPriceBDT
          } BDT`
        );
      });
      console.log(`   Created: ${prof.createdAt.toISOString()}`);
      console.log("");
    });

    // 4. Statistics
    console.log("\n📊 DATABASE STATISTICS:");
    console.log("-".repeat(80));
    const stats = {
      totalCategories: await prisma.serviceCategory.count(),
      activeCategories: await prisma.serviceCategory.count({
        where: { isActive: true },
      }),
      rootCategories: await prisma.serviceCategory.count({
        where: { parentId: null },
      }),
      totalProfessionals: await prisma.professionalProfile.count(),
      verifiedProfessionals: await prisma.professionalProfile.count({
        where: { isVerified: true },
      }),
      totalProfessionalServices: await prisma.professionalService.count(),
      activeProfessionalServices: await prisma.professionalService.count({
        where: { isActive: true },
      }),
      totalBookings: await prisma.booking.count(),
      totalUsers: await prisma.user.count(),
    };

    console.log(`Total Service Categories: ${stats.totalCategories}`);
    console.log(`Active Categories: ${stats.activeCategories}`);
    console.log(`Root Categories: ${stats.rootCategories}`);
    console.log(`Total Professionals: ${stats.totalProfessionals}`);
    console.log(`Verified Professionals: ${stats.verifiedProfessionals}`);
    console.log(
      `Total Professional Services: ${stats.totalProfessionalServices}`
    );
    console.log(
      `Active Professional Services: ${stats.activeProfessionalServices}`
    );
    console.log(`Total Bookings: ${stats.totalBookings}`);
    console.log(`Total Users: ${stats.totalUsers}`);

    console.log("\n" + "=".repeat(80));
    console.log("✅ Query completed successfully!");
  } catch (error) {
    console.error("❌ Error querying database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the query
queryServices();


















