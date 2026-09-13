import { z } from "zod";

export const googleCallbackSchema = z.object({
  code: z.string().trim().min(1, "code is required"),
  state: z.string().trim().min(1, "state is required"),
});

export type GoogleCallbackContract = z.infer<typeof googleCallbackSchema>;

//Oauth exchange code
export const oauthExchangeSchema = z.object({
  code: z.string().trim().min(1, "OAuth exchange code is required"),
});

export type OAuthExchangeContract = z.infer<typeof oauthExchangeSchema>;
