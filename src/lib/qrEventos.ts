// src/lib/qrEventos.ts
// Empresas cuyo QR es unico y compartido por muchas personas (calcomania de
// un evento/promo), en vez de un QR individual por empleado. Para estas:
// - el link del QR apunta a /promo (pagina publica) en vez de /playero
// - cargarlo varias veces el mismo dia no cuenta como carga duplicada
export const EMPRESAS_QR_EVENTO = ['INDIECITO', 'FIESTA EMPANADA'];

export const esQrDeEvento = (empresa?: string) =>
    !!empresa && EMPRESAS_QR_EVENTO.includes(empresa);
