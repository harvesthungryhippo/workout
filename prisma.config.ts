import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: process.env["DATABASE_URL"],
    // DIRECT_URL = direct Supabase connection (port 5432) used for migrations
    // DATABASE_URL = Transaction mode pooler (port 6543) used for runtime
    ...(process.env["DIRECT_URL"] && { directUrl: process.env["DIRECT_URL"] }),
  },
});
