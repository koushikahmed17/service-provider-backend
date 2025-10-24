import { Module } from "@nestjs/common";
import { ServiceCatalogController } from "./controllers/service-catalog.controller";
import { AdminCatalogController } from "./controllers/admin-catalog.controller";
import { ServiceCatalogService } from "./services/service-catalog.service";
import { ProfessionalServiceService } from "./services/professional-service.service";
import { SearchService } from "./services/search.service";
import { CategoryService } from "./services/category.service";
import { TagService } from "./services/tag.service";

@Module({
  controllers: [ServiceCatalogController, AdminCatalogController],
  providers: [
    ServiceCatalogService,
    ProfessionalServiceService,
    SearchService,
    CategoryService,
    TagService,
  ],
  exports: [
    ServiceCatalogService,
    ProfessionalServiceService,
    SearchService,
    CategoryService,
    TagService,
  ],
})
export class ServiceCatalogModule {}
