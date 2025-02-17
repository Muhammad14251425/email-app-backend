import mongoose from "mongoose"

// if (!process.env.MONGODB_URI) {
//   throw new Error("Please define the MONGODB_URI environment variable inside .env")
// }

const MONGODB_URI: string = "mongodb+srv://muhammadfawwad88:fawwad123@cluster0.5k3px.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
const globalWithMongoose = global as typeof globalThis & {
  mongoose: {
    conn: typeof mongoose | null
    promise: Promise<typeof mongoose> | null
  }
}

let cached = globalWithMongoose.mongoose

if (!cached) {
  cached = globalWithMongoose.mongoose = { conn: null, promise: null }
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    }

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}

export default dbConnect

