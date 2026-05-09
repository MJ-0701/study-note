import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required for Prisma/MySQL runtime persistence");
    }

    super({
      log:
        process.env.PRISMA_QUERY_LOG === "1"
          ? ["query", "warn", "error"]
          : ["warn", "error"]
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
