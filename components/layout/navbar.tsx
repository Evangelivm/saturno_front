'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { LogOut, FileText, Plus, Users, UserPlus, Settings, Menu, X } from 'lucide-react';
import { useState } from 'react';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const navLinks = [
    {
      href: '/comprobantes',
      label: 'Comprobantes',
      icon: FileText,
    },
    {
      href: '/comprobantes/nuevo',
      label: 'Nuevo Comprobante',
      icon: Plus,
    },
  ];

  const adminNavLinks = [
    {
      href: '/usuarios',
      label: 'Usuarios',
      icon: Users,
    },
    {
      href: '/usuarios/nuevo',
      label: 'Nuevo Usuario',
      icon: UserPlus,
    },
    {
      href: '/configuracion',
      label: 'Configuración',
      icon: Settings,
    },
  ];

  return (
    <nav className="bg-white border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo y nombre */}
          <div className="flex items-center space-x-3">
            <Link href="/comprobantes" className="flex items-center space-x-3">
              <Image
                src="/logo.svg"
                alt="Saturno Transporte"
                width={120}
                height={40}
                className="h-10 w-auto"
                priority
              />
            </Link>
          </div>

          {/* Links de navegación */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || pathname.startsWith(link.href + '/');

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
                    ${isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-muted hover:text-foreground'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}

            {user?.role === 'ADMIN' && (
              <>
                <div className="w-px h-6 bg-border mx-2" />
                {adminNavLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href || pathname.startsWith(link.href + '/');

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`
                        flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
                        ${isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground hover:bg-muted hover:text-foreground'
                        }
                      `}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </>
            )}
          </div>

          {/* Usuario y logout */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {user && (
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-medium text-foreground">
                  {user.nombreEmpresa || 'Empresa'}
                </span>
                <span className="text-xs text-muted-foreground">
                  RUC: {user.ruc}
                </span>
              </div>
            )}

            <Button
              onClick={handleLogout}
              className="hidden sm:flex items-center space-x-2 h-8 px-3 text-sm border bg-card text-foreground hover:bg-muted"
            >
              <LogOut className="h-4 w-4" />
              <span>Cerrar Sesión</span>
            </Button>

            {/* Hamburger button — solo visible en móvil */}
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="md:hidden p-2 rounded-md text-foreground hover:bg-muted transition-colors"
              aria-label="Abrir menú"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile navigation — colapsable */}
        {mobileOpen && (
          <div className="md:hidden pb-3 pt-1 space-y-1 border-t border-border mt-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || pathname.startsWith(link.href + '/');

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`
                    flex items-center space-x-2 px-3 py-2.5 rounded-md text-sm font-medium transition-colors
                    ${isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-muted'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}

            {user?.role === 'ADMIN' && (
              <>
                <div className="h-px bg-border my-1" />
                {adminNavLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href || pathname.startsWith(link.href + '/');

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={`
                        flex items-center space-x-2 px-3 py-2.5 rounded-md text-sm font-medium transition-colors
                        ${isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground hover:bg-muted'
                        }
                      `}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </>
            )}

            {/* Info usuario + cerrar sesión en móvil */}
            {user && (
              <>
                <div className="h-px bg-border my-1" />
                <div className="px-3 py-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{user.nombreEmpresa || 'Empresa'}</p>
                    <p className="text-xs text-muted-foreground">RUC: {user.ruc}</p>
                  </div>
                  <button
                    onClick={() => { setMobileOpen(false); handleLogout(); }}
                    className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-medium px-2 py-1.5 rounded-md hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
