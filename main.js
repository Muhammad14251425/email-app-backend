import express from "express"
import cors from "cors"
import mongoose from "mongoose"
import dotenv from "dotenv"
// import { getGmailTransporter } from "./gmailAuth.js"
import Email from "./models/Email.js"
import { getGmailTransporter } from "./gmailAuth.js"

dotenv.config()

const app = express()
const port = process.env.PORT || 5000

// Middleware
app.use(
    cors({
        origin: process.env.FRONTEND_URL,
        credentials: true,
    }),
)
app.use(express.json())

// Database connection
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err))

const BATCH_SIZE = 100

async function sendBatch(transporter, emailData, batch) {
    try {
        const info = await transporter.sendMail({
            from: process.env.GOOGLE_USER_EMAIL,
            bcc: batch.join(", "),
            subject: emailData.subject,
            html: emailData.content,
            attachments: emailData.attachments?.map((attachment) => ({
                filename: attachment.filename,
                path: attachment.path,
            })),
        })

        console.log("Batch sent:", info.messageId)
        return { success: true, recipients: batch }
    } catch (error) {
        console.error("Failed to send batch:", error)
        return { success: false, recipients: batch }
    }
}

app.post("/send-email", async (req, res) => {
    const { emailData, tokens } = req.body
    console.log("Called")
    console.log(emailData)
    console.log(tokens)
    let transporter
    try {
        transporter = await getGmailTransporter({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
        })
    } catch (error) {
        console.error("Failed to create Gmail transporter:", error)
        return res.status(500).json({
            success: false,
            message: "Failed to initialize email service. Please try again later.",
            recipients: [],
        })
    }

    const { recipients, subject, content, attachments } = emailData
    const totalBatches = Math.ceil(recipients.length / BATCH_SIZE)
    const sentRecipients = []
    let emailStatus = "send"

    try {
        for (let i = 0; i < totalBatches; i++) {
            const start = i * BATCH_SIZE
            const end = start + BATCH_SIZE
            const batch = recipients.slice(start, end)

            const batchResult = await sendBatch(transporter, emailData, batch)
            sentRecipients.push(...batchResult.recipients)

            if (!batchResult.success) {
                emailStatus = "failed"
            }

            if (i < totalBatches - 1) {
                await new Promise((resolve) => setTimeout(resolve, 1000))
            }
        }

        console.log(`Email ${emailStatus} to ${sentRecipients.length} recipients`)

        await Email.create({
            recipients,
            subject,
            body: content,
            status: emailStatus,
            attachments,
        })

        res.json({
            success: true,
            message: `Email ${emailStatus} to ${sentRecipients.length} recipients`,
            recipients: sentRecipients,
        })
    } catch (error) {
        console.error("Error sending email:", error)
        emailStatus = "failed"

        await Email.create({
            recipients,
            subject,
            body: content,
            status: emailStatus,
            attachments,
        })

        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to send email",
            recipients: sentRecipients,
        })
    }
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
})

