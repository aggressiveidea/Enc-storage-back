import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  PORT: z.coerce.number().default(8563),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  SECRET: z.string().min(1, "SECRET is required"),
  JWT_EXPIRES: z.string().default("7d"),
  FRONT_URL: z.string().default("http://localhost:5173"),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  EMAIL_HOST: z.string().default("smtp.gmail.com"),
  EMAIL_PORT: z.coerce.number().default(465),
  EMAIL_USER: z.string().default(""),
  EMAIL_PASS: z.string().default(""),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment variables:");
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }
  return result.data;
}

export const env = parseEnv();
