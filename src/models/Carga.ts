import mongoose, { Schema, model, models } from "mongoose";

const cargaSchema = new Schema({
    nombreEmpleado: String,
    dniEmpleado: String,
    producto: String,
    litros: Number,
    precioFinal: Number,
    fecha: String,
});

export const Carga = models.Carga || model("Carga", cargaSchema);
