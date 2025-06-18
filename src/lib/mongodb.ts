import mongoose from 'mongoose';

export async function connectMongoDB() {
    if (mongoose.connection.readyState >= 1) return;

    try {
        await mongoose.connect(process.env.MONGODB_URI!);
        console.log("🟢 Conectado a MongoDB");
    } catch (error) {
        console.error("🔴 Error conectando a MongoDB:", error);
    }
}
