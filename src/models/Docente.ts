// models/Docente.ts
import mongoose, { Schema } from 'mongoose';

const DocenteSchema = new Schema({
    empleadoId: {
        type: Schema.Types.ObjectId,
        ref: 'Empleado',
        required: true,
        unique: true,
    },
    centrosEducativos: {
        type: [String], 
        required: true,
    }
}, { timestamps: true });

export default mongoose.models.Docente || mongoose.model('Docente', DocenteSchema);
