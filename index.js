import express from "express"
import pkg from "whatsapp-web.js";
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from "qrcode-terminal"

const app = express();
const port = 8080;

// Initialize WhatsApp Web Client
const client = new Client({
    authStrategy: new LocalAuth(),
});

let isClientReady = false;

client.on("qr", (qr) => {
    console.log("Scan this QR code to log in:");
    qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
    console.log("WhatsApp Web Client is ready!");
    isClientReady = true;
});

client.on("disconnected", (reason) => {
    console.log("WhatsApp disconnected:", reason);
    isClientReady = false;
    reconnectWhatsApp();
});

client.on("auth_failure", (msg) => {
    console.error("Auth failure:", msg);
    isClientReady = false;
    reconnectWhatsApp();
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


const reconnectWhatsApp = () => {
    console.log("Reconnecting...");
    client.destroy().then(() => {
        client.initialize();
    });
};


app.get("/chats", async (req, res) => {
    if (!isClientReady) {
        return res.status(500).json({ error: "WhatsApp client is not ready" });
    }

    try {
        const chats = await client.getChats();
        res.json({ chats });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch chats", details: error.message });
    }
});

// API to send WhatsApp message
app.post("/send-message", async (req, res) => {
    let { number, message } = req.body;

    if (!number || !message) {
        return res.status(400).json({ error: "Number and message are required" });
    }

    // Ensure number is a string
    number = String(number);

    // Convert Pakistani number format (e.g., 03001234567 → 923001234567)
    if (number.startsWith("0")) {
        number = "92" + number.substring(1);
    }

    // Ensure the number is in the correct format
    if (!/^\d{12}$/.test(number)) {
        return res.status(400).json({ error: "Invalid phone number format" });
    }

    const chatId = `${number}@c.us`;

    try {
        await client.sendMessage(chatId, message);
        res.status(200).json({ success: true, message: "Message sent successfully!" });
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ error: "Failed to send message", details: error.message });
    }
});


app.post("/check-number", async (req, res) => {
    let { number } = req.body;

    if (!number) {
        return res.status(400).json({ error: "Phone number is required" });
    }

    // Convert Pakistani number format (0345 → 92345)
    if (number.startsWith("0")) {
        number = "92" + number.substring(1);
    }

    if (!/^\d{12}$/.test(number)) {
        return res.status(400).json({ error: "Invalid phone number format" });
    }

    const chatId = `${number}@c.us`;

    try {
        const isRegistered = await client.isRegisteredUser(chatId);

        res.status(200).json({
            success: true,
            isRegistered,
            message: isRegistered
                ? "Number is registered on WhatsApp"
                : "Number is not on WhatsApp",
        });
    } catch (error) {
        console.error("Error checking number:", error);
        res.status(500).json({ error: "Failed to check WhatsApp registration" });
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

