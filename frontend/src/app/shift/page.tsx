'use client';

import {
  ArrowRight,
  BusFront,
  Check,
  Clock3,
  LoaderCircle,
  LogOut,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface CurrentUser {
  id: string;
  username: string;
  fullName: string;
  role: 'EMPLOYEE' | 'MANAGER';
}

interface ShiftOption {
  id: string;
  label: string;
  start: string;
  end: string;
  description: string;
  overnight?: boolean;
}

const SHIFT_OPTIONS: ShiftOption[] = [
  {
    id: 'morning',
    label: 'Sabah Vardiyası',
    start: '07:30',
    end: '15:30',
    description: 'Sabah operasyonu',
  },
  {
    id: 'day',
    label: 'Gündüz Vardiyası',
    start: '11:00',
    end: '19:00',
    description: 'Gündüz operasyonu',
  },
  {
    id: 'evening',
    label: 'Akşam Vardiyası',
    start: '15:30',
    end: '23:30',
    description: 'Akşam operasyonu',
  },
  {
    id: 'night',
    label: 'Gece Vardiyası',
    start: '23:30',
    end: '07:30',
    description: 'Gece operasyonu',
    overnight: true,
  },
];

function createShiftDates(option: ShiftOption) {
  const now = new Date();
  const [startHour, startMinute] = option.start
    .split(':')
    .map(Number);
  const [endHour, endMinute] = option.end.split(':').map(Number);

  const scheduledStart = new Date(now);
  scheduledStart.setHours(startHour, startMinute, 0, 0);

  const scheduledEnd = new Date(now);
  scheduledEnd.setHours(endHour, endMinute, 0, 0);

  if (option.overnight) {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const endMinutes = endHour * 60 + endMinute;

    if (currentMinutes < endMinutes) {
      scheduledStart.setDate(scheduledStart.getDate() - 1);
    } else {
      scheduledEnd.setDate(scheduledEnd.getDate() + 1);
    }
  }

  return {
    scheduledStart: scheduledStart.toISOString(),
    scheduledEnd: scheduledEnd.toISOString(),
  };
}

export default function ShiftPage() {
  const router = useRouter();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [selectedShift, setSelectedShift] = useState('morning');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
  let cancelled = false;

  async function initializePage() {
    try {
      const userResponse = await fetch(`${API_URL}/auth/me`, {
        credentials: 'include',
      });

      if (!userResponse.ok) {
        router.replace('/');
        return;
      }

      const currentUser =
        (await userResponse.json()) as CurrentUser;

      if (!cancelled) {
        setUser(currentUser);
      }

      const shiftResponse = await fetch(
        `${API_URL}/shifts/active`,
        {
          credentials: 'include',
        },
      );

      if (!shiftResponse.ok) {
        throw new Error('Aktif vardiya bilgisi alınamadı.');
      }

      const responseText = await shiftResponse.text();

      const result = responseText
        ? (JSON.parse(responseText) as {
            shift?: Record<string, unknown> | null;
          })
        : { shift: null };

      if (result.shift) {
        router.replace('/dashboard');
      }
    } catch (caughtError) {
      if (!cancelled) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Vardiya bilgileri yüklenemedi.',
        );
      }
    } finally {
      if (!cancelled) {
        setIsLoading(false);
      }
    }
  }

  void initializePage();

  return () => {
    cancelled = true;
  };
}, [router]);

async function startShift() {
    const option = SHIFT_OPTIONS.find(
      (shift) => shift.id === selectedShift,
    );

    if (!option) {
      return;
    }

    setError('');
    setIsStarting(true);

    try {
      const dates = createShiftDates(option);

      const response = await fetch(`${API_URL}/shifts/start`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...dates,
          note: note.trim() || undefined,
        }),
      });

      const result = (await response.json()) as {
        message?: string | string[];
      };

      if (!response.ok) {
        const message = Array.isArray(result.message)
          ? result.message[0]
          : result.message;

        throw new Error(message ?? 'Vardiya başlatılamadı.');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Beklenmeyen bir hata oluştu.',
      );
    } finally {
      setIsStarting(false);
    }
  }

  async function logout() {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });

    router.replace('/');
  }

  if (isLoading || !user) {
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

          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
            Çıkış
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-9">
          <p className="text-sm font-medium text-cyan-700">
            Hoş geldiniz, {user.fullName}
          </p>

          <h1 className="mt-2 text-3xl font-semibold">
            Vardiyanızı başlatın
          </h1>

          <p className="mt-3 max-w-2xl text-slate-500">
            Bugün çalışacağınız vardiyayı seçin. Başlangıç ve
            çıkış saatleri yönetici paneline kaydedilecektir.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-4 sm:grid-cols-2">
            {SHIFT_OPTIONS.map((option) => {
              const selected = selectedShift === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelectedShift(option.id)}
                  className={`relative rounded-2xl border p-6 text-left transition ${
                    selected
                      ? 'border-cyan-600 bg-white shadow-lg shadow-cyan-900/10 ring-4 ring-cyan-600/10'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {selected && (
                    <span className="absolute right-5 top-5 rounded-full bg-cyan-700 p-1 text-white">
                      <Check className="h-4 w-4" />
                    </span>
                  )}

                  <Clock3
                    className={`h-7 w-7 ${
                      selected
                        ? 'text-cyan-700'
                        : 'text-slate-400'
                    }`}
                  />

                  <h2 className="mt-5 text-lg font-semibold">
                    {option.label}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {option.description}
                  </p>

                  <p className="mt-6 text-2xl font-semibold">
                    {option.start}
                    <span className="mx-2 text-slate-300">–</span>
                    {option.end}
                  </p>
                </button>
              );
            })}
          </div>

          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold">Vardiya bilgileri</h2>

            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">
                Seçilen vardiya
              </p>
              <p className="mt-1 font-semibold">
                {
                  SHIFT_OPTIONS.find(
                    (option) => option.id === selectedShift,
                  )?.label
                }
              </p>
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-medium">
                Vardiya notu
              </span>

              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={500}
                rows={4}
                placeholder="İsteğe bağlı açıklama..."
                className="w-full resize-none rounded-xl border border-slate-200 p-3 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-600/10"
              />
            </label>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={startShift}
              disabled={isStarting}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#073b66] px-4 py-3.5 font-medium text-white hover:bg-[#052f52] disabled:opacity-60"
            >
              {isStarting ? (
                <LoaderCircle className="h-5 w-5 animate-spin" />
              ) : (
                <ArrowRight className="h-5 w-5" />
              )}

              {isStarting
                ? 'Vardiya başlatılıyor...'
                : 'Vardiyayı Başlat'}
            </button>
          </aside>
        </div>
      </section>
    </main>
  );
}