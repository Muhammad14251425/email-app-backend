import express from "express"
import pkg from "whatsapp-web.js";
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from "qrcode-terminal"

const app = express();
const port = 3001;

// Initialize WhatsApp Web Client
const client = new Client({
    authStrategy: new LocalAuth(),
});

client.on("qr", (qr) => {
    console.log("Scan this QR code to log in:");
    qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
    console.log("WhatsApp Web Client is ready!");
});

app.use(express.json());

// Start Express server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

// Initialize WhatsApp Client
client.initialize();

app.get("/", (req, res) => {
    res.json({ message: "Working" })
})

// API to send WhatsApp message
app.post("/send-message", async (req, res) => {
    let { number, message } = req.body;

    if (!number || !message) {
        return res.status(400).json({ error: "Number and message are required" });
    }

    // Convert Pakistani number format (03001234567 → 923001234567)
    if (number.startsWith("0")) {
        number = "92" + number.substring(1);
    }

    const chatId = `${number}@c.us`;

    try {
        await client.sendMessage(chatId, message);
        res.status(200).json({ success: true, message: "Message sent successfully!" });
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ error: "Failed to send message" });
    }
});

app.post("/send-image", async (req, res) => {
    let { number, message, imageUrl } = req.body;

    if (!number || !message || !imageUrl) {
        return res.status(400).json({ error: "Number, message, and imageUrl are required" });
    }

    if (number.startsWith("0")) {
        number = "92" + number.substring(1); // Convert Pakistani number format
    }

    const chatId = `${number}@c.us`;

    try {
        const media = await MessageMedia.fromUrl(imageUrl);
        await client.sendMessage(chatId, media, { caption: message });

        res.status(200).json({ success: true, message: "Image sent successfully!" });
    } catch (error) {
        console.error("Error sending image:", error);
        res.status(500).json({ error: "Failed to send image" });
    }
});


app.post("/send-base64-image", async (req, res) => {
    let { number, message, base64, mimeType } = req.body;

    if (!number || !message || !base64 || !mimeType) {
        return res.status(400).json({ error: "Number, message, base64, and mimeType are required" });
    }

    // Convert phone number format (03001234567 → 923001234567)
    if (number.startsWith("0")) {
        number = "92" + number.substring(1);
    }

    const chatId = `${number}@c.us`;
    console.log(`Sending base64 image to: ${chatId}`);

    try {
        // Convert Base64 to MessageMedia
        const media = new MessageMedia(mimeType, base64);

        // Send message with image
        await client.sendMessage(chatId, media, { caption: message });

        res.status(200).json({ success: true, message: "Base64 image sent successfully!" });
    } catch (error) {
        console.error("Error sending base64 image:", error);
        res.status(500).json({ error: "Failed to send base64 image" });
    }
});

app.post("/send-multiple-messages-with-text-message", async (req, res) => {
    let { number, message, imageUrls } = req.body;

    if (!number || !message || !Array.isArray(imageUrls) || imageUrls.length === 0) {
        return res.status(400).json({ error: "Number, message, and at least one image URL are required" });
    }

    if (number.startsWith("0")) {
        number = "92" + number.substring(1); // Convert Pakistani number format
    }

    const chatId = `${number}@c.us`;

    try {
        // Send each image one by one
        await client.sendMessage(chatId, message);

        for (const imageUrl of imageUrls) {
            try {
                const media = await MessageMedia.fromUrl(imageUrl);
                await client.sendMessage(chatId, media);
            } catch (imageError) {
                console.error(`Failed to send image: ${imageUrl}`, imageError);
            }
        }

        res.status(200).json({ success: true, message: "Images sent successfully!" });
    } catch (error) {
        console.error("Error sending images:", error);
        res.status(500).json({ error: "Failed to send images" });
    }
})

