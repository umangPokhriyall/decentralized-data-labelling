import { PrismaClient } from "@prisma/client";

export const prismaClient = new PrismaClient().$transaction(
    async (prisma) => {
        // Code running in a transaction...
    },
    {
        maxWait: 5000, // default: 2000
        timeout: 10000, // default: 5000
    }
)
    ;