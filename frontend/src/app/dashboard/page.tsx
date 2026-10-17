'use client';
import { OfficeNotesPanel } from '../../components/office-notes-panel';
import { RideTable } from '../../components/ride-table';

import {
  BusFront,
  CalendarDays,
  Clock3,
  LoaderCircle,
  LogOut,
  PlayCircle,
  ShieldCheck,
  Square,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface CurrentUser {
  id: string;
  username: string;
  fullName: string;
  role: 'EMPLOYEE' | 'MANAGER';
  isActive: boolean;
}

interface ActiveShift {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
  clockedInAt: string;
  clockedOutAt: string | null;
  status: 'ACTIVE';
  note: string | null;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

function calculateRemaining(end: string, now: Date) {
  const difference = new Date(end).getTime() - now.getTime();

  if (difference <= 0) {
    return 'Vardiya süresi doldu';
  }

  const hours = Math.floor(difference / (60 * 60 * 1000));
  const minutes = Math.floor(
    (difference % (60 * 60 * 1000)) / (60 * 1000),
  );

  return `${hours} saat ${minutes} dakika`;
}

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [shift, setShift] = useState<ActiveShift | null>(null);
  const [now, setNow] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isEnding, setIsEnding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function initializeDashboard() {
      try {
        const userResponse = await fetch(`${API_URL}/auth/me`, {
          credentials: 'include',
        });

        if (!userResponse.ok) {
          router.replace('/');
          return;
        }

        setUser((await userResponse.json()) as CurrentUser);

        const shiftResponse = await fetch(
          `${API_URL}/shifts/active`,
          {
            credentials: 'include',
          },
        );

        if (!shiftResponse.ok) {
          throw new Error('Vardiya bilgisi alınamadı.');
        }

        const result = (await shiftResponse.json()) as {
          shift: ActiveShift | null;
        };

        if (!result.shift) {
          router.replace('/shift');
          return;
        }

        setShift(result.shift);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Dashboard yüklenemedi.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    void initializeDashboard();

    const clock = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => {
      window.clearInterval(clock);
    };
  }, [router]);

  const progress = useMemo(() => {
    if (!shift) {
      return 0;
    }

    const start = new Date(shift.scheduledStart).getTime();
    const end = new Date(shift.scheduledEnd).getTime();
    const current = now.getTime();

    return Math.min(
      100,
      Math.max(0, ((current - start) / (end - start)) * 100),
    );
  }, [shift, now]);

  async function endShift() {
    const confirmed = window.confirm(
      'Vardiyanızı bitirmek istediğinizden emin misiniz?',
    );

    if (!confirmed) {
      return;
    }

    setIsEnding(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/shifts/end`, {
        method: 'POST',
        credentials: 'include',
      });

      const result = (await response.json()) as {
        message?: string | string[];
      };

      if (!response.ok) {
        const message = Array.isArray(result.message)
          ? result.message[0]
          : result.message;

        throw new Error(message ?? 'Vardiya bitirilemedi.');
      }

      router.replace('/shift');
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Vardiya bitirilemedi.',
      );
    } finally {
      setIsEnding(false);
    }
  }

  async function logout() {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });

    router.replace('/');
  }

  if (isLoading || !user || !shift) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#06182f]">
        <LoaderCircle className="h-9 w-9 animate-spin text-cyan-300" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-[#06182f] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cyan-300/10 p-2.5">
              <BusFront className="h-6 w-6 text-cyan-300" />
            </div>

            <div>
              <p className="font-semibold">BusOps Operasyon</p>
              <p className="text-xs text-slate-400">
                Kocaeli Otogar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user.role === 'MANAGER' && (
              <Link
                href="/admin"
                className="flex items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-300/20"
              >
                <ShieldCheck className="h-4 w-4" />
                Yönetici Paneli
              </Link>
            )}

            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" />
              Çış
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-9">
        <div className="mb-8">
          <p className="text-sm font-medium text-cyan-700">
            Aktif vardiya
          </p>

          <h1 className="mt-2 text-3xl font-semibold">
            Hoş geldiniz, {user.fullName}
          </h1>

          <p className="mt-2 text-slate-500">
            Operasyon paneliniz kullanıma hazır.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
                  <PlayCircle className="h-4 w-4" />
                  Vardiya devam ediyor
                </div>

                <h2 className="mt-5 text-3xl font-semibold">
                  {formatTime(shift.scheduledStart)}
                  <span className="mx-3 text-slate-300">–</span>
                  {formatTime(shift.scheduledEnd)}
                </h2>

                <p className="mt-2 text-slate-500">
                  {formatDate(shift.scheduledStart)}
                </p>
              </div>

              <div className="rounded-xl bg-cyan-50 px-5 py-4 text-right">
                <p className="text-xs font-medium uppercase tracking-wide text-cyan-700">
                  Kalan süre
                </p>
                <p className="mt-1 font-semibold text-cyan-950">
                  {calculateRemaining(shift.scheduledEnd, now)}
                </p>
              </div>
            </div>

            <div className="mt-8">
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-slate-500">Vardiya ilerlemesi</span>
                <span className="font-medium">
                  %{Math.round(progress)}
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-cyan-600 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <Clock3 className="h-5 w-5 text-slate-400" />
                <p className="mt-3 text-xs text-slate-500">
                  Gerçek giriş
                </p>
                <p className="mt-1 font-semibold">
                  {formatTime(shift.clockedInAt)}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <CalendarDays className="h-5 w-5 text-slate-400" />
                <p className="mt-3 text-xs text-slate-500">
                  Planlanan çıkış
                </p>
                <p className="mt-1 font-semibold">
                  {formatTime(shift.scheduledEnd)}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <UserRound className="h-5 w-5 text-slate-400" />
                <p className="mt-3 text-xs text-slate-500">
                  Kullanıcı rolü
                </p>
                <p className="mt-1 font-semibold">
                  {user.role === 'MANAGER' ? 'Yönetici' : 'Çalışan'}
                </p>
              </div>
            </div>

            {shift.note && (
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-medium uppercase text-amber-700">
                  Vardiya notu
                </p>
                <p className="mt-2 text-sm text-amber-950">
                  {shift.note}
                </p>
              </div>
            )}
          </article>

          <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold">Vardiya işlemleri</h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Vardiyanız sona erdiğinde çıkış saatinizi kaydedin.
            </p>

            <button
              onClick={endShift}
              disabled={isEnding}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3.5 font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {isEnding ? (
                <LoaderCircle className="h-5 w-5 animate-spin" />
              ) : (
                <Square className="h-5 w-5" />
              )}

              {isEnding
                ? 'Vardiya bitiriliyor...'
                : 'Vardiyayı Bitir'}
            </button>
          </aside>
        </div>

        <OfficeNotesPanel isManager={user.role === 'MANAGER'} />
        <RideTable />
      </section>
    </main>
  );
}