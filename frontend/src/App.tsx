import { useMemo, useState } from 'react';
import Header from './components/Header';
import AdminUsersPage from './pages/AdminUsersPage';
import BoleteriaPage from './pages/BoleteriaPage';
import HomePage from './pages/HomePage';
import PublicAccessPage from './pages/PublicAccessPage';
import { clearSession, getStoredUser } from './services/api';
import type { AuthUser } from './types';

type View = 'inicio' | 'registro-presencial' | 'usuarios';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [view, setView] = useState<View>('inicio');

  const menu = useMemo(() => {
    if (!user) return [];

    const items = [{ id: 'inicio' as View, label: 'Inicio' }];

    if (user.idRol === 'BOLETERIA' || user.idRol === 'ADMINISTRADOR') {
      items.push({ id: 'registro-presencial', label: 'Registro presencial' });
    }

    if (user.idRol === 'ADMINISTRADOR') {
      items.push({ id: 'usuarios', label: 'Usuarios' });
    }

    return items;
  }, [user]);

  function handleLogin(nextUser: AuthUser) {
    setUser(nextUser);
    setView('inicio');
  }

  function logout() {
    clearSession();
    setUser(null);
    setView('inicio');
  }

  if (!user) {
    return (
      <>
        <Header user={null} onLogout={logout} />
        <PublicAccessPage onLogin={handleLogin} />
      </>
    );
  }

  return (
    <>
      <Header user={user} onLogout={logout} />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <nav className="mb-8 flex flex-wrap gap-3">
          {menu.map((item) => (
            <button
              key={item.id}
              className={item.id === view ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setView(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {view === 'inicio' && <HomePage user={user} onNavigate={setView} />}
        {view === 'registro-presencial' && <BoleteriaPage />}
        {view === 'usuarios' && <AdminUsersPage />}
      </main>
    </>
  );
}
