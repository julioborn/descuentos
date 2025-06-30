// models/Empleado.ts
import mongoose, { Schema } from 'mongoose';

const EmpleadoSchema = new Schema({
    nombre: String,
    apellido: String,
    dni: String,
    telefono: String,
    empresa: String,
    qrToken: String,
    activo: { type: Boolean, default: true },
    pais: { type: String, enum: ['AR', 'PY'], required: true } // 👈 nuevo
});

export const Empleado = mongoose.models.Empleado ||
    mongoose.model('Empleado', EmpleadoSchema);
