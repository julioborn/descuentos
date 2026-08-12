// models/Descuento.ts
import mongoose, { Schema } from "mongoose";

const DescuentoSchema = new Schema({
    empresa: { type: String, required: true, unique: true },
    porcentaje: { type: Number, required: true },
    pais: { type: String, enum: ['arg', 'py'], required: true },
    // Solo se usa para empresas con QR de doble proposito (ej. INDIECITO):
    // true = la pagina publica muestra el descuento vigente,
    // false = muestra info general de la empresa en su lugar.
    promoActiva: { type: Boolean, default: true },
});

export const Descuento =
    mongoose.models.Descuento || mongoose.model("Descuento", DescuentoSchema);
