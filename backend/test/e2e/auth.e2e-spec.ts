import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";

describe("Auth (e2e)", () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("/auth/register (POST)", () => {
    it("should register a new customer", () => {
      return request(app.getHttpServer())
        .post("/api/v1/auth/register")
        .send({
          email: "test@example.com",
          fullName: "Test User",
          password: "password123",
          userType: "CUSTOMER",
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty("accessToken");
          expect(res.body).toHaveProperty("refreshToken");
          expect(res.body).toHaveProperty("user");
          expect(res.body.user.email).toBe("test@example.com");
        });
    });

    it("should register a new professional", () => {
      return request(app.getHttpServer())
        .post("/api/v1/auth/register")
        .send({
          email: "professional@example.com",
          fullName: "Professional User",
          password: "password123",
          userType: "PROFESSIONAL",
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty("accessToken");
          expect(res.body).toHaveProperty("user");
          expect(res.body.user.userType).toBe("PROFESSIONAL");
        });
    });

    it("should fail with duplicate email", async () => {
      // First registration
      await request(app.getHttpServer()).post("/api/v1/auth/register").send({
        email: "duplicate@example.com",
        fullName: "First User",
        password: "password123",
        userType: "CUSTOMER",
      });

      // Second registration with same email
      return request(app.getHttpServer())
        .post("/api/v1/auth/register")
        .send({
          email: "duplicate@example.com",
          fullName: "Second User",
          password: "password123",
          userType: "CUSTOMER",
        })
        .expect(409);
    });
  });

  describe("/auth/login (POST)", () => {
    beforeEach(async () => {
      // Register a test user
      await request(app.getHttpServer()).post("/api/v1/auth/register").send({
        email: "login@example.com",
        fullName: "Login User",
        password: "password123",
        userType: "CUSTOMER",
      });
    });

    it("should login with password", () => {
      return request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({
          email: "login@example.com",
          password: "password123",
          loginType: "PASSWORD",
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("accessToken");
          expect(res.body).toHaveProperty("refreshToken");
          expect(res.body.user.email).toBe("login@example.com");
        });
    });

    it("should fail with wrong password", () => {
      return request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({
          email: "login@example.com",
          password: "wrongpassword",
          loginType: "PASSWORD",
        })
        .expect(401);
    });
  });

  describe("/auth/me (GET)", () => {
    let accessToken: string;

    beforeEach(async () => {
      // Register and login
      const registerResponse = await request(app.getHttpServer())
        .post("/api/v1/auth/register")
        .send({
          email: "me@example.com",
          fullName: "Me User",
          password: "password123",
          userType: "CUSTOMER",
        });

      accessToken = registerResponse.body.accessToken;
    });

    it("should get current user profile", () => {
      return request(app.getHttpServer())
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.email).toBe("me@example.com");
          expect(res.body.fullName).toBe("Me User");
        });
    });

    it("should fail without token", () => {
      return request(app.getHttpServer()).get("/api/v1/auth/me").expect(401);
    });
  });
});































