import type { AuthUser, LoginResponse, Usuario, Rol } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export function normalizeRoles(roles: Rol | Rol[] | string | null | undefined): Rol[] {
  if (!roles) return [];
  if (Array.isArray(roles)) return roles;
  return String(roles)
    .split(',')
    .map(r => r.trim())
    .filter(Boolean) as Rol[];
}

export function normalizeUser(user: AuthUser): AuthUser {
  return {
    ...user,
    idRol: normalizeRoles(user.idRol)
  };
}

export function getToken() {
  return localStorage.getItem('cine_token');
}

export function setSession(token: string, usuario: AuthUser) {
  localStorage.setItem('cine_token', token);
  localStorage.setItem('cine_usuario', JSON.stringify(normalizeUser(usuario)));
}

export function clearSession() {
  localStorage.removeItem('cine_token');
  localStorage.removeItem('cine_usuario');
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem('cine_usuario');
  if (!raw) return null;
  try {
    const stored = JSON.parse(raw) as AuthUser;
    return normalizeUser(stored);
  } catch {
    clearSession();
    return null;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.mensaje ?? 'Error al procesar la solicitud.');
    (error as any).motivo = data.motivo;
    throw error;
  }
  return data as T;
}

async function requestBlob(path: string, options: RequestInit = {}): Promise<Blob> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.mensaje ?? 'Error al procesar la solicitud.');
  }
  return response.blob();
}

