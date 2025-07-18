import mongoose, { Schema, model, models } from "mongoose";

const CargaSchema = new Schema(
    {
        nombreEmpleado: String,
        dniEmpleado: String,
        empresa: String,
        producto: String,
        litros: Number,
        precioUnitario: Number,
        precioFinal: Number,
        precioFinalSinDescuento: Number,
        porcentajeDescuento: Number,
        moneda: String,
        fecha: Date,
        localidad: String,
    },
    { timestamps: true }
);

export const Carga = models.Carga || model("Carga", CargaSchema);
