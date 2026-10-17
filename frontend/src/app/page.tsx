'use client';

import {
  BusFront,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  UserRound,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const result = (await response.json()) as {
        message?: string | string[];
      };

      if (!response.ok) {
        const message = Array.isArray(result.message)
          ? result.message[0]
          : result.message;

        throw new Error(message ?? 'Giriş yapılamadı.');
      }

      router.push('/shift');
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Beklenmeyen bir hata oluştu.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#06182f] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(14,189,189,0.18),transparent_35%),radial-gradient(circle_at_85%_80%,rgba(31,83,156,0.25),transparent_40%)]" />

      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:48px_48px]" />

      <section className="relative z-10 grid min-h-screen lg:grid-cols-[1.2fr_0.8fr]">
        <div className="hidden flex-col justify-between p-14 lg:flex">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-cyan-400/15 p-3 ring-1 ring-cyan-300/30">
              <BusFront className="h-8 w-8 text-cyan-300" />
            </div>

            <div>
              <p className="text-xl font-semibold">BusOps Operasyon</p>
              <p className="text-sm text-slate-400">
                Acente Yönetim Sistemi
              </p>
            </div>
          </div>

          <div className="max-w-2xl">
            <div className="mb-6 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-200">
              Kocaeli Otogar Operasyon Merkezi
            </div>

            <h1 className="text-5xl font-semibold leading-tight">
              Tüm sefer operasyonu
              <span className="block text-cyan-300">
                tek ekranda.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              Seferleri, yolcuları, araç konumlarını, vardiyaları
              ve yazıhane notlarını güvenli şekilde yönetin.
            </p>
          </div>

          <p className="text-sm text-slate-500">
            BusOps Otobüs İşletmeleri · Kocaeli
          </p>
        </div>

        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-white p-7 text-slate-900 shadow-2xl shadow-black/30 sm:p-10">
            <div className="mb-8 lg:hidden">
              <div className="mb-4 inline-flex rounded-2xl bg-cyan-50 p-3">
                <BusFront className="h-7 w-7 text-cyan-700" />
              </div>
              <p className="text-xl font-semibold">BusOps Operasyon</p>
            </div>

            <div className="mb-8">
              <p className="text-sm font-medium text-cyan-700">
                Hoş geldiniz
              </p>
              <h2 className="mt-2 text-3xl font-semibold">
                Hesabınıza giriş yapın
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Devam etmek için kullanıcı adı ve parolanızı girin.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">
                  Kullanıcı adı
                </span>

                <span className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 focus-within:border-cyan-600 focus-within:ring-4 focus-within:ring-cyan-600/10">
                  <UserRound className="h-5 w-5 text-slate-400" />
                  <input
                    className="w-full bg-transparent px-3 py-3.5 outline-none"
                    value={username}
                    onChange={(event) =>
                      setUsername(event.target.value)
                    }
                    autoComplete="username"
                    placeholder="Kullanıcı adınız"
                    required
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium">
                  Parola
                </span>

                <span className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 focus-within:border-cyan-600 focus-within:ring-4 focus-within:ring-cyan-600/10">
                  <LockKeyhole className="h-5 w-5 text-slate-400" />

                  <input
                    className="w-full bg-transparent px-3 py-3.5 outline-none"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    autoComplete="current-password"
                    placeholder="Parolanız"
                    required
                  />

                  <button
                    type="button"
                    className="text-slate-400 hover:text-slate-700"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label="Parolayı göster veya gizle"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </span>
              </label>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#073b66] px-4 py-3.5 font-medium text-white transition hover:bg-[#052f52] disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={isLoading}
              >
                {isLoading && (
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                )}
                {isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
              </button>
            </form>

            <p className="mt-8 text-center text-xs leading-5 text-slate-400">
              Bu sistem yalnızca yetkili BusOps Operasyon
              personeli tarafından kullanılabilir.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}