import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";

describe("Admin Catalog (e2e)", () => {
  let app: INestApplication;
  let adminAccessToken: string;
  let categoryId: string;
  let tagId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login as admin to get access token
    const loginResponse = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: "admin@example.com",
        password: "admin123",
        loginType: "PASSWORD",
      });

    adminAccessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Categories Management", () => {
    describe("/admin/catalog/categories (POST)", () => {
      it("should create a new category", () => {
        return request(app.getHttpServer())
          .post("/api/v1/admin/catalog/categories")
          .set("Authorization", `Bearer ${adminAccessToken}`)
          .send({
            name: "Test Category",
            slug: "test-category",
            description: "Test category description",
            isActive: true,
            icon: "fa-solid fa-test",
          })
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty("id");
            expect(res.body).toHaveProperty("name", "Test Category");
            expect(res.body).toHaveProperty("slug", "test-category");
            expect(res.body).toHaveProperty("isActive", true);
            categoryId = res.body.id;
          });
      });

      it("should fail with duplicate slug", async () => {
        // First create a category
        await request(app.getHttpServer())
          .post("/api/v1/admin/catalog/categories")
          .set("Authorization", `Bearer ${adminAccessToken}`)
          .send({
            name: "Duplicate Test",
            slug: "duplicate-test",
            description: "First category",
          });

        // Try to create another with same slug
        return request(app.getHttpServer())
          .post("/api/v1/admin/catalog/categories")
          .set("Authorization", `Bearer ${adminAccessToken}`)
          .send({
            name: "Duplicate Test 2",
            slug: "duplicate-test",
            description: "Second category",
          })
          .expect(409);
      });

      it("should fail without admin authentication", () => {
        return request(app.getHttpServer())
          .post("/api/v1/admin/catalog/categories")
          .send({
            name: "Unauthorized Test",
            slug: "unauthorized-test",
          })
          .expect(401);
      });
    });

    describe("/admin/catalog/categories (GET)", () => {
      it("should return all categories for admin", () => {
        return request(app.getHttpServer())
          .get("/api/v1/admin/catalog/categories")
          .set("Authorization", `Bearer ${adminAccessToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toBeInstanceOf(Array);
            expect(res.body.length).toBeGreaterThan(0);
            expect(res.body[0]).toHaveProperty("id");
            expect(res.body[0]).toHaveProperty("name");
            expect(res.body[0]).toHaveProperty("slug");
          });
      });

      it("should return categories in tree format", () => {
        return request(app.getHttpServer())
          .get("/api/v1/admin/catalog/categories?tree=true")
          .set("Authorization", `Bearer ${adminAccessToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toBeInstanceOf(Array);
          });
      });

      it("should include inactive categories when requested", () => {
        return request(app.getHttpServer())
          .get("/api/v1/admin/catalog/categories?includeInactive=true")
          .set("Authorization", `Bearer ${adminAccessToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toBeInstanceOf(Array);
          });
      });
    });

    describe("/admin/catalog/categories/:id (GET)", () => {
      it("should return category by ID", () => {
        return request(app.getHttpServer())
          .get(`/api/v1/admin/catalog/categories/${categoryId}`)
          .set("Authorization", `Bearer ${adminAccessToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty("id", categoryId);
            expect(res.body).toHaveProperty("name");
            expect(res.body).toHaveProperty("slug");
          });
      });

      it("should fail with invalid category ID", () => {
        return request(app.getHttpServer())
          .get("/api/v1/admin/catalog/categories/invalid-id")
          .set("Authorization", `Bearer ${adminAccessToken}`)
          .expect(404);
      });
    });

    describe("/admin/catalog/categories/:id (PATCH)", () => {
      it("should update category", () => {
        return request(app.getHttpServer())
          .patch(`/api/v1/admin/catalog/categories/${categoryId}`)
          .set("Authorization", `Bearer ${adminAccessToken}`)
          .send({
            name: "Updated Test Category",
            description: "Updated description",
            isActive: false,
          })
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty("id", categoryId);
            expect(res.body).toHaveProperty("name", "Updated Test Category");
            expect(res.body).toHaveProperty("isActive", false);
          });
      });

      it("should fail with invalid category ID", () => {
        return request(app.getHttpServer())
          .patch("/api/v1/admin/catalog/categories/invalid-id")
          .set("Authorization", `Bearer ${adminAccessToken}`)
          .send({
            name: "Updated Name",
          })
          .expect(404);
      });
    });

    describe("/admin/catalog/categories/:id (DELETE)", () => {
      it("should delete category", () => {
        return request(app.getHttpServer())
          .delete(`/api/v1/admin/catalog/categories/${categoryId}`)
          .set("Authorization", `Bearer ${adminAccessToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty(
              "message",
              "Category deleted successfully"
            );
          });
      });

      it("should fail with invalid category ID", () => {
        return request(app.getHttpServer())
          .delete("/api/v1/admin/catalog/categories/invalid-id")
          .set("Authorization", `Bearer ${adminAccessToken}`)
          .expect(404);
      });
    });
  });

  describe("Tags Management", () => {
    describe("/admin/catalog/tags (POST)", () => {
      it("should create a new tag", () => {
        return request(app.getHttpServer())
          .post("/api/v1/admin/catalog/tags")
          .set("Authorization", `Bearer ${adminAccessToken}`)
          .send({
            name: "Test Tag",
            slug: "test-tag",
          })
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty("id");
            expect(res.body).toHaveProperty("name", "Test Tag");
            expect(res.body).toHaveProperty("slug", "test-tag");
            tagId = res.body.id;
          });
      });

      it("should fail with duplicate slug", async () => {
        // First create a tag
        await request(app.getHttpServer())
          .post("/api/v1/admin/catalog/tags")
          .set("Authorization", `Bearer ${adminAccessToken}`)
          .send({
            name: "Duplicate Tag",
            slug: "duplicate-tag",
          });

        // Try to create another with same slug
        return request(app.getHttpServer())
          .post("/api/v1/admin/catalog/tags")
          .set("Authorization", `Bearer ${adminAccessToken}`)
          .send({
            name: "Duplicate Tag 2",
            slug: "duplicate-tag",
          })
          .expect(409);
      });
    });

    describe("/admin/catalog/tags (GET)", () => {
      it("should return all tags", () => {
        return request(app.getHttpServer())
          .get("/api/v1/admin/catalog/tags")
          .set("Authorization", `Bearer ${adminAccessToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toBeInstanceOf(Array);
            expect(res.body.length).toBeGreaterThan(0);
            expect(res.body[0]).toHaveProperty("id");
            expect(res.body[0]).toHaveProperty("name");
            expect(res.body[0]).toHaveProperty("slug");
          });
      });
    });

    describe("/admin/catalog/tags/:id (GET)", () => {
      it("should return tag by ID", () => {
        return request(app.getHttpServer())
          .get(`/api/v1/admin/catalog/tags/${tagId}`)
          .set("Authorization", `Bearer ${adminAccessToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty("id", tagId);
            expect(res.body).toHaveProperty("name");
            expect(res.body).toHaveProperty("slug");
          });
      });

      it("should fail with invalid tag ID", () => {
        return request(app.getHttpServer())
          .get("/api/v1/admin/catalog/tags/invalid-id")
          .set("Authorization", `Bearer ${adminAccessToken}`)
          .expect(404);
      });
    });

    describe("/admin/catalog/tags/:id (PATCH)", () => {
      it("should update tag", () => {
        return request(app.getHttpServer())
          .patch(`/api/v1/admin/catalog/tags/${tagId}`)
          .set("Authorization", `Bearer ${adminAccessToken}`)
          .send({
            name: "Updated Test Tag",
            slug: "updated-test-tag",
          })
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty("id", tagId);
            expect(res.body).toHaveProperty("name", "Updated Test Tag");
            expect(res.body).toHaveProperty("slug", "updated-test-tag");
          });
      });

      it("should fail with invalid tag ID", () => {
        return request(app.getHttpServer())
          .patch("/api/v1/admin/catalog/tags/invalid-id")
          .set("Authorization", `Bearer ${adminAccessToken}`)
          .send({
            name: "Updated Name",
          })
          .expect(404);
      });
    });

    describe("/admin/catalog/tags/:id (DELETE)", () => {
      it("should delete tag", () => {
        return request(app.getHttpServer())
          .delete(`/api/v1/admin/catalog/tags/${tagId}`)
          .set("Authorization", `Bearer ${adminAccessToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty(
              "message",
              "Tag deleted successfully"
            );
          });
      });

      it("should fail with invalid tag ID", () => {
        return request(app.getHttpServer())
          .delete("/api/v1/admin/catalog/tags/invalid-id")
          .set("Authorization", `Bearer ${adminAccessToken}`)
          .expect(404);
      });
    });
  });
});






























