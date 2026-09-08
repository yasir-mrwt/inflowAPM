import { QueryResult } from "pg";
import pool from "../configs/db.js";

export interface CreateTelemetyEvent {
  type: string;
  route: string;
  method: string;
  status: string;
  duration_ms: number;
  metadata: string;
  user_id: string;
  anonymous_id: string;
  email: string;
  ip: string;
  occurred_at: Date;
}

// create telemetry events  model  -> function first for bulk insertion
export async function createTelemetryModel(
  project_id: string,
  events: any[],
): Promise<void> {
  try {
    if (events.length === 0) return; //if no values passed return it

    const columnCount = 12; //the number or values we are working/inserting with 1 for project id and rest 7 other values
    const placeHolder: any[] = []; //empty spaces for the data
    const flatValues: any[] = []; //the actual data to be put onto the spaces created

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
        items.method,
        items.status,
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
