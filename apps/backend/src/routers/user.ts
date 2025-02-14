
import { response, Router, text } from "express";
import { prismaClient } from "@repo/db/client"
import jwt from "jsonwebtoken"
import { authMiddleware } from "../middleware"

import { JWT_SECRET, TOTAL_DECIMALS } from "../config";
import { createTaskInput } from "../types";
import { PutObjectCommand, S3Client, } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post"
import { getSignedUrl, } from "@aws-sdk/s3-request-presigner";
const DEFAULT_TITLE = "Select the most clickable thumbnail"


const router: Router = Router();

const client = new S3Client({
    credentials: {
        accessKeyId: process.env.ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.ACCESS_SECRET ?? "",
    },
    region: "eu-north-1"
});


//@ts-ignore
router.get("/presignedUrl", authMiddleware, async (req, res) => {
    //@ts-ignore
    const userId = req.userId

    const { url, fields } = await createPresignedPost(client, {
        Bucket: "decentralized-data-labelingg",
        Key: `web3saas/${userId}/${Math.random()}/image.jpg`,
        Conditions: [
            ['content-length-range', 0, 5 * 1024 * 1024] //5 mb limit
        ],
        Expires: 3600
    })

    res.json({
        preSignedUrl: url,
        fields
    })

})

//@ts-ignore
router.get("/task", authMiddleware, async (req, res) => {
    //@ts-ignore
    const taskId: string = req.query.taskId;
    //@ts-ignore
    const userId: string = req.userId;
    const taskDetails = await prismaClient.task.findFirst({
        where: {
            user_id: Number(userId),
            id: Number(taskId)
        },
        include: {
            options: true
        }
    })

    if (!taskDetails) {
        return res.status(411).json({
            message: "you dont have access to this task"
        })
    }
    //make this faster
    const responses = await prismaClient.submission.findMany({
        where: {
            task_id: Number(taskId)
        },
        include: {
            option: true
        }
    });
    const result: Record<string, {
        count: number;
        option: {
            imageUrl: string
        }
    }> = {};

    taskDetails.options.forEach(option => {
        result[option.id] = {
            count: 0,
            option: {
                imageUrl: option.image_url
            }
        }
    })

    responses.forEach(r => {
        result[r.option_id]!.count++;
    });

    res.json({
        result,
        taskDetails
    })


})

//@ts-ignore
router.post("/task", authMiddleware, async (req, res) => {

    //@ts-ignore
    const userId = req.userId;

    const parseData = createTaskInput.safeParse(req.body)
    console.log(req.body)

    if (!parseData.success) {
        return res.status(411).json({
            message: "You've sent wrong input"
        })
    }

    const response = await prismaClient.$transaction(async tx => {
        const response = await tx.task.create({
            data: {
                title: parseData.data.title ?? DEFAULT_TITLE,
                amount: 1 * TOTAL_DECIMALS,
                signature: parseData.data.signature,
                user_id: userId
            }
        });

        await tx.option.createMany({
            data: parseData.data.options.map(x => ({
                image_url: x.imageUrl,
                task_id: response.id
            }))
        })
        return response;

    })
    res.json({
        id: response.id
    })
})


router.post("/signin", async (req, res) => {
    const hardcodedWalletAddress = "AP62b4YmsNgMCPYJi6wGND4jn7Q7A6c682n8SdgKjGhu";

    const existingUser = await prismaClient.user.findFirst({
        where: {
            address: hardcodedWalletAddress
        }
    })

    if (existingUser) {
        const token = jwt.sign({
            userId: existingUser.id
        }, JWT_SECRET)

        res.json({
            token
        })
    } else {
        const user = await prismaClient.user.create({
            data: {
                address: hardcodedWalletAddress
            }
        })
        const token = jwt.sign({
            userId: user.id
        }, JWT_SECRET)

        res.json({
            token
        })
    }
});

export default router;