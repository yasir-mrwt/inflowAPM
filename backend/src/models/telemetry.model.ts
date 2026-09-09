import pool from "../configs/db.js";
import type { TelemetrySchemaContract } from "../schemas/telemetry.schema.js";

// create telemetry events  model  -> function first for bulk insertion
export async function createTelemetryModel(
  project_id: string,
  events: TelemetrySchemaContract,
): Promise<void> {
  try {
    if (events.length === 0) return; //if no values passed return it

    const columnCount = 12; //the number or values we are working/inserting with 1 for project id and rest 7 other values
    const placeHolder: string[] = []; //empty spaces for the data
    const flatValues: unknown[] = []; //the actual data to be put onto the spaces created

    events.forEach((items, index) => {
      const currentOffset = index * columnCount;

      placeHolder.push(
        `($${currentOffset + 1},$${currentOffset + 2},$${currentOffset + 3},$${currentOffset + 4},
        $${currentOffset + 5},$${currentOffset + 6},$${currentOffset + 7},$${currentOffset + 8},
        $${currentOffset + 9},$${currentOffset + 10},$${currentOffset + 11},$${currentOffset + 12})`,
      );
      flatValues.push(
        project_id,
        items.type,
        items.route,
        items.type === "http" ? items.method : null,
        items.type === "http" ? items.status : null,
        items.duration_ms,
        items.metadata,
        items.user_id,
        items.anonymous_id,
        items.email,
        items.ip,
        items.occurred_at,
      );
    });
    const finalQuery = `insert into inflowapm.telemetry_events (project_id,type,route,method,status,duration_ms,metadata,user_id,anonymous_id,email,ip,occurred_at) values ${placeHolder.join(",")};`;
    await pool.query(finalQuery, flatValues);
  } catch (error: unknown) {
    console.log("error while creating telemetry event");
    throw error;
  }
}
