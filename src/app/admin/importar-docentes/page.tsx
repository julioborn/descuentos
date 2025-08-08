'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'
import QRCode from 'qrcode'
import html2canvas from 'html2canvas'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

type Docente = {
    nombre: string
    apellido: string
    dni: string
    telefono: string
    empresa: string
    localidad: string
    centrosEducativos: string[]
    qrUrl: string
}

export default function ImportarDocentes() {
    const [docentes, setDocentes] = useState<Docente[]>([])
    const [loading, setLoading] = useState(false)

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        console.log('Archivo seleccionado');
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);

        const data = await file.arrayBuffer();
        const wb = XLSX.read(data);
        const hoja = wb.Sheets[wb.SheetNames[0]];
        const filas = XLSX.utils.sheet_to_json<any>(hoja, { defval: '' });

        console.log('Filas:', filas);

        const lista: Docente[] = [];

        for (const fila of filas) {
            const token = crypto.randomUUID();
            const dni = fila.dni.toString();
            const centrosArray: string[] = (fila.centroEducativo || '')
                .split(',')
                .map((c: string) => c.trim())
                .filter((c: string) => c.length > 0);

            try {
                const empleadosExistRes = await fetch('/api/empleados');
                const empleadosExist = await empleadosExistRes.json();
                const yaExiste = empleadosExist.find((emp: any) => emp.dni === dni);

                let empleadoId: string;
                let qrUrl: string;
                let mostrarTarjeta = true;

                if (yaExiste) {
                    console.log('Empleado ya existe:', yaExiste);

                    const docenteExistRes = await fetch(`/api/docentes?empleadoId=${yaExiste._id}`);
                    const docenteExist = await docenteExistRes.json();

                    if (docenteExist && Array.isArray(docenteExist.centrosEducativos)) {
                        const centrosSet = new Set([
                            ...docenteExist.centrosEducativos,
                            ...centrosArray,
                        ]);
                        const centrosActualizados = Array.from(centrosSet);

                        // Actualizar solo si hay centros nuevos
                        const yaEstabanTodos = centrosArray.every((centro) =>
                            docenteExist.centrosEducativos.includes(centro)
                        );

                        if (!yaEstabanTodos) {
                            const updateDocenteRes = await fetch(`/api/docentes/${docenteExist._id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ centrosEducativos: centrosActualizados }),
                            });

                            if (!updateDocenteRes.ok)
                                throw new Error('Error actualizando docente');
                        }

                        mostrarTarjeta = false; // 🔒 Nunca mostrar tarjeta si ya existía
                    } else {
                        // Si no tenía docente asociado, se lo crea
                        const docenteRes = await fetch('/api/docentes', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                empleadoId: yaExiste._id,
                                centrosEducativos: centrosArray,
                            }),
                        });

                        if (!docenteRes.ok) throw new Error('Error creando docente');

                        mostrarTarjeta = false; // 🔒 Incluso si se creó docente, no mostrar tarjeta si empleado ya existía
                    }

                    qrUrl = await QRCode.toDataURL(
                        `${window.location.origin}/playero?token=${yaExiste.qrToken}`
                    );
                    empleadoId = yaExiste._id;
                } else {
                    // Crear nuevo empleado y docente
                    const empleadoRes = await fetch('/api/empleados', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            nombre: fila.nombre,
                            apellido: fila.apellido,
                            dni,
                            telefono: fila.telefono.toString(),
                            empresa: fila.empresa,
                            localidad: fila.localidad,
                            qrToken: token,
                            pais: 'AR',
                        }),
                    });

                    if (!empleadoRes.ok) throw new Error('Error creando empleado');

                    const empleadoCreado = await empleadoRes.json();

                    const docenteRes = await fetch('/api/docentes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            empleadoId: empleadoCreado._id,
                            centrosEducativos: centrosArray,
                        }),
                    });

                    if (!docenteRes.ok) throw new Error('Error creando docente');

                    qrUrl = await QRCode.toDataURL(
                        `${window.location.origin}/playero?token=${token}`
                    );

                    empleadoId = empleadoCreado._id;
                    mostrarTarjeta = true; // ✅ Solo en este caso se muestra tarjeta
                }

                if (mostrarTarjeta) {
                    lista.push({
                        nombre: fila.nombre,
                        apellido: fila.apellido,
                        dni,
                        telefono: fila.telefono.toString(),
                        empresa: fila.empresa,
                        localidad: fila.localidad,
                        centrosEducativos: centrosArray,
                        qrUrl,
                    });
                }
            } catch (err) {
                console.error('❌ Error al procesar fila:', fila, err);
            }
        }

        setDocentes(lista);
        setLoading(false);
    };

    const generarTarjeta = async (idx: number) => {
        const nodo = document.getElementById(`tarjeta-docente-${idx}`)
        if (!nodo) return { blob: null, nombreArchivo: '' }

        const boton = nodo.querySelector('button') as HTMLElement
        if (boton) boton.style.display = 'none'

        const canvas = await html2canvas(nodo as HTMLElement, { scale: 2 })

        if (boton) boton.style.display = ''

        const blob = await new Promise<Blob | null>((ok) =>
            canvas.toBlob(ok, 'image/png', 1)
        )

        const docente = docentes[idx]
        const nombreArchivo = `qr-${docente.dni}.png`

        return { blob, nombreArchivo }
    }

    const descargarTarjeta = async (idx: number) => {
        const { blob, nombreArchivo } = await generarTarjeta(idx)
        if (blob) saveAs(blob, nombreArchivo)
    }

    const descargarTodas = async () => {
        if (!docentes.length) return

        setLoading(true)
        const zip = new JSZip()

        for (let i = 0; i < docentes.length; i++) {
            const { blob, nombreArchivo } = await generarTarjeta(i)
            if (blob) zip.file(nombreArchivo, blob)
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' })
        saveAs(zipBlob, 'tarjetas-docentes.zip')
        setLoading(false)
    }

    return (
        <main className="min-h-screen p-6 bg-gray-900 text-white">
            <h1 className="text-3xl font-bold mb-6 text-center">Carga Masiva de Docentes</h1>

            <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFile}
                className="mb-6 block mx-auto"
            />

            {loading && (
                <p className="text-center text-lg font-semibold">
                    Procesando, por favor esperá…
                </p>
            )}

            {docentes.length > 0 && (
                <button
                    onClick={descargarTodas}
                    className="mx-auto mb-8 block bg-green-700 hover:bg-green-800 px-6 py-3 rounded font-semibold"
                >
                    Descargar TODAS en ZIP
                </button>
            )}

            <div className="flex flex-wrap gap-6 justify-center">
                {docentes.map((d, idx) => (
                    <div
                        key={idx}
                        id={`tarjeta-docente-${idx}`}
                        className="bg-white text-black p-4 rounded shadow-lg w-[280px] space-y-3 relative"
                    >
                        <div className="flex justify-center">
                            <img src="/idescuentos.png" alt="Logo" className="h-16" />
                        </div>

                        <div className="flex justify-center">
                            <img src={d.qrUrl} alt="QR Code" className="w-48 h-48" />
                        </div>

                        <div className="text-center text-sm">
                            <strong>{d.nombre} {d.apellido}</strong>
                        </div>

                        <button
                            onClick={() => descargarTarjeta(idx)}
                            className="mt-2 w-full bg-blue-700 hover:bg-blue-800 text-white py-2 rounded"
                        >
                            Descargar Tarjeta
                        </button>
                    </div>
                ))}
            </div>
        </main>
    )
}
