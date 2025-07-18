// src/models/Empleado.ts
import mongoose from "mongoose";

const EmpleadoSchema = new mongoose.Schema({
    nombre: String,
    apellido: String,
    dni: String,
    telefono: String,
    empresa: String,
    localidad: String,
    qrToken: String,
    activo: { type: Boolean, default: true },
    pais: String,
});

export const Empleado =
    mongoose.models.Empleado || mongoose.model("Empleado", EmpleadoSchema, "empleados");
