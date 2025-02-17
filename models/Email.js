import mongoose from "mongoose"

const EmailSchema = new mongoose.Schema(
  {
    recipients: { type: [String], required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    status: { type: String, enum: ["send", "failed"], required: true },
    attachments: [
      {
        filename: { type: String },
        content: { type: mongoose.Schema.Types.Mixed },
        path: { type: String, required: true },
        contentType: { type: String },
        encoding: { type: String },
        headers: { type: mongoose.Schema.Types.Mixed },
        cid: { type: String },
      },
    ],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

const Email = mongoose.model("Email", EmailSchema)

export default Email

