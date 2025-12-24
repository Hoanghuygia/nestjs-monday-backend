import 'express-serve-static-core';
import { Session, SessionData } from 'express-session';

declare module 'express-serve-static-core' {
    interface Request {
        session: Session & Partial<SessionData>;
        sessionToken?: string;
        kdimsAuthData?: {
            accountId: number;
        };
    }
}
