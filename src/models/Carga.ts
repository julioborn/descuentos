import mongoose from "mongoose";

const CargaSchema = new mongoose.Schema({
    empleadoId: mongoose.Schema.Types.ObjectId,
    nombreEmpleado: String,
    dniEmpleado: String,
    producto: String,
    litros: Number,
    precioFinal: Number,
    fecha: { type: Date, default: Date.now },
});

export const Carga = mongoose.models.Carga || mongoose.model("Carga", CargaSchema);
