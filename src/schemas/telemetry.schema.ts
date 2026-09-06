import { z } from "zod";

const metadataSchema = z.record(z.string(), z.unknown()).default({});

// HTTP request telemetry

const httpTelemetrySchema = z.object({
  type: z.literal("http"),

  route: z.string().startsWith("/"),

  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]),

  status: z.number().int().min(100).max(599),

  duration_ms: z.number().nonnegative(),

  metadata: metadataSchema,

  occurred_at: z.iso.datetime(),
});

// Application/event telemetry

const eventTelemetrySchema = z.object({
  type: z.literal("event"),

  route: z.enum(["query", "error", "timeout"]),

  duration_ms: z.number().nonnegative().optional(),

  metadata: metadataSchema,

  occurred_at: z.iso.datetime(),
});

//discriminatedUnion looks for the type and then apply that part validation specifically
export const telemetrySchemaData = z.discriminatedUnion("type", [
  httpTelemetrySchema,
  eventTelemetrySchema,
]);
export const telemetrySchema = z
  .array(telemetrySchemaData)
  .min(1, "Batch array cannot be empty");

export type TelemetrySchemaContract = z.infer<typeof telemetrySchema>;
