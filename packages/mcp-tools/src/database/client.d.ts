import { PrismaClient } from '@prisma/client';
export declare const prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export default prisma;
export declare function connectDatabase(): Promise<boolean>;
export declare function disconnectDatabase(): Promise<void>;
export declare function checkDatabaseHealth(): Promise<{
    status: string;
    timestamp: string;
    error?: undefined;
} | {
    status: string;
    error: string;
    timestamp: string;
}>;
//# sourceMappingURL=client.d.ts.map