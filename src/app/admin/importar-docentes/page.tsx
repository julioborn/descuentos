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
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);

        // 1) Leer Excel
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data);
        const hoja = wb.Sheets[wb.SheetNames[0]];
        const filas = XLSX.utils.sheet_to_json<any>(hoja, { defval: '' });

        const lista: Docente[] = [];

        try {
            // 2) Traer empleados existentes UNA vez
            const empleadosExistRes = await fetch('/api/empleados');
            const empleadosExist = await empleadosExistRes.json();

            // Map por DNI para lookup rápido
            const empleadoPorDni = new Map<string, any>(
                empleadosExist.map((e: any) => [String(e.dni), e])
            );

            // Para evitar procesar el mismo DNI dos veces en el mismo Excel
            const procesados = new Set<string>();

            // 3) Iterar filas del Excel
            for (const fila of filas) {
                const dni = String(fila.dni || '').trim();
                if (!dni || procesados.has(dni)) {
                    console.log(`⏩ DNI ${dni || '(vacío)'} salteado (vacío o duplicado en Excel)`);
                    continue;
                }
                procesados.add(dni);

                // Normalizar centros
                const centrosArray: string[] = String(fila.centroEducativo || '')
                    .split(',')
                    .map((c: string) => c.trim().toUpperCase())
                    .filter(Boolean);

                const token = crypto.randomUUID();

                try {
                    let mostrarTarjeta = false;
                    let qrUrl = '';
                    const existente = empleadoPorDni.get(dni);

                    // Función para normalizar nombres de centros (espacios, mayúsculas, tildes)
                    const normalizarCentro = (c: string) =>
                        c.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

                    if (existente) {
                        const nombreCompleto = `${fila?.nombre ?? existente?.nombre ?? ''} ${fila?.apellido ?? existente?.apellido ?? ''}`.trim();

                        // 1) Traer docente actual
                        let prevCentros: string[] = [];
                        try {
                            const docRes = await fetch(`/api/docentes?empleadoId=${existente._id}`);
                            if (docRes.ok) {
                                const docData = await docRes.json();
                                if (docData && Array.isArray(docData.centrosEducativos)) {
                                    prevCentros = docData.centrosEducativos.map(normalizarCentro);
                                }
                            }
                        } catch (e) {
                            console.warn(`(LOG) No pude leer docente actual para comparar (DNI ${dni})`, e);
                        }

                        // 2) Normalizar y deduplicar entrada
                        const entradaNorm = Array.from(new Set(centrosArray.map(normalizarCentro)));

                        // 3) Calcular diferencia
                        const nuevosCentrosNorm = entradaNorm.filter(c => !prevCentros.includes(c));

                        if (nuevosCentrosNorm.length === 0) {
                            console.log(`↺ Docente EXISTENTE sin cambios: ${nombreCompleto} (DNI ${dni}) — todos ya estaban: ${centrosArray.join(', ')}`);
                        } else {
                            // Mostrar los nombres originales de los que se agregan
                            const nuevosCentrosOriginal = centrosArray.filter(c => nuevosCentrosNorm.includes(normalizarCentro(c)));
                            console.log(`➕ Docente EXISTENTE actualizado: ${nombreCompleto} (DNI ${dni}) — se agregan: ${nuevosCentrosOriginal.join(', ')}`);

                            const upsertDocente = await fetch('/api/docentes', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    empleadoId: existente._id,
                                    centrosEducativos: nuevosCentrosOriginal,
                                }),
                            });
                            if (!upsertDocente.ok) throw new Error('Error creando/actualizando docente');
                        }

                        qrUrl = await QRCode.toDataURL(`${window.location.origin}/playero?token=${existente.qrToken}`);
                        mostrarTarjeta = false;

                    } else {
                        console.log(`🆕 Creando nuevo empleado: ${fila.nombre} ${fila.apellido} (DNI: ${dni})`);

                        const empRes = await fetch('/api/empleados', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                nombre: fila.nombre,
                                apellido: fila.apellido,
                                dni,
                                telefono: String(fila.telefono ?? ''),
                                empresa: fila.empresa,
                                localidad: fila.localidad,
                                qrToken: token,
                                pais: 'AR',
                            }),
                        });

                        if (empRes.status === 409) {
                            console.warn(`⚠️ Empleado duplicado detectado en paralelo para DNI ${dni}`);
                            const ya = empleadoPorDni.get(dni);
                            if (!ya) throw new Error('Empleado duplicado pero no encontrado en cache');

                            const upsertDocente = await fetch('/api/docentes', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    empleadoId: ya._id,
                                    centrosEducativos: Array.from(new Set(centrosArray)),
                                }),
                            });
                            if (!upsertDocente.ok) throw new Error('Error creando/actualizando docente');

                            qrUrl = await QRCode.toDataURL(`${window.location.origin}/playero?token=${ya.qrToken}`);
                            mostrarTarjeta = false;
                        } else {
                            if (!empRes.ok) throw new Error('Error creando empleado');
                            const empleadoCreado = await empRes.json();
                            empleadoPorDni.set(dni, empleadoCreado);

                            console.log(`✅ Empleado creado correctamente: ${fila.nombre} ${fila.apellido} (DNI: ${dni})`);

                            const docenteRes = await fetch('/api/docentes', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    empleadoId: empleadoCreado._id,
                                    centrosEducativos: Array.from(new Set(centrosArray)),
                                }),
                            });
                            if (!docenteRes.ok) throw new Error('Error creando docente');

                            console.log(`📚 Docente NUEVO asociado con centros: ${Array.from(new Set(centrosArray)).join(', ')}`);

                            qrUrl = await QRCode.toDataURL(`${window.location.origin}/playero?token=${token}`);
                            mostrarTarjeta = true;
                        }
                    }

                    if (mostrarTarjeta) {
                        lista.push({
                            nombre: fila.nombre,
                            apellido: fila.apellido,
                            dni,
                            telefono: String(fila.telefono ?? ''),
                            empresa: fila.empresa,
                            localidad: fila.localidad,
                            centrosEducativos: centrosArray,
                            qrUrl,
                        });
                    }
                } catch (err) {
                    console.error(`❌ Error al procesar DNI ${dni}:`, err);
                }

            }
        } catch (e) {
            console.error('❌ Error preparando importación:', e);
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