export const api = {
  health: () => request<{ ok: boolean; mensaje: string; database?: string }>('/health'),

  // Auth
  login: (payload: { correo: string; contrasena: string }) =>
    request<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request<{ ok: boolean; usuario: AuthUser }>('/auth/me'),
  registroCliente: (payload: Record<string, unknown>) =>
    request<{ ok: boolean; mensaje: string }>('/auth/registro-cliente', { method: 'POST', body: JSON.stringify(payload) }),
  registroPresencial: (payload: Record<string, unknown>) =>
    request<{ ok: boolean; mensaje: string; cliente: { idUsuario: number; correo: string; ci: string; contrasenaTemporal: string } }>(
      '/auth/registro-presencial', { method: 'POST', body: JSON.stringify(payload) }
    ),
  actualizarPerfil: (payload: Record<string, unknown>) =>
    request<{ ok: boolean; mensaje: string; usuario: AuthUser }>('/auth/perfil', { method: 'PUT', body: JSON.stringify(payload) }),

  // Usuarios
  listarUsuarios: () => request<{ ok: boolean; usuarios: Usuario[] }>('/usuarios'),
  crearUsuario: (payload: Record<string, unknown>) =>
    request<{ ok: boolean; mensaje: string; idUsuario: number }>('/usuarios', { method: 'POST', body: JSON.stringify(payload) }),
  actualizarUsuario: (id: number, payload: Record<string, unknown>) =>
    request<{ ok: boolean; mensaje: string }>(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  darBajaUsuario: (id: number) =>
    request<{ ok: boolean; mensaje: string }>(`/usuarios/${id}`, { method: 'DELETE' }),

  // Películas
  listarPeliculas: () => request<{ ok: boolean; peliculas: any[] }>('/peliculas'),
  crearPelicula: (payload: Record<string, unknown>) =>
    request<{ ok: boolean; mensaje: string; idPelicula: number }>('/peliculas', { method: 'POST', body: JSON.stringify(payload) }),
  actualizarPelicula: (id: number, payload: Record<string, unknown>) =>
    request<{ ok: boolean; mensaje: string }>(`/peliculas/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  eliminarPelicula: (id: number) =>
    request<{ ok: boolean; mensaje: string }>(`/peliculas/${id}`, { method: 'DELETE' }),

  // Salas
  listarSalas: () => request<{ ok: boolean; salas: any[] }>('/salas'),
  obtenerAsientosSala: (id: string) => request<{ ok: boolean; asientos: any[] }>(`/salas/${id}/asientos`),
  crearSala: (payload: Record<string, unknown>) =>
    request<{ ok: boolean; mensaje: string; idSala: string }>('/salas', { method: 'POST', body: JSON.stringify(payload) }),
  actualizarSala: (id: string, payload: Record<string, unknown>) =>
    request<{ ok: boolean; mensaje: string }>(`/salas/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  eliminarSala: (id: string) =>
    request<{ ok: boolean; mensaje: string }>(`/salas/${id}`, { method: 'DELETE' }),

  // Funciones
  listarFunciones: () => request<{ ok: boolean; funciones: any[] }>('/funciones'),
  crearFuncion: (payload: Record<string, unknown>) =>
    request<{ ok: boolean; mensaje: string; idFuncion: number }>('/funciones', { method: 'POST', body: JSON.stringify(payload) }),
  eliminarFuncion: (id: number) =>
    request<{ ok: boolean; mensaje: string }>(`/funciones/${id}`, { method: 'DELETE' }),
  copiarSemanaFunciones: (payload: { fechaOrigen: string; fechaDestino: string }) =>
    request<{ ok: boolean; mensaje: string; copiadas: number; conflictos: number }>('/funciones/copiar-semana', { method: 'POST', body: JSON.stringify(payload) }),

  // Asientos
  obtenerAsientosPorFuncion: (idFuncion: number) =>
    request<{ ok: boolean; asientos: any[] }>(`/funciones/${idFuncion}/asientos`),

  // Ventas
  crearVenta: (payload: Record<string, unknown>) =>
    request<{ ok: boolean; mensaje: string; idVenta: number; montoTotal: number; numeroComprobante: string; emailEnviado?: boolean; emailMotivo?: string }>(
      '/ventas', { method: 'POST', body: JSON.stringify(payload) }
    ),
  cancelarVenta: (idVenta: number) =>
    request<{ ok: boolean; mensaje: string }>('/cancelaciones', { method: 'POST', body: JSON.stringify({ idVenta }) }),

  // Comprobantes
  obtenerComprobante: (numero: string) =>
    request<{ ok: boolean; comprobante: any }>(`/comprobantes/${encodeURIComponent(numero)}`),
  descargarComprobantePdf: (numero: string) =>
    requestBlob(`/comprobantes/${encodeURIComponent(numero)}/pdf`),
  descargarComprobanteTicketPdf: (numero: string) =>
    requestBlob(`/comprobantes/${encodeURIComponent(numero)}/ticket`),

  // Email
  enviarComprobanteEmail: (idVenta: number, email: string) =>
    request<{ ok: boolean; mensaje: string }>('/enviar-comprobante-email', {
      method: 'POST', body: JSON.stringify({ idVenta, email })
    }),

  // Reportes
  reporteOcupacion: (params?: { fechaInicio?: string; fechaFin?: string; idPelicula?: number; idSala?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return request<{ ok: boolean; reporte: any[] }>(`/reportes/ocupacion${qs}`);
  },
  reporteMasVistas: (params?: { fechaInicio?: string; fechaFin?: string; orden?: 'ASC' | 'DESC' }) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return request<{ ok: boolean; reporte: any[] }>(`/reportes/mas-vistas${qs}`);
  },
  reporteVentas: (params?: { fechaInicio?: string; fechaFin?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return request<{ ok: boolean; reporte: any[] }>(`/reportes/ventas${qs}`);
  },
  historialCliente: (idCliente: number) =>
    request<{ ok: boolean; historial: any[] }>(`/reportes/historial/${idCliente}`),

  descargarReporteOcupacionPdf: (params?: { fechaInicio?: string; fechaFin?: string; idPelicula?: number; idSala?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return requestBlob(`/reportes/ocupacion/pdf${qs}`);
  },
  descargarReporteMasVistasPdf: (params?: { fechaInicio?: string; fechaFin?: string; orden?: 'ASC' | 'DESC' }) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return requestBlob(`/reportes/mas-vistas/pdf${qs}`);
  },
  descargarReporteVentasPdf: (params?: { fechaInicio?: string; fechaFin?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return requestBlob(`/reportes/ventas/pdf${qs}`);
  },
  obtenerBoletos: (idVenta: number) =>
    request<{ ok: boolean; boletos: { idBoleto: number; idAsiento: string; codigoAcceso: string | null }[] }>(`/ventas/${idVenta}/boletos`),

  validarAcceso: (qrCode: string) =>
    request<{ ok: boolean; mensaje: string; detalle: any }>('/acceso/validate', {
      method: 'POST',
      body: JSON.stringify({ qrCode })
    }),
  obtenerFuncionesPromocion: () =>
    request<{ ok: boolean; funciones: any[]; reglas: any }>('/promociones/funciones'),
};
