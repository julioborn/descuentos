// src/models/Usuario.ts
import mongoose from "mongoose";

const UsuarioSchema = new mongoose.Schema({
    nombre: String,
    password: String,
    rol: String,
    moneda: { type: String, enum: ["Gs", "ARS"], required: true },
    localidad: { type: String, required: false }, 
});

export const Usuario =
    mongoose.models.Usuario || mongoose.model("Usuario", UsuarioSchema, "usuarios");
