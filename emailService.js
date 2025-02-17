
import { getGmailTransporter, getAuthUrl } from "./gmailAuth"
import { Email } from "./models/Email"

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

async function sendEmail(emailData, req) {
    if (!emailData.recipients || emailData.recipients.length === 0) {
        return {
            success: false,
            message: "Recipients are missing",
            recipients: [],
        }
    }

    const accessToken = req.cookies["gmail_access_token"]
    const refreshToken = req.cookies["gmail_refresh_token"]

    if (!accessToken || !refreshToken) {
        console.log("No tokens found, starting OAuth flow")
        try {
            const authUrl = getAuthUrl()
            console.log("Auth URL generated:", authUrl)
            return {
                success: false,
                message: "Authentication required",
                authUrl: authUrl,
            }
        } catch (error) {
            console.error("Error generating auth URL:", error)
            return {
                success: false,
                message: "Failed to initialize authentication. Please check server logs.",
                recipients: [],
            }
        }
    }

    let transporter
    try {
        transporter = await getGmailTransporter({
            access_token: accessToken,
            refresh_token: refreshToken,
        })
    } catch (error) {
        console.error("Failed to create Gmail transporter:", error)
        return {
            success: false,
            message: "Failed to initialize email service. Please try again later.",
            recipients: [],
        }
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

        return {
            success: true,
            message: `Email ${emailStatus} to ${sentRecipients.length} recipients`,
            recipients: sentRecipients,
        }
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

        return {
            success: false,
            message: error instanceof Error ? error.message : "Failed to send email",
            recipients: sentRecipients,
        }
    }
}

module.exports = { sendEmail }

