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
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateTagDto,
  UpdateTagDto,
} from "../dto";

@ApiTags("Admin - Service Catalog")
@Controller("admin/catalog")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@UseInterceptors(ClassSerializerInterceptor)
@ApiBearerAuth()
export class AdminCatalogController {
  constructor(private readonly serviceCatalogService: ServiceCatalogService) {}

  // Category management
  @Post("categories")
  @ApiOperation({ summary: "Create a new category (Admin only)" })
  @ApiResponse({ status: 201, description: "Category created successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  async createCategory(@Body() createDto: CreateCategoryDto) {
    return this.serviceCatalogService.createCategory(createDto);
  }

  @Get("categories")
  @ApiOperation({ summary: "Get all categories (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Categories retrieved successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  @ApiQuery({
    name: "tree",
    required: false,
    type: Boolean,
    description: "Return categories in tree format",
  })
  @ApiQuery({
    name: "includeInactive",
    required: false,
    type: Boolean,
    description: "Include inactive categories",
  })
  async getCategories(
    @Query("tree") tree?: string,
    @Query("includeInactive") includeInactive?: string
  ) {
    const isTree = tree === "true";
    const includeInactiveCategories = includeInactive === "true";
    return this.serviceCatalogService.getCategories({
      format: isTree ? "tree" : "flat",
      activeOnly: !includeInactiveCategories,
    });
  }

  @Get("categories/:id")
  @ApiOperation({ summary: "Get category by ID (Admin only)" })
  @ApiResponse({ status: 200, description: "Category retrieved successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  @ApiResponse({ status: 404, description: "Category not found" })
  async getCategoryById(@Param("id") id: string) {
    return this.serviceCatalogService.getCategoryById(id);
  }

  @Patch("categories/:id")
  @ApiOperation({ summary: "Update category (Admin only)" })
  @ApiResponse({ status: 200, description: "Category updated successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  @ApiResponse({ status: 404, description: "Category not found" })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  async updateCategory(
    @Param("id") id: string,
    @Body() updateDto: UpdateCategoryDto
  ) {
    return this.serviceCatalogService.updateCategory(id, updateDto);
  }

  @Delete("categories/:id")
  @ApiOperation({ summary: "Delete category (Admin only)" })
  @ApiResponse({ status: 200, description: "Category deleted successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  @ApiResponse({ status: 404, description: "Category not found" })
  @ApiResponse({
    status: 400,
    description: "Cannot delete category with children or services",
  })
  async deleteCategory(@Param("id") id: string) {
    return this.serviceCatalogService.deleteCategory(id);
  }

  // Tag management
  @Post("tags")
  @ApiOperation({ summary: "Create a new tag (Admin only)" })
  @ApiResponse({ status: 201, description: "Tag created successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  async createTag(@Body() createDto: CreateTagDto) {
    return this.serviceCatalogService.createTag(createDto);
  }

  @Get("tags")
  @ApiOperation({ summary: "Get all tags (Admin only)" })
  @ApiResponse({ status: 200, description: "Tags retrieved successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  async getTags() {
    return this.serviceCatalogService.getTags();
  }

  @Get("tags/:id")
  @ApiOperation({ summary: "Get tag by ID (Admin only)" })
  @ApiResponse({ status: 200, description: "Tag retrieved successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  @ApiResponse({ status: 404, description: "Tag not found" })
  async getTagById(@Param("id") id: string) {
    return this.serviceCatalogService.getTagById(id);
  }

  @Patch("tags/:id")
  @ApiOperation({ summary: "Update tag (Admin only)" })
  @ApiResponse({ status: 200, description: "Tag updated successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  @ApiResponse({ status: 404, description: "Tag not found" })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  async updateTag(@Param("id") id: string, @Body() updateDto: UpdateTagDto) {
    return this.serviceCatalogService.updateTag(id, updateDto);
  }

  @Delete("tags/:id")
  @ApiOperation({ summary: "Delete tag (Admin only)" })
  @ApiResponse({ status: 200, description: "Tag deleted successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  @ApiResponse({ status: 404, description: "Tag not found" })
  async deleteTag(@Param("id") id: string) {
    return this.serviceCatalogService.deleteTag(id);
  }
}
