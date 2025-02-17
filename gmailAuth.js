import { google } from "googleapis"
import nodemailer from "nodemailer"

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
)

const SCOPES = ["https://mail.google.com/"]

export function getAuthUrl() {
    console.log("getAuthUrl called")
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
        throw new Error("Missing required environment variables for OAuth2")
    }

    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
    })

    console.log("Generated Auth URL:", url)
    return url
}

export async function getTokens(code) {
    const { tokens } = await oauth2Client.getToken(code)
    return tokens
}

export async function getGmailTransporter(tokens) {
    oauth2Client.setCredentials(tokens)

    const accessToken = await new Promise((resolve, reject) => {
        oauth2Client.getAccessToken((err, token) => {
            if (err) {
                console.error("Error getting access token:", err)
                reject(new Error("Failed to create access token"))
            } else if (!token) {
                reject(new Error("No access token returned"))
            } else {
                resolve(token)
            }
        })
    })

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            type: "OAuth2",
            user: process.env.GOOGLE_USER_EMAIL,
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            refreshToken: tokens.refresh_token,
            accessToken: accessToken,
        },
    })

    return transporter
}


