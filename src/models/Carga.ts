import mongoose, { Schema } from "mongoose";

const CargaSchema = new Schema({
    nombreEmpleado: { type: String, required: true },
    dniEmpleado: { type: String, required: true },
    empresa: { type: String, required: true }, 
    producto: { type: String, required: true },
    litros: { type: Number, required: true },
    precioUnitario: { type: Number, required: true },
    precioFinal: { type: Number, required: true },
    precioFinalSinDescuento: Number,
    porcentajeDescuento: Number,
    moneda: { type: String, enum: ["ARS", "Gs"], required: true },
    fecha: { type: Date, default: Date.now },
});

export const Carga =
    mongoose.models.Carga || mongoose.model("Carga", CargaSchema);

