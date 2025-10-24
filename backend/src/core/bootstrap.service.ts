import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import * as bcrypt from "bcrypt";

@Injectable()
export class BootstrapService implements OnModuleInit {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureAdminExists();
  }

  private async ensureAdminExists(): Promise<void> {
    try {
      this.logger.log("Checking for admin user...");

      // Check if ADMIN role exists
      let adminRole = await this.prisma.role.findUnique({
        where: { name: "ADMIN" },
      });

      // Create ADMIN role if it doesn't exist
      if (!adminRole) {
        this.logger.log("Creating ADMIN role...");
        adminRole = await this.prisma.role.create({
          data: {
            name: "ADMIN",
            description: "Administrator role with full access",
          },
        });
        this.logger.log("✅ ADMIN role created successfully");
      }

      // Check if admin user exists
      const existingAdmin = await this.prisma.user.findUnique({
        where: { email: "admin@example.com" },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (existingAdmin) {
        // Check if the user has ADMIN role
        const hasAdminRole = existingAdmin.roles.some(
          (ur) => ur.role.name === "ADMIN"
        );

        if (hasAdminRole) {
          this.logger.log("✅ Admin user already exists: admin@example.com");
          return;
        } else {
          // User exists but doesn't have ADMIN role, add it
          this.logger.log("Adding ADMIN role to existing user...");
          await this.prisma.userRole.create({
            data: {
              userId: existingAdmin.id,
              roleId: adminRole.id,
            },
          });
          this.logger.log("✅ ADMIN role added to user: admin@example.com");
          return;
        }
      }

      // Create admin user
      this.logger.log("Creating default admin user...");
      const hashedPassword = await bcrypt.hash("admin123", 10);

      const adminUser = await this.prisma.user.create({
        data: {
          email: "admin@example.com",
          password: hashedPassword,
          fullName: "System Administrator",
          isEmailVerified: true,
          isPhoneVerified: false,
          isActive: true,
        },
      });

      // Assign ADMIN role to the user
      await this.prisma.userRole.create({
        data: {
          userId: adminUser.id,
          roleId: adminRole.id,
        },
      });

      this.logger.log("✅ Default admin user created successfully!");
      this.logger.log("📧 Email: admin@example.com");
      this.logger.log("🔑 Password: admin123");
      this.logger.log(
        "⚠️  Please change the default password after first login!"
      );
    } catch (error) {
      this.logger.error("❌ Error ensuring admin user exists:", error.message);
      // Don't throw error to prevent application from crashing
      // Just log the error and continue
    }
  }
}

