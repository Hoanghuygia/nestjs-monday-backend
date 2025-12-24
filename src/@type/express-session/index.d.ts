import "express-session";

declare module "express-session" {
  interface SessionData {
    accountId: number;
    userId: number;
    backToUrl?: string;
    shortLivedToken?: string;
    
    [key: string]: any;
  }
}
