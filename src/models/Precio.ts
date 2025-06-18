import mongoose from "mongoose";

const PrecioSchema = new mongoose.Schema({
    producto: { type: String, unique: true },
    precioPorLitro: Number,
});

export const Precio = mongoose.models.Precio || mongoose.model("Precio", PrecioSchema);
