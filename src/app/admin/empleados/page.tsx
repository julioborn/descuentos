'use client';

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import Swal from 'sweetalert2';
import Loader from '@/components/Loader';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';

type Empleado = {
    _id: string;
    nombre: string;
    apellido: string;
    dni: string;
    telefono: string;
    empresa: string;
    qrToken: string;
    pais: string;
};

const ITEMS = 5;

export default function EmpleadosPage() {
    const router = useRouter();

    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    const [qrMap, setQrMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    /* ---------- filtros & paginación ---------- */
    const [busqueda, setBusqueda] = useState('');
    const [empresaFiltro, setEmpresaFiltro] = useState<'TODAS' | string>('TODAS');
    const [pagina, setPagina] = useState(1);
    const { data: session, status } = useSession();
    const role = session?.user?.role;

    /* ---------- fetch inicial ---------- */
    useEffect(() => {
        if (!role) return;

        const fetchEmpleados = async () => {
            try {
                const res = await fetch('/api/empleados');
                if (!res.ok) throw new Error();

                let data = (await res.json()) as Empleado[];

                // 🔴 Filtrado por país según el rol
                const paisesPorRol: Record<string, string> = {
                    admin_arg: 'AR',
                    admin_py: 'PY',
                };

                if (role && paisesPorRol[role]) {
                    data = data.filter((emp) => emp.pais === paisesPorRol[role]);
                }

                data.sort((a, b) => a.apellido.localeCompare(b.apellido));

                setEmpleados(data);

                const qrData = await Promise.all(
                    data.map((emp) =>
                        QRCode.toDataURL(
                            `${window.location.origin}/playero?token=${emp.qrToken}`
                        ).then((url) => ({ id: emp._id, url }))
                    )
                );
                const mapa: Record<string, string> = {};
                qrData.forEach(({ id, url }) => (mapa[id] = url));
                setQrMap(mapa);
            } catch {
                Swal.fire('Error', 'No se pudieron cargar los empleados.', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchEmpleados();
    }, [role]);

    /* ---------- conjunto de empresas para desplegable ---------- */
    const empresasUnicas = useMemo(
        () => Array.from(new Set(empleados.map((e) => e.empresa))).sort(),
        [empleados]
    );

    /* ---------- lista filtrada ---------- */
    const empleadosFiltrados = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();

        return empleados.filter((e) => {
            const coincideTexto =
                !texto ||
                `${e.nombre} ${e.apellido} ${e.dni}`.toLowerCase().includes(texto);

            const coincideEmpresa =
                empresaFiltro === 'TODAS' || e.empresa === empresaFiltro;

            return coincideTexto && coincideEmpresa;
        });
    }, [empleados, busqueda, empresaFiltro]);

    /* ---------- paginación ---------- */
    const totalPag = Math.ceil(empleadosFiltrados.length / ITEMS);
    const págActual = Math.min(pagina, totalPag || 1);
    const listaPagina = empleadosFiltrados.slice(
        (págActual - 1) * ITEMS,
        págActual * ITEMS
    );

    if (status === 'loading') return <Loader />;

    /* ---------- acciones ---------- */
    const eliminarEmpleado = async (id: string) => {
        const { isConfirmed } = await Swal.fire({
            title: '¿Eliminar empleado?',
            text: 'Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
        });

        if (!isConfirmed) return;

        try {
            const res = await fetch(`/api/empleados/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            setEmpleados((prev) => prev.filter((e) => e._id !== id));
            Swal.fire('Eliminado', 'El empleado fue eliminado.', 'success');
        } catch {
            Swal.fire('Error', 'No se pudo eliminar el empleado.', 'error');
        }
    };

    const editarEmpleado = async (id: string) => {
        try {
            const res = await fetch(`/api/empleados/${id}`);
            if (!res.ok) throw new Error();
            const empleado = await res.json();

            const { value: values } = await Swal.fire({
                title: 'Editar empleado',
                html: `
                <input id="swal-nombre" class="swal2-input" placeholder="Nombre" value="${empleado.nombre}">
                <input id="swal-apellido" class="swal2-input" placeholder="Apellido" value="${empleado.apellido}">
                <input id="swal-telefono" class="swal2-input" placeholder="Teléfono" value="${empleado.telefono}">
                <input id="swal-empresa" class="swal2-input" placeholder="Empresa" value="${empleado.empresa}">
            `,
                focusConfirm: false,
                confirmButtonText: 'Guardar',
                cancelButtonText: 'Cancelar',
                showCancelButton: true,
                customClass: {
                    confirmButton: 'swal2-confirm bg-red-800 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded',
                    cancelButton: 'swal2-cancel px-6 py-2 rounded',
                },
                preConfirm: () => {
                    const nombre = (document.getElementById('swal-nombre') as HTMLInputElement).value.trim();
                    const apellido = (document.getElementById('swal-apellido') as HTMLInputElement).value.trim();
                    const telefono = (document.getElementById('swal-telefono') as HTMLInputElement).value.trim();
                    const empresa = (document.getElementById('swal-empresa') as HTMLInputElement).value.trim();

                    if (!nombre || !apellido || !telefono || !empresa) {
                        Swal.showValidationMessage('Todos los campos son obligatorios');
                        return;
                    }

                    return { nombre, apellido, telefono, empresa };
                },
            });

            if (!values) return; // cancelado

            const updateRes = await fetch(`/api/empleados/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (!updateRes.ok) throw new Error();
            const actualizado = await updateRes.json();

            setEmpleados((prev) =>
                prev.map((e) => (e._id === id ? { ...e, ...actualizado } : e))
            );

            Swal.fire('Actualizado', 'El empleado fue editado correctamente.', 'success');
        } catch {
            Swal.fire('Error', 'No se pudo editar el empleado.', 'error');
        }
    };

    return (
        <main className="min-h-screen px-4 py-10 bg-gray-700 text-white">
            <h1 className="text-3xl font-bold text-center mb-6">Empleados</h1>

            {/* ---------- Controles de búsqueda / filtros ---------- */}
            <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 max-w-6xl mx-auto mb-6">
                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                    <input
                        value={busqueda}
                        onChange={(e) => {
                            setBusqueda(e.target.value);
                            setPagina(1);
                        }}
                        placeholder="Buscar por nombre, apellido o DNI…"
                        className="flex-1 min-w-[200px] rounded px-4 py-2 bg-gray-800 border border-gray-600"
                    />

                    <select
                        value={empresaFiltro}
                        onChange={(e) => {
                            setEmpresaFiltro(e.target.value);
                            setPagina(1);
                        }}
                        className="rounded px-3 py-2 bg-gray-800 border border-gray-600 min-w-[200px]"
                    >
                        <option value="TODAS">Todas las empresas</option>
                        {empresasUnicas.map((empr) => (
                            <option key={empr}>{empr}</option>
                        ))}
                    </select>
                </div>

                <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                    <button
                        onClick={() => router.push('/admin/registrar-empleado')}
                        className="bg-red-800 px-4 py-2 rounded font-semibold hover:bg-red-700 flex items-center gap-2"
                    >
                        <span>Registrar</span>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z"
                            />
                        </svg>
                    </button>
                </div>
            </section>

            {/* ---------- Tabla (desktop) ---------- */}
            <div className="hidden sm:block overflow-x-auto rounded-lg border border-white/10 bg-gray-800 p-6 shadow-xl max-w-6xl mx-auto">
                <table className="min-w-[800px] w-full text-sm">
                    <thead className="text-left bg-white/5 text-white">
                        <tr>
                            <th className="p-3">Nombre</th>
                            <th className="p-3">Apellido</th>
                            <th className="p-3">DNI</th>
                            <th className="p-3">Teléfono</th>
                            <th className="p-3">Empresa</th>
                            <th className="p-3">QR</th>
                            <th className="p-3 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {listaPagina.map((emp) => (
                            <tr key={emp._id} className="hover:bg-white/10 transition">
                                <td className="p-2">{emp.nombre}</td>
                                <td className="p-2">{emp.apellido}</td>
                                <td className="p-2">{emp.dni}</td>
                                <td className="p-2">{emp.telefono}</td>
                                <td className="p-2">{emp.empresa}</td>
                                <td className="p-2">
                                    {qrMap[emp._id] ? (
                                        <img
                                            src={qrMap[emp._id]}
                                            alt="QR"
                                            className="w-14 h-14 rounded border border-white/20"
                                        />
                                    ) : (
                                        <Loader />
                                    )}
                                </td>
                                <td className="p-2 text-center">
                                    {/* Editar */}
                                    <button
                                        onClick={() => editarEmpleado(emp._id)}
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-600 hover:bg-yellow-500 mr-2"
                                        title="Editar"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                            <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                                            <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                                        </svg>
                                    </button>

                                    {/* Eliminar */}
                                    <button
                                        onClick={() => eliminarEmpleado(emp._id)}
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-700 hover:bg-red-600"
                                        title="Eliminar"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                            <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" />
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ---------- Cards (mobile) ---------- */}
            <div className="sm:hidden flex flex-col gap-4 max-w-xl mx-auto">
                {listaPagina.map((emp) => (
                    <div
                        key={emp._id}
                        className="bg-white/5 rounded-lg p-4 border border-white/10 shadow-lg"
                    >
                        <p><b>{emp.nombre} {emp.apellido}</b></p>
                        <p>DNI: {emp.dni}</p>
                        <p>Tel: {emp.telefono}</p>
                        <p>Empresa: {emp.empresa}</p>
                        <div className="mt-2 flex justify-center">
                            {qrMap[emp._id] ? (
                                <img src={qrMap[emp._id]} alt="QR" className="w-32 h-32" />
                            ) : (
                                <Loader />
                            )}
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                onClick={() => editarEmpleado(emp._id)}
                                className="px-3 py-1 rounded-full bg-yellow-600 hover:bg-yellow-500 text-sm"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                    <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                                    <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                                </svg>
                            </button>
                            <button
                                onClick={() => eliminarEmpleado(emp._id)}
                                className="px-3 py-1 rounded-full bg-red-700 hover:bg-red-600 text-sm"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                    <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* ---------- Paginación ---------- */}
            {
                totalPag > 1 && (
                    <div className="flex justify-center mt-8 items-center gap-2 text-white">
                        <button
                            onClick={() => setPagina((p) => Math.max(p - 1, 1))}
                            disabled={págActual === 1}
                            className="p-2 rounded-full hover:bg-gray-700 disabled:opacity-30"
                        >
                            <HiChevronLeft size={22} />
                        </button>

                        {/* Números de página */}
                        {Array.from({ length: totalPag }, (_, i) => i + 1).map((num) => (
                            <button
                                key={num}
                                onClick={() => setPagina(num)}
                                className={`w-9 h-9 rounded-full font-semibold transition
                        ${págActual === num
                                        ? 'bg-red-700 text-white'
                                        : 'bg-gray-700 hover:bg-gray-600'}`}
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
                )
            }
        </main >
    );
}
