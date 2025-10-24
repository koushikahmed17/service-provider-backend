import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Roles } from "@/common/decorators/roles.decorator";
import { ServiceCatalogService } from "../services/service-catalog.service";
import { ProfessionalServiceService } from "../services/professional-service.service";
import { SearchService, SearchFilters } from "../services/search.service";
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateProfessionalServiceDto,
  UpdateProfessionalServiceDto,
} from "../dto";

@ApiTags("Service Catalog")
@Controller("catalog")
@UseInterceptors(ClassSerializerInterceptor)
export class ServiceCatalogController {
  constructor(
    private readonly serviceCatalogService: ServiceCatalogService,
    private readonly professionalServiceService: ProfessionalServiceService,
    private readonly searchService: SearchService
  ) {}

  // Public endpoints
  @Get("categories")
  @ApiOperation({ summary: "Get all active categories" })
  @ApiResponse({
    status: 200,
    description: "Categories retrieved successfully",
  })
  @ApiQuery({
    name: "tree",
    required: false,
    type: Boolean,
    description: "Return categories in tree format",
  })
  async getCategories(@Query("tree") tree?: string) {
    const isTree = tree === "true";
    return this.serviceCatalogService.getCategories({
      format: isTree ? "tree" : "flat",
      activeOnly: true,
    });
  }

  @Get("search")
  @ApiOperation({ summary: "Search services with filters" })
  @ApiResponse({
    status: 200,
    description: "Search results retrieved successfully",
  })
  @ApiQuery({ name: "query", required: false, description: "Search query" })
  @ApiQuery({
    name: "lat",
    required: false,
    type: Number,
    description: "Latitude for geo search",
  })
  @ApiQuery({
    name: "lng",
    required: false,
    type: Number,
    description: "Longitude for geo search",
  })
  @ApiQuery({
    name: "radiusKm",
    required: false,
    type: Number,
    description: "Search radius in kilometers",
  })
  @ApiQuery({
    name: "minPrice",
    required: false,
    type: Number,
    description: "Minimum price filter",
  })
  @ApiQuery({
    name: "maxPrice",
    required: false,
    type: Number,
    description: "Maximum price filter",
  })
  @ApiQuery({
    name: "rateType",
    required: false,
    description: "Rate type filter (HOURLY/FIXED)",
  })
  @ApiQuery({
    name: "categoryIds",
    required: false,
    description: "Comma-separated category IDs",
  })
  @ApiQuery({
    name: "rating",
    required: false,
    type: Number,
    description: "Minimum rating filter",
  })
  @ApiQuery({
    name: "professionalId",
    required: false,
    type: String,
    description: "Filter by professional ID",
  })
  async searchServices(
    @Query("query") query?: string,
    @Query("lat") lat?: string,
    @Query("lng") lng?: string,
    @Query("radiusKm") radiusKm?: string,
    @Query("minPrice") minPrice?: string,
    @Query("maxPrice") maxPrice?: string,
    @Query("rateType") rateType?: string,
    @Query("categoryIds") categoryIds?: string,
    @Query("professionalId") professionalId?: string,
    @Query("rating") rating?: string
  ) {
    const filters: SearchFilters = {
      query,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      radiusKm: radiusKm ? parseFloat(radiusKm) : undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      rateType,
      categoryIds: categoryIds ? categoryIds.split(",") : undefined,
      professionalId,
      rating: rating ? parseFloat(rating) : undefined,
    };

    return this.searchService.searchServices(filters);
  }

  @Get("suggestions")
  @ApiOperation({ summary: "Get search suggestions" })
  @ApiResponse({
    status: 200,
    description: "Suggestions retrieved successfully",
  })
  @ApiQuery({ name: "q", required: true, description: "Search query" })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Number of suggestions to return",
  })
  async getSuggestions(
    @Query("q") query: string,
    @Query("limit") limit?: string
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.searchService.getSearchSuggestions(query, limitNum);
  }

  @Get("popular")
  @ApiOperation({ summary: "Get popular categories" })
  @ApiResponse({
    status: 200,
    description: "Popular categories retrieved successfully",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Number of categories to return",
  })
  async getPopularCategories(@Query("limit") limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.searchService.getPopularCategories(limitNum);
  }

  // Professional endpoints
  @Post("pro/services")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("PROFESSIONAL")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a professional service" })
  @ApiResponse({ status: 201, description: "Service created successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Professional access required",
  })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  async createProfessionalService(
    @Body() createDto: CreateProfessionalServiceDto,
    @Request() req: any
  ) {
    try {
      console.log("Full req.user object:", req.user);
      const professionalId = req.user.id; // Use req.user.id instead of req.user.sub
      console.log("Professional ID:", professionalId);
      console.log("Create DTO:", createDto);
      return await this.professionalServiceService.createProfessionalService(
        professionalId,
        createDto
      );
    } catch (error) {
      console.error("Error creating professional service:", error);
      throw error;
    }
  }

  @Get("pro/services")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("PROFESSIONAL")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get professional's services" })
  @ApiResponse({ status: 200, description: "Services retrieved successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Professional access required",
  })
  async getProfessionalServices(@Request() req: any) {
    const professionalId = req.user.sub;
    return this.professionalServiceService.getProfessionalServices(
      professionalId
    );
  }

  @Patch("pro/services/:serviceId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("PROFESSIONAL")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update a professional service" })
  @ApiResponse({ status: 200, description: "Service updated successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Professional access required",
  })
  @ApiResponse({ status: 404, description: "Service not found" })
  async updateProfessionalService(
    @Param("serviceId") serviceId: string,
    @Body() updateDto: UpdateProfessionalServiceDto,
    @Request() req: any
  ) {
    const professionalId = req.user.sub;
    return this.professionalServiceService.updateProfessionalService(
      professionalId,
      serviceId,
      updateDto
    );
  }

  @Delete("pro/services/:serviceId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("PROFESSIONAL")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete a professional service" })
  @ApiResponse({ status: 200, description: "Service deleted successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Professional access required",
  })
  @ApiResponse({ status: 404, description: "Service not found" })
  async deleteProfessionalService(
    @Param("serviceId") serviceId: string,
    @Request() req: any
  ) {
    const professionalId = req.user.sub;
    return this.professionalServiceService.deleteProfessionalService(
      professionalId,
      serviceId
    );
  }
}
