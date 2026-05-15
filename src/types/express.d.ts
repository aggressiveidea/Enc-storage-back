import type { AuthUser } from "./globals";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      correlationId: string;
    }
  }
}

export {};
