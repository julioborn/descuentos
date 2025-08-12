'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Swal from 'sweetalert2';
import Loader from '@/components/Loader';
import QRCode from 'qrcode';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';

/* ---------- Tipos ---------- */
type Empleado = {
    _id: string;
    nombre: string;
    apellido: string;
    dni: string;
    telefono: string;
    empresa: string;
    localidad: string;
    qrToken: string;
};

type DocenteDB = {
    _id: string;
    empleadoId: string | { _id: string };
    centrosEducativos: string[];
};

type Fila = Empleado & {
    centrosEducativos: string[];
};

const ITEMS = 5;

/* Util para búsqueda acentos-insensible */
const sinAcentos = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function AdminDocentesPage() {
    const router = useRouter();
    const { status } = useSession();

    const [filas, setFilas] = useState<Fila[]>([]);
    const [qrMap, setQrMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    /* filtros */
    const [busqueda, setBusqueda] = useState('');
    const [localidadFiltro, setLocalidadFiltro] = useState<'TODAS' | string>('TODAS');
    const [pagina, setPagina] = useState(1);

    /* cargar empleados DOCENTES + centros */
    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1) Empleados (el API ya filtra por país según rol)
                const empRes = await fetch('/api/empleados');
                if (!empRes.ok) throw new Error('empleados');
                const empleados = (await empRes.json()) as Empleado[];

                // 2) Quedarnos sólo con empresa === 'DOCENTES'
                const empleadosDoc = empleados.filter((e) => e.empresa === 'DOCENTES');

                // 3) Docentes (centros)
                const docRes = await fetch('/api/docentes'); // devuelve lista (con o sin populate)
                if (!docRes.ok) throw new Error('docentes');
                const docentes = (await docRes.json()) as DocenteDB[];

                // 4) Mapear centros por empleadoId
                const centrosPorEmpleado = new Map<string, string[]>();
                for (const d of docentes) {
                    const empId =
                        typeof d.empleadoId === 'string'
                            ? d.empleadoId
                            : (d.empleadoId?._id as string);
                    if (!empId) continue;
                    centrosPorEmpleado.set(empId, d.centrosEducativos || []);
                }

                // 5) Armar filas combinadas
                const combinadas: Fila[] = empleadosDoc.map((e) => ({
                    ...e,
                    centrosEducativos: centrosPorEmpleado.get(e._id) || [],
                }));

                // 6) Ordenar por apellido
                combinadas.sort((a, b) => a.apellido.localeCompare(b.apellido));

                setFilas(combinadas);

                // 7) Pre-generar QR
                const qrData = await Promise.all(
                    combinadas.map((emp) =>
                        QRCode.toDataURL(`${window.location.origin}/playero?token=${emp.qrToken}`)
                            .then((url) => ({ id: emp._id, url }))
                    )
                );
                const mapa: Record<string, string> = {};
                qrData.forEach(({ id, url }) => (mapa[id] = url));
                setQrMap(mapa);
            } catch (e) {
                console.error(e);
                Swal.fire('Error', 'No se pudieron cargar los docentes.', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    /* localidades únicas */
    const localidadesUnicas = useMemo(
        () => Array.from(new Set(filas.map((f) => f.localidad))).sort(),
        [filas]
    );

    /* lista filtrada */
    const filtradas = useMemo(() => {
        const txt = sinAcentos(busqueda.trim());

        return filas.filter((f) => {
            const coincideTxt =
                !txt ||
                sinAcentos(`${f.nombre} ${f.apellido} ${f.dni} ${f.localidad}`)
                    .includes(txt) ||
                sinAcentos(f.centrosEducativos.join(' ')).includes(txt);

            const coincideLoc = localidadFiltro === 'TODAS' || f.localidad === localidadFiltro;

            return coincideTxt && coincideLoc;
        });
    }, [filas, busqueda, localidadFiltro]);

    /* paginación */
    const totalPag = Math.ceil(filtradas.length / ITEMS);
    const págActual = Math.min(pagina, totalPag || 1);
    const pageList = filtradas.slice((págActual - 1) * ITEMS, págActual * ITEMS);

    if (status === 'loading' || loading) return <Loader />;

    /* helpers */
    const verQrGrande = (url: string, nombre: string, apellido: string) => {
        Swal.fire({
            html: `
        <div class="flex flex-col items-center">
          <h2 style="font-size:18px; font-weight:600; margin-bottom:10px;">
            ${nombre} ${apellido}
          </h2>
          <img src="${url}" alt="QR"
              style="width: 250px; height: 250px; border-radius: 10px; border: 2px solid #ccc;" />
        </div>
      `,
            showConfirmButton: false,
            background: '#1f2937',
            color: '#fff',
            customClass: { popup: 'rounded-lg shadow-lg' },
        });
    };

    return (
        <main className="min-h-screen px-4 py-10 bg-gray-700 text-white">
            <h1 className="text-3xl font-bold text-center mb-6">Docentes</h1>

            {/* controles */}
            <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 max-w-6xl mx-auto mb-6">
                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                    <input
                        value={busqueda}
                        onChange={(e) => {
                            setBusqueda(e.target.value);
                            setPagina(1);
                        }}
                        placeholder="Buscar por nombre, DNI, localidad o centro educativo…"
                        className="flex-1 min-w-[240px] rounded px-4 py-2 bg-gray-800 border border-gray-600"
                    />

                    <select
                        value={localidadFiltro}
                        onChange={(e) => {
                            setLocalidadFiltro(e.target.value);
                            setPagina(1);
                        }}
                        className="rounded px-3 py-2 bg-gray-800 border border-gray-600 min-w-[200px]"
                    >
                        <option value="TODAS">Todas las localidades</option>
                        {localidadesUnicas.map((loc) => (
                            <option key={loc}>{loc}</option>
                        ))}
                    </select>
                </div>

                <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                    <button
                        onClick={() => router.push('/admin/registrar-empleado')}
                        className="bg-red-800 px-4 py-2 rounded font-semibold hover:bg-red-700 flex items-center gap-2"
                    >
                        <span>Registrar</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                        </svg>
                    </button>
                </div>
            </section>

            {/* tabla */}
            <div className="hidden sm:block overflow-x-auto rounded-lg border border-white/10 bg-gray-800 p-6 shadow-xl max-w-6xl mx-auto">
                <table className="min-w-[1000px] w-full text-sm">
                    <thead className="text-left bg-white/5 text-white">
                        <tr>
                            <th className="p-3">Nombre</th>
                            <th className="p-3">Apellido</th>
                            <th className="p-3">DNI</th>
                            <th className="p-3">Teléfono</th>
                            <th className="p-3">Localidad</th>
                            <th className="p-3">Centros Educativos</th>
                            <th className="p-3">QR</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageList.map((emp) => (
                            <tr key={emp._id} className="hover:bg-white/10 transition">
                                <td className="p-2">{emp.nombre}</td>
                                <td className="p-2">{emp.apellido}</td>
                                <td className="p-2">{emp.dni}</td>
                                <td className="p-2">{emp.telefono}</td>
                                <td className="p-2">{emp.localidad}</td>
                                <td className="p-2">
                                    {emp.centrosEducativos.length
                                        ? emp.centrosEducativos.join(', ')
                                        : <span className="text-white/60">—</span>}
                                </td>
                                <td className="p-2">
                                    {qrMap[emp._id] ? (
                                        <img
                                            src={qrMap[emp._id]}
                                            alt="QR"
                                            className="w-14 h-14 rounded border border-white/20 cursor-pointer hover:scale-110 transition"
                                            onClick={() => verQrGrande(qrMap[emp._id], emp.nombre, emp.apellido)}
                                        />
                                    ) : (
                                        <Loader />
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* cards mobile */}
            <div className="sm:hidden flex flex-col gap-4 max-w-xl mx-auto">
                {pageList.map((emp) => (
                    <div key={emp._id} className="bg-white/5 rounded-lg p-4 border border-white/10 shadow-lg">
                        <p className="font-semibold">{emp.nombre} {emp.apellido}</p>
                        <p>DNI: {emp.dni}</p>
                        <p>Tel: {emp.telefono}</p>
                        <p>Localidad: {emp.localidad}</p>
                        <p>Centros: {emp.centrosEducativos.length ? emp.centrosEducativos.join(', ') : '—'}</p>
                        <div className="mt-2 flex justify-center">
                            {qrMap[emp._id] ? (
                                <img
                                    src={qrMap[emp._id]}
                                    alt="QR"
                                    className="w-28 h-28 rounded border border-white/20"
                                    onClick={() => verQrGrande(qrMap[emp._id], emp.nombre, emp.apellido)}
                                />
                            ) : (
                                <Loader />
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* paginación */}
            {totalPag > 1 && (
                <div className="flex justify-center mt-8 items-center gap-2 text-white">
                    <button
                        onClick={() => setPagina((p) => Math.max(p - 1, 1))}
                        disabled={págActual === 1}
                        className="p-2 rounded-full hover:bg-gray-700 disabled:opacity-30"
                    >
                        <HiChevronLeft size={22} />
                    </button>

                    {Array.from({ length: totalPag }, (_, i) => i + 1).map((num) => (
                        <button
                            key={num}
                            onClick={() => setPagina(num)}
                            className={`w-9 h-9 rounded-full font-semibold transition
                ${págActual === num ? 'bg-red-700 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                        >
                            {num}
                        </button>
                    ))}

                    <button
                        onClick={() => setPagina((p) => Math.min(p + 1, totalPag))}
                        disabled={págActual === totalPag}
                        className="p-2 rounded-full hover:bg-gray-700 disabled:opacity-30"
                    >
                        <HiChevronRight size={22} />
                    </button>
                </div>
            )}
        </main>
    );
}
