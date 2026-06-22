import type { AuthUser, LoginResponse, Usuario } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export function getToken() {
  return localStorage.getItem('cine_token');
}

export function setSession(token: string, usuario: AuthUser) {
  localStorage.setItem('cine_token', token);
  localStorage.setItem('cine_usuario', JSON.stringify(usuario));
}

export function clearSession() {
  localStorage.removeItem('cine_token');
  localStorage.removeItem('cine_usuario');
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem('cine_usuario');
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
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

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.mensaje ?? 'Error al procesar la solicitud.');
  }

  return data as T;
}

export const api = {
  health: () =>
    request<{ ok: boolean; mensaje: string; database?: string }>('/health'),

  login: (payload: { correo: string; contrasena: string }) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  me: () =>
    request<{ ok: boolean; usuario: AuthUser }>('/auth/me'),

  registroCliente: (payload: Record<string, unknown>) =>
    request<{ ok: boolean; mensaje: string }>('/auth/registro-cliente', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  registroPresencial: (payload: Record<string, unknown>) =>
    request<{
      ok: boolean;
      mensaje: string;
      cliente: {
        idUsuario: number;
        correo: string;
        ci: string;
        contrasenaTemporal: string;
      };
    }>('/auth/registro-presencial', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  listarUsuarios: () =>
    request<{ ok: boolean; usuarios: Usuario[] }>('/usuarios'),

  crearUsuario: (payload: Record<string, unknown>) =>
    request<{ ok: boolean; mensaje: string; idUsuario: number }>('/usuarios', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  actualizarUsuario: (idUsuario: number, payload: Record<string, unknown>) =>
    request<{ ok: boolean; mensaje: string }>(`/usuarios/${idUsuario}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  darBajaUsuario: (idUsuario: number) =>
    request<{ ok: boolean; mensaje: string }>(`/usuarios/${idUsuario}`, {
      method: 'DELETE'
    })
};
