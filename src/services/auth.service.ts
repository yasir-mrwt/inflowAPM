import { config } from "../configs/env.js";
import jwt from "jsonwebtoken";
export async function generateAccessToken(id: string, email: string) {
  try {
    const token = jwt.sign({ id, email }, config.access_token || "", {
      expiresIn: "15m",
    });
    return token;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.log("error while generating access token", error);
    }
    throw error;
  }
}

export async function generateRefreshToken(id: string) {
  try {
    const token = jwt.sign({ id }, config.refresh_token || "", {
      expiresIn: "7d",
    });
    return token;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.log("error while generating refresh token", error);
    }
    throw error;
  }
}
