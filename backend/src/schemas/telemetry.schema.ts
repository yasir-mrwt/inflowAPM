import { z } from "zod";

export const MAX_TELEMETRY_BATCH_SIZE = 100;

const metadataSchema = z.record(z.string(), z.unknown()).default({});

//for user identity fields
const identityFields = {
  user_id: z.string().max(255).optional(),
  anonymous_id: z.string().max(255).optional(),
  email: z.email().optional(),
  ip: z.union([z.ipv4(), z.ipv6()]).optional(),
};

// HTTP request telemetry
const httpTelemetrySchema = z.object({
  type: z.literal("http"),

  route: z.string().startsWith("/"),

  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]),

  status: z.number().int().min(100).max(599),

  duration_ms: z.number().nonnegative(),

  metadata: metadataSchema,

  ...identityFields, //merging identity field

  occurred_at: z.iso.datetime(),
});

// Application/event telemetry
const eventTelemetrySchema = z.object({
  type: z.literal("event"),

  route: z.enum(["query", "error", "timeout"]),

  duration_ms: z.number().nonnegative().optional(),

  metadata: metadataSchema,

  ...identityFields,

  occurred_at: z.iso.datetime(),
});

//discriminatedUnion looks for the type and then apply that part validation specifically
export const telemetrySchemaData = z.discriminatedUnion("type", [
  httpTelemetrySchema,
  eventTelemetrySchema,
]);

//making all the events values to be in an array with minimum 1 value
export const telemetrySchema = z
  .array(telemetrySchemaData)
  .min(1, "Batch array cannot be empty")
  .max(
    MAX_TELEMETRY_BATCH_SIZE,
    `Batch cannot contain more than ${MAX_TELEMETRY_BATCH_SIZE} events`,
  );

export type TelemetrySchemaContract = z.infer<typeof telemetrySchema>;
