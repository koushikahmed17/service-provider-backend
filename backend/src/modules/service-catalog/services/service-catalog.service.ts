import { Injectable } from "@nestjs/common";
import { CategoryService } from "./category.service";
import { ProfessionalServiceService } from "./professional-service.service";
import { SearchService } from "./search.service";
import { TagService } from "./tag.service";
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  GetCategoriesDto,
} from "../dto/category.dto";
import { CreateTagDto, UpdateTagDto } from "../dto/tag.dto";

@Injectable()
export class ServiceCatalogService {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly professionalServiceService: ProfessionalServiceService,
    private readonly searchService: SearchService,
    private readonly tagService: TagService
  ) {}

  // Category methods
  async createCategory(createDto: CreateCategoryDto) {
    return this.categoryService.createCategory(createDto);
  }

  async getCategories(query: GetCategoriesDto) {
    return this.categoryService.getCategories(query);
  }

  async getCategoryById(id: string) {
    return this.categoryService.getCategoryById(id);
  }

  async updateCategory(id: string, updateDto: UpdateCategoryDto) {
    return this.categoryService.updateCategory(id, updateDto);
  }

  async deleteCategory(id: string) {
    return this.categoryService.deleteCategory(id);
  }

  // Tag methods
  async createTag(createDto: CreateTagDto) {
    return this.tagService.createTag(createDto);
  }

  async getTags() {
    return this.tagService.getTags();
  }

  async getTagById(id: string) {
    return this.tagService.getTagById(id);
  }

  async updateTag(id: string, updateDto: UpdateTagDto) {
    return this.tagService.updateTag(id, updateDto);
  }

  async deleteTag(id: string) {
    return this.tagService.deleteTag(id);
  }
}
