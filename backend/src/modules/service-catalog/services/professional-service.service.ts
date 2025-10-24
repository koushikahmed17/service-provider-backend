import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "@/core/prisma.service";
import { LoggerService } from "@/core/logger.service";
import {
  CreateProfessionalServiceDto,
  UpdateProfessionalServiceDto,
} from "../dto";

@Injectable()
export class ProfessionalServiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService
  ) {}

  async createProfessionalService(
    professionalId: string,
    createDto: CreateProfessionalServiceDto
  ) {
    console.log("Creating professional service for ID:", professionalId);
    console.log("DTO:", createDto);

    // Check if professional exists and is verified
    let professional = await this.prisma.professionalProfile.findUnique({
      where: { userId: professionalId }, // Use userId instead of id
      include: {
        user: {
          include: {
            roles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    });

    console.log("Professional found:", professional ? "Yes" : "No");

    // If professional profile doesn't exist, create one
    if (!professional) {
      console.log(
        "Creating new professional profile for user:",
        professionalId
      );
      const createdProfile = await this.prisma.professionalProfile.create({
        data: {
          userId: professionalId,
          bio: "Professional service provider",
          isVerified: false,
        },
      });

      // Fetch the created profile with user relations
      professional = await this.prisma.professionalProfile.findUnique({
        where: { id: createdProfile.id },
        include: {
          user: {
            include: {
              roles: {
                include: {
                  role: true,
                },
              },
            },
          },
        },
      });
      console.log("Professional profile created:", professional.id);
    }

    const isProfessional = professional.user.roles.some(
      (ur) => ur.role.name === "PROFESSIONAL"
    );
    if (!isProfessional) {
      throw new ForbiddenException("User is not a professional");
    }

    // Check if category exists
    console.log("Looking for category with ID:", createDto.categoryId);
    const category = await this.prisma.serviceCategory.findUnique({
      where: { id: createDto.categoryId },
    });

    console.log("Category found:", category ? category.name : "Not found");
    if (!category) {
      throw new NotFoundException("Category not found");
    }

    // Check if professional already has a service in this category
    const existingService = await this.prisma.professionalService.findUnique({
      where: {
        professionalId_categoryId: {
          professionalId: professional.id, // Use professional profile ID
          categoryId: createDto.categoryId,
        },
      },
    });

    if (existingService) {
      throw new ConflictException(
        "Professional already has a service in this category"
      );
    }

    // Validate rate type and pricing
    this.validateRateType(createDto);

    const service = await this.prisma.professionalService.create({
      data: {
        ...createDto,
        professionalId: professional.id, // Use professional profile ID
      },
      include: {
        category: true,
        professional: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    this.logger.log(
      `Professional service created: ${service.id}`,
      "ProfessionalServiceService"
    );
    return service;
  }

  async updateProfessionalService(
    professionalId: string,
    serviceId: string,
    updateDto: UpdateProfessionalServiceDto
  ) {
    const service = await this.prisma.professionalService.findFirst({
      where: {
        id: serviceId,
        professionalId,
      },
    });

    if (!service) {
      throw new NotFoundException("Service not found");
    }

    // Validate rate type and pricing if provided
    if (
      updateDto.rateType ||
      updateDto.hourlyRateBDT ||
      updateDto.fixedPriceBDT
    ) {
      const validationDto = {
        rateType: updateDto.rateType || service.rateType,
        hourlyRateBDT:
          updateDto.hourlyRateBDT ?? Number(service.hourlyRateBDT || 0),
        fixedPriceBDT:
          updateDto.fixedPriceBDT ?? Number(service.fixedPriceBDT || 0),
      };
      this.validateRateType(validationDto);
    }

    const updatedService = await this.prisma.professionalService.update({
      where: { id: serviceId },
      data: updateDto,
      include: {
        category: true,
        professional: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    this.logger.log(
      `Professional service updated: ${updatedService.id}`,
      "ProfessionalServiceService"
    );
    return updatedService;
  }

  async getProfessionalServices(professionalId: string) {
    return this.prisma.professionalService.findMany({
      where: { professionalId },
      include: {
        category: true,
        professional: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getProfessionalServiceById(professionalId: string, serviceId: string) {
    const service = await this.prisma.professionalService.findFirst({
      where: {
        id: serviceId,
        professionalId,
      },
      include: {
        category: true,
        professional: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!service) {
      throw new NotFoundException("Service not found");
    }

    return service;
  }

  async deleteProfessionalService(professionalId: string, serviceId: string) {
    const service = await this.prisma.professionalService.findFirst({
      where: {
        id: serviceId,
        professionalId,
      },
    });

    if (!service) {
      throw new NotFoundException("Service not found");
    }

    await this.prisma.professionalService.delete({
      where: { id: serviceId },
    });

    this.logger.log(
      `Professional service deleted: ${serviceId}`,
      "ProfessionalServiceService"
    );
    return { message: "Service deleted successfully" };
  }

  private validateRateType(dto: {
    rateType: string;
    hourlyRateBDT?: number;
    fixedPriceBDT?: number;
  }) {
    if (dto.rateType === "HOURLY" && !dto.hourlyRateBDT) {
      throw new Error("Hourly rate is required for HOURLY rate type");
    }

    if (dto.rateType === "FIXED" && !dto.fixedPriceBDT) {
      throw new Error("Fixed price is required for FIXED rate type");
    }

    if (
      dto.rateType === "HOURLY" &&
      dto.hourlyRateBDT &&
      dto.hourlyRateBDT <= 0
    ) {
      throw new Error("Hourly rate must be greater than 0");
    }

    if (
      dto.rateType === "FIXED" &&
      dto.fixedPriceBDT &&
      dto.fixedPriceBDT <= 0
    ) {
      throw new Error("Fixed price must be greater than 0");
    }
  }
}
