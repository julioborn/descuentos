// src/models/Precio.ts
import mongoose from "mongoose";

const PrecioSchema = new mongoose.Schema({
    producto: { type: String, required: true },
    precio: { type: Number, required: true },
    moneda: { type: String, required: true },
});

export const Precio = mongoose.models.Precio || mongoose.model("Precio", PrecioSchema);
