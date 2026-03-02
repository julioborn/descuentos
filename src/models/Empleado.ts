import mongoose from "mongoose";

const EmpleadoSchema = new mongoose.Schema(
    {
        nombre: { type: String, required: true },
        apellido: { type: String, required: true },

        dni: {
            type: String,
            required: true,
            index: true,
        },
        pais: {
            type: String,
            required: true,
            index: true,
        },

        telefono: String,

        // 👈 macro categoría
        // EMPLEADO | DOCENTE | POLICIA
        empresa: {
            type: String,
            required: true,
            index: true,
        },

        // 👈 sub categoría (policías / docentes)
        subcategoria: {
            type: String,
            index: true,
        },

        localidad: String,

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

    },
    { timestamps: true }
);

EmpleadoSchema.index({ dni: 1, pais: 1 }, { unique: true });

export const Empleado =
    mongoose.models.Empleado ||
    mongoose.model("Empleado", EmpleadoSchema, "empleados");