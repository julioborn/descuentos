import mongoose from "mongoose";

const CargaSchema = new mongoose.Schema({
    nombreEmpleado: String,
    dniEmpleado: String,
    producto: String,
    litros: Number,
    precioUnitario: Number,
    precioFinal: Number, 
    precioFinalSinDescuento: Number, 
    porcentajeDescuento: Number,     
    moneda: String,
    fecha: Date,
});

export const Carga = mongoose.models.Carga || mongoose.model("Carga", CargaSchema);
