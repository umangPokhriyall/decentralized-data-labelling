import { prismaClient } from "@repo/db/client"

export const getNextTask = async (userId: number) => {

    const task = await prismaClient.task.findFirst({
        where: {
            done: false,
            Submission: {
                none: {
                    worker_id: userId,
                }
            }
        },
        select: {
            id: true,
            amount: true,
            title: true,
            options: true
        }
    })
    return task;
}