
import { Router } from "express";
import { TOTAL_DECIMALS, WORKER_JWT_SECRET } from "../config";
import { prismaClient } from "@repo/db/client"
import jwt from "jsonwebtoken"
import { workerMiddleware } from "../middleware";
import { getNextTask } from "../db";
import { createSubmissionInput } from "../types";
import { number } from "zod";

const router: Router = Router();

const TOTAL_SUBMISSION = 100;


//@ts-ignore
router.get("/payout", workerMiddleware, async (req, res) => {
    //@ts-ignore
    const userId: string = req.userId;
    const worker = await prismaClient.worker.findFirst({
        where: {
            id: Number(userId)
        }
    })

    if (!worker) {
        return res.status(403).json({
            message: "user not find"
        })
    }

    const address = worker?.address;

    // create a transaction


})

//@ts-ignore
router.get("/balance", workerMiddleware, async (req, res) => {
    //@ts-ignore
    const userId = req.userId;
    const worker = await prismaClient.worker.findFirst({
        where: {
            id: userId
        }
    })

    res.json({
        pendingAmount: worker?.pending_amount,
        lockedAmount: worker?.locked_amount
    })

})

//@ts-ignore
router.post("/submission", workerMiddleware, async (req, res) => {
    //@ts-ignore
    const userId = req.userId;
    const body = req.body;
    const parseData = createSubmissionInput.safeParse(body);
    if (parseData.success) {
        // Error handling : what if theres no next task
        const task = await getNextTask(Number(userId))

        if (!task || task?.id !== Number(parseData.data.taskId)) {
            return res.status(411).json({
                message: "incorrect task id"
            })
        }
        // parseData.data.amount 
        const amount = (Number(task.amount) / TOTAL_SUBMISSION).toString()

        const submission = await prismaClient.$transaction(async tx => {
            const submission = await tx.submission.create({
                data: {
                    option_id: Number(parseData.data.selection),
                    worker_id: userId,
                    task_id: Number(parseData.data.taskId),
                    amount: Number(amount)
                }
            })

            await tx.worker.update({
                where: {
                    id: userId,
                },
                data: {
                    pending_amount: {
                        increment: Number(amount)
                    }
                }
            })
            return submission;
        })


        const nextTask = await getNextTask(Number(userId))
        res.json({
            nextTask,
            amount
        })

    }
    else {
        res.status(411).json({
            message: "incorrect data"
        })
    }
})

//@ts-ignore
router.get("/nextTask", workerMiddleware, async (req, res) => {
    //@ts-ignore
    const userId: string = req.userId;

    const task = await getNextTask(Number(userId))

    if (!task) {
        res.status(411).json({
            message: "no more task left for you to review"
        })
    }
    else {
        res.json({
            task
        })
    }
}
)

router.post("/signin", async (req, res) => {
    const hardcodedWalletAddress = "AP62b4YmsNgMCPYJi6wGND4jn7Q7A6c682n8SdgKjGhu";

    const existingUser = await prismaClient.worker.findFirst({
        where: {
            address: hardcodedWalletAddress
        }
    })

    if (existingUser) {
        const token = jwt.sign({
            userId: existingUser.id
        }, WORKER_JWT_SECRET)

        res.json({
            token
        })
    } else {
        const user = await prismaClient.worker.create({
            data: {
                address: hardcodedWalletAddress,
                pending_amount: 0,
                locked_amount: 0
            }
        })
        const token = jwt.sign({
            userId: user.id
        }, WORKER_JWT_SECRET)

        res.json({
            token
        })
    }
});



export default router;