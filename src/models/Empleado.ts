import mongoose from "mongoose";

const EmpleadoSchema = new mongoose.Schema(
    {
        nombre: { type: String, required: true },
        apellido: { type: String, required: true },

        dni: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        telefono: String,

        // 👈 CLAVE PARA TODO EL SISTEMA
        // EMPLEADO | DOCENTE | POLICIA
        empresa: {
            type: String,
            required: true,
            index: true,
        },

        localidad: String,

        qrToken: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        // 👮 control descarga QR (policías)
        qrDescargado: { type: Boolean, default: false },
        qrDescargadoAt: { type: Date },

        // 🚫 baja lógica
        activo: { type: Boolean, default: true },

        pais: String,
    },
    { timestamps: true }
);

export const Empleado =
    mongoose.models.Empleado ||
    mongoose.model("Empleado", EmpleadoSchema, "empleados");