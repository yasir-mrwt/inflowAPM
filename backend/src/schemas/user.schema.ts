import { z } from "zod";

//zod shema for registering user
export const registerUserSchema = z.object({
  email: z
    .email("invalid email format")
    .trim()
    .max(100, "email cannot be greater than"),
  password: z
    .string()
    .trim()
    .min(5, "password cant be less than 5 characters")
    .max(100, "password cant be more than 100 characters"),
  first_name: z
    .string()
    .trim()
    .min(5, "first name cant be less than 5")
    .max(100, "first name cannt be more than 100 characters"),
  last_name: z
    .string()
    .trim()
    .min(5, "last name cant be less than 5")
    .max(100, "last name cannt be more than 100 characters"),
});
export type RegisterUserContract = z.infer<typeof registerUserSchema>;

//zod shema for logging in user
export const loginUserSchema = z.object({
  email: z
    .email("invalid email format")
    .trim()
    .max(100, "email cannot be greater than"),
  password: z
    .string()
    .trim()
    .min(5, "password cant be less than 5 characters")
    .max(100, "password cant be more than 100 characters"),
});
export type LoginUserContract = z.infer<typeof loginUserSchema>;

//zod shema for refresh token to get new access token for user
export const refreshTokenSchema = z.object({
  refresh_token: z
    .string()
    .trim()
    .min(24, "refresh token cant be less than 24 characters"),
});
export type RefreshTokenContract = z.infer<typeof refreshTokenSchema>;

//zod shema forgot password
export const forgotPasswordSchema = z.object({
  email: z
    .email("invalid email format")
    .trim()
    .max(100, "email cannot be greater than"),
});
export type ForgotPasswordContract = z.infer<typeof forgotPasswordSchema>;

//reset password zod schema
export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100),
});
export type ResetPasswordContract = z.infer<typeof resetPasswordSchema>;
