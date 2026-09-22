declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        status: string;
      };
      project?: {
        id: string;
        user_id: string;
        status: string;
        owner_status: string;
      };
    }
  }
}
export {};
