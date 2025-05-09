import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialSchema1720000000000 implements MigrationInterface {
  name = 'CreateInitialSchema1720000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('ADMIN', 'STAFF', 'MANAGER', 'DIRECTOR', 'PURCHASING')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."approvers_approver_type_enum" AS ENUM('MANAGER', 'DIRECTOR', 'PURCHASING')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."requests_status_enum" AS ENUM('DRAFT', 'PENDING_MANAGER_APPROVAL', 'MANAGER_APPROVED', 'PENDING_DIRECTOR_APPROVAL', 'DIRECTOR_APPROVED', 'PENDING_PURCHASING_APPROVAL', 'PURCHASING_APPROVED', 'FULLY_APPROVED', 'REJECTED', 'IN_PROCESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."requests_urgency_level_enum" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."approval_logs_approval_status_enum" AS ENUM('APPROVED', 'REJECTED', 'PENDING')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."request_items_category_enum" AS ENUM('FURNITURE', 'ELECTRONICS', 'OFFICE_SUPPLIES', 'COMPUTER_ACCESSORIES', 'MAINTENANCE', 'OTHERS')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_notification_type_enum" AS ENUM('REQUEST_CREATED', 'PENDING_APPROVAL', 'REQUEST_APPROVED', 'REQUEST_REJECTED', 'FULLY_APPROVED', 'IN_PROCESS', 'COMPLETED', 'CANCELLED')`,
    );

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" SERIAL NOT NULL,
        "role" "public"."users_role_enum" NOT NULL,
        "name" character varying(100) NOT NULL,
        "email" character varying(100) NOT NULL,
        "phone_number" character varying(20),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP,
        CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
        CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
      )
    `);

    // Create accounts table
    await queryRunner.query(`
      CREATE TABLE "accounts" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "password" character varying(255) NOT NULL,
        "is_locked" boolean NOT NULL DEFAULT false,
        "last_login" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP,
        "refresh_token" character varying,
        CONSTRAINT "UQ_3aa23c0a6d107393e8b40e3e2a6" UNIQUE ("user_id"),
        CONSTRAINT "PK_5a7a02c20412299d198e097a8fe" PRIMARY KEY ("id")
      )
    `);

    // Create departments table
    await queryRunner.query(`
      CREATE TABLE "departments" (
        "id" SERIAL NOT NULL,
        "name" character varying NOT NULL,
        "code" character varying NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "approval_layers" integer,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP,
        CONSTRAINT "UQ_8b5ab0f8efe7c4c3ce4a684c7b7" UNIQUE ("code"),
        CONSTRAINT "UQ_8b5ab0f8efe7c4c3ce4a684c7b8" UNIQUE ("name"),
        CONSTRAINT "PK_839517a681a86bb84cbcc6a1e9d" PRIMARY KEY ("id")
      )
    `);

    // Create approvers table
    await queryRunner.query(`
      CREATE TABLE "approvers" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "department_id" integer NOT NULL,
        "approver_type" "public"."approvers_approver_type_enum" NOT NULL,
        "approval_level" integer NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP,
        CONSTRAINT "uk_approver_user_dept_level" UNIQUE ("user_id", "department_id", "approval_level"),
        CONSTRAINT "PK_c4cfc26e4b93e2cbd4a45c50e02" PRIMARY KEY ("id")
      )
    `);

    // Create requests table
    await queryRunner.query(`
      CREATE TABLE "requests" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "department_id" integer NOT NULL,
        "request_code" character varying(50) NOT NULL,
        "description" text NOT NULL,
        "status_note" text,
        "total_amount" double precision,
        "current_approval_level" integer NOT NULL DEFAULT '1',
        "status" "public"."requests_status_enum" NOT NULL DEFAULT 'DRAFT',
        "urgency_level" "public"."requests_urgency_level_enum" NOT NULL DEFAULT 'MEDIUM',
        "request_date" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP,
        CONSTRAINT "UQ_94e7c4d2d4e8273c4450414b19b" UNIQUE ("request_code"),
        CONSTRAINT "PK_0428f484e96f9e6a55955f29b5f" PRIMARY KEY ("id")
      )
    `);

    // Create request_items table
    await queryRunner.query(`
      CREATE TABLE "request_items" (
        "id" SERIAL NOT NULL,
        "request_id" integer NOT NULL,
        "item_name" character varying(200) NOT NULL,
        "quantity" integer NOT NULL,
        "unit_price" numeric(15,2) NOT NULL,
        "total_price" numeric(15,2) NOT NULL,
        "specifications" text,
        "category" "public"."request_items_category_enum" NOT NULL,
        "requested_delivery_date" date,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP,
        CONSTRAINT "PK_b89e1cb8e54a6888a0c3f1b4b15" PRIMARY KEY ("id")
      )
    `);

    // Create approval_logs table
    await queryRunner.query(`
      CREATE TABLE "approval_logs" (
        "id" SERIAL NOT NULL,
        "request_id" integer NOT NULL,
        "approver_id" integer NOT NULL,
        "approval_status" "public"."approval_logs_approval_status_enum" NOT NULL,
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP,
        CONSTRAINT "PK_e783c02f0c9b2aef31be108fd9c" PRIMARY KEY ("id")
      )
    `);

    // Create notifications table
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" SERIAL NOT NULL,
        "request_id" integer,
        "user_id" integer NOT NULL,
        "message" text NOT NULL,
        "notification_type" "public"."notifications_notification_type_enum" NOT NULL,
        "is_read" boolean NOT NULL DEFAULT false,
        "is_sent" boolean NOT NULL DEFAULT false,
        "sent_at" TIMESTAMP,
        "read_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP,
        CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id")
      )
    `);

    // Add foreign keys
    await queryRunner.query(
      `ALTER TABLE "accounts" ADD CONSTRAINT "FK_3aa23c0a6d107393e8b40e3e2a6" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "approvers" ADD CONSTRAINT "FK_a94a82f5bcce7b476fcc2b4cf5b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "approvers" ADD CONSTRAINT "FK_c36e739fb0d3f8f5439ed5d7f95" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "requests" ADD CONSTRAINT "FK_c4bd663a4be3a8b24bd0e9f5c5f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "requests" ADD CONSTRAINT "FK_e8b4b7fb3b3b798b3d6e7a3c578" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "request_items" ADD CONSTRAINT "FK_06e46b80226e4c8c7f32ea5f5d5" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_logs" ADD CONSTRAINT "FK_d3d0b509f1af81b2513e0c02d0c" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_logs" ADD CONSTRAINT "FK_1a0e2ea34b144bd708a610e5a64" FOREIGN KEY ("approver_id") REFERENCES "approvers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_692a909ee0fa9383e7859f9b406" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82f896dc1390d1a7ea3d0c3" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    // Create indexes
    await queryRunner.query(
      `CREATE INDEX "idx_user_role_active" ON "users" ("role", "is_active")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_request_user_date" ON "requests" ("user_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_request_dept_status" ON "requests" ("department_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_request_item_name" ON "request_items" ("request_id", "item_name")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_approval_request_approver" ON "approval_logs" ("request_id", "approver_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notification_user_read" ON "notifications" ("user_id", "is_read")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notification_request_type" ON "notifications" ("request_id", "notification_type")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82f896dc1390d1a7ea3d0c3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_692a909ee0fa9383e7859f9b406"`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_logs" DROP CONSTRAINT "FK_1a0e2ea34b144bd708a610e5a64"`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_logs" DROP CONSTRAINT "FK_d3d0b509f1af81b2513e0c02d0c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "request_items" DROP CONSTRAINT "FK_06e46b80226e4c8c7f32ea5f5d5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "requests" DROP CONSTRAINT "FK_e8b4b7fb3b3b798b3d6e7a3c578"`,
    );
    await queryRunner.query(
      `ALTER TABLE "requests" DROP CONSTRAINT "FK_c4bd663a4be3a8b24bd0e9f5c5f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "approvers" DROP CONSTRAINT "FK_c36e739fb0d3f8f5439ed5d7f95"`,
    );
    await queryRunner.query(
      `ALTER TABLE "approvers" DROP CONSTRAINT "FK_a94a82f5bcce7b476fcc2b4cf5b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounts" DROP CONSTRAINT "FK_3aa23c0a6d107393e8b40e3e2a6"`,
    );

    // Drop indexes
    await queryRunner.query(
      `DROP INDEX "public"."idx_notification_request_type"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_notification_user_read"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_approval_request_approver"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_request_item_name"`);
    await queryRunner.query(`DROP INDEX "public"."idx_request_dept_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_request_user_date"`);
    await queryRunner.query(`DROP INDEX "public"."idx_user_role_active"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TABLE "approval_logs"`);
    await queryRunner.query(`DROP TABLE "request_items"`);
    await queryRunner.query(`DROP TABLE "requests"`);
    await queryRunner.query(`DROP TABLE "approvers"`);
    await queryRunner.query(`DROP TABLE "departments"`);
    await queryRunner.query(`DROP TABLE "accounts"`);
    await queryRunner.query(`DROP TABLE "users"`);

    // Drop enum types
    await queryRunner.query(
      `DROP TYPE "public"."notifications_notification_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."request_items_category_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."approval_logs_approval_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."requests_urgency_level_enum"`);
    await queryRunner.query(`DROP TYPE "public"."requests_status_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."approvers_approver_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}
