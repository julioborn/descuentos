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
        empresa: String,
        localidad: String,

        tipo: {
            type: String,
            enum: ['EMPLEADO', 'DOCENTE', 'POLICIA'],
            default: 'EMPLEADO',
            required: true,
        },

        qrToken: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        // 👮 control descarga QR
        qrDescargado: { type: Boolean, default: false },
        qrDescargadoAt: { type: Date },

        activo: { type: Boolean, default: true },

        pais: String,
    },
    { timestamps: true }
);

export const Empleado =
    mongoose.models.Empleado ||
    mongoose.model("Empleado", EmpleadoSchema, "empleados");