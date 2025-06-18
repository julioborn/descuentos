// src/models/Usuario.ts
import mongoose from "mongoose";

const UsuarioSchema = new mongoose.Schema({
    username: String,
    password: String, // luego lo vamos a hashear
    role: String,     // "admin" o "playero"
});

export const Usuario = mongoose.models.Usuario || mongoose.model("Usuario", UsuarioSchema, 'usuarios');
