import mongoose from "mongoose";

const EmpleadoSchema = new mongoose.Schema({
    nombre: String,
    apellido: String,
    dni: String,
    telefono: String,
    empresa: String,
    qrToken: { type: String, unique: true },
    activo: { type: Boolean, default: true },
});

export const Empleado = mongoose.models.Empleado || mongoose.model("Empleado", EmpleadoSchema);
