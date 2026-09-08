declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
      project?: {
        id: string;
        user_id: string;
      };
    }
  }
}
export {};
