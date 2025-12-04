import 'express-serve-static-core';

declare module 'express-serve-static-core' {
    interface Request {
        sessionToken?: string;
        session?: {
            accountId: number;
            userId: number;
            backToUrl?: string;
            shortLivedToken?: string;
            [key: string]: any;
        };
        kdimsAuthData?: {
            accountId: number;
        };
    }
}
