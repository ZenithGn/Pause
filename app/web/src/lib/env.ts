import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .trim()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .trim()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
});

const serverSecretsSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .trim()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  CLOUDINARY_CLOUD_NAME: z
    .string()
    .trim()
    .min(1, "CLOUDINARY_CLOUD_NAME is required"),
  CLOUDINARY_API_KEY: z
    .string()
    .trim()
    .min(1, "CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET: z
    .string()
    .trim()
    .min(1, "CLOUDINARY_API_SECRET is required"),
  USE_MOCK_ADMIN_DATA: z.enum(["true", "false"]).optional().default("false"),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerSecretsEnv = z.infer<typeof serverSecretsSchema>;

/**
 * Returns true ONLY when USE_MOCK_ADMIN_DATA is explicitly set to "true" on the server.
 */
export function isMockAdminMode(): boolean {
  if (typeof window !== "undefined") {
    return false;
  }
  return process.env.USE_MOCK_ADMIN_DATA === "true";
}

/**
 * Validates and returns public Supabase credentials.
 * Safe to import anywhere; throws lazily when called at runtime without required vars.
 */
export function getPublicEnv(): PublicEnv {
  // Static property access is required so Next.js inlines NEXT_PUBLIC_* on the client bundle.
  const raw = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };

  const parsed = publicEnvSchema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Missing or invalid public environment variables: ${details}`);
  }

  return parsed.data;
}

/**
 * Returns true if public Supabase credentials are configured and valid.
 */
export function hasPublicSupabaseEnv(): boolean {
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  return parsed.success;
}

function assertServerSide(): void {
  if (typeof window !== "undefined") {
    throw new Error("Server-only environment variables cannot be accessed in the browser.");
  }
}

/**
 * Validates and returns SUPABASE_SERVICE_ROLE_KEY on the server.
 */
export function getServiceRoleKey(): string {
  assertServerSide();
  const parsed = serverSecretsSchema.shape.SUPABASE_SERVICE_ROLE_KEY.safeParse(
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  if (!parsed.success) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in server environment.");
  }
  return parsed.data;
}

/**
 * Validates and returns server-only Cloudinary credentials.
 */
export function getCloudinaryEnv(): {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
} {
  assertServerSide();
  const parsed = z
    .object({
      CLOUDINARY_CLOUD_NAME: serverSecretsSchema.shape.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: serverSecretsSchema.shape.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: serverSecretsSchema.shape.CLOUDINARY_API_SECRET,
    })
    .safeParse({
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Missing or invalid Cloudinary environment variables: ${details}`);
  }

  return {
    cloudName: parsed.data.CLOUDINARY_CLOUD_NAME,
    apiKey: parsed.data.CLOUDINARY_API_KEY,
    apiSecret: parsed.data.CLOUDINARY_API_SECRET,
  };
}

/**
 * Full server environment validation helper (lazy runtime validation).
 */
export function getServerEnv(): PublicEnv & ServerSecretsEnv {
  assertServerSide();
  const pub = getPublicEnv();
  const sec = serverSecretsSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    USE_MOCK_ADMIN_DATA: process.env.USE_MOCK_ADMIN_DATA,
  });

  if (!sec.success) {
    const details = sec.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Missing or invalid server environment variables: ${details}`);
  }

  return {
    ...pub,
    ...sec.data,
  };
}
