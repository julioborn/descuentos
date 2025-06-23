// models/Descuento.ts
import mongoose, { Schema } from "mongoose";

const DescuentoSchema = new Schema({
    empresa: { type: String, required: true, unique: true }, // Ej: "IROSSINI"
    porcentaje: { type: Number, required: true }, // Ej: 4 = 4%
});

export const Descuento = mongoose.models.Descuento || mongoose.model("Descuento", DescuentoSchema);
