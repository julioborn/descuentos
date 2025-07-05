// models/Descuento.ts
import mongoose, { Schema } from "mongoose";

const DescuentoSchema = new Schema({
    empresa: { type: String, required: true, unique: true },
    porcentaje: { type: Number, required: true },
    pais: { type: String, enum: ['arg', 'py'], required: true }, 
});

export const Descuento =
    mongoose.models.Descuento || mongoose.model("Descuento", DescuentoSchema);
