// src/models/Producto.ts
import mongoose, { Schema, models } from "mongoose";

const ProductoSchema = new Schema({
    nombre: { type: String, required: true, unique: true },
    precio: { type: Number, required: true },
    moneda: { type: String, enum: ["ARS", "Gs"], required: true },
});

export const Producto = models.Producto || mongoose.model("Producto", ProductoSchema);
