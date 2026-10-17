'use client';

import {
  ArrowLeft,
  Clock3,
  LoaderCircle,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from 'react';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type UserRole = 'EMPLOYEE' | 'MANAGER';
type ShiftStatus =
  | 'PLANNED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED';

interface ActiveShift {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
  clockedInAt: string | null;
  clockedOutAt: string | null;
  status: ShiftStatus;
  note: string | null;
}

interface AdminUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  shifts: ActiveShift[];
  _count: {
    shifts: number;
  };
}

interface ShiftHistory {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
  clockedInAt: string | null;
  clockedOutAt: string | null;
  status: ShiftStatus;
  note: string | null;
  user: {
    id: string;
    username: string;
    fullName: string;
    role: UserRole;
    isActive: boolean;
  };
}

interface CurrentUser {
  id: string;
  fullName: string;
  role: UserRole;
}

function formatDate(value: string | null) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

async function getErrorMessage(response: Response) {
  try {
    const result = (await response.json()) as {
      message?: string | string[];
    };

    if (Array.isArray(result.message)) {
      return result.message.join(' ');
    }

    return result.message ?? 'İşlem gerçekleştirilemedi.';
  } catch {
    return 'İşlem gerçekleştirilemedi.';
  }
}

export default function AdminPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [shifts, setShifts] = useState<ShiftHistory[]>([]);
  const [activeTab, setActiveTab] = useState<
    'USERS' | 'SHIFTS'
  >('USERS');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<
    string | null
  >(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [form, setForm] = useState({
    username: '',
    fullName: '',
    password: '',
    role: 'EMPLOYEE' as UserRole,
  });

  const loadAdminData = useCallback(async () => {
    const [usersResponse, shiftsResponse] = await Promise.all([
      fetch(`${API_URL}/admin/users`, {
        credentials: 'include',
      }),
      fetch(`${API_URL}/admin/shifts`, {
        credentials: 'include',
      }),
    ]);

    if (!usersResponse.ok || !shiftsResponse.ok) {
      throw new Error('Yönetici bilgileri alınamadı.');
    }

    setUsers((await usersResponse.json()) as AdminUser[]);
    setShifts(
      (await shiftsResponse.json()) as ShiftHistory[],
    );
  }, []);

  useEffect(() => {
    async function initializePage() {
      try {
        const meResponse = await fetch(`${API_URL}/auth/me`, {
          credentials: 'include',
        });

        if (!meResponse.ok) {
          router.replace('/');
          return;
        }

        const user =
          (await meResponse.json()) as CurrentUser;

        if (user.role !== 'MANAGER') {
          router.replace('/dashboard');
          return;
        }

        setCurrentUser(user);
        await loadAdminData();
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Yönetici paneli yüklenemedi.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    void initializePage();
  }, [loadAdminData, router]);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch(`${API_URL}/admin/users`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      setForm({
        username: '',
        fullName: '',
        password: '',
        role: 'EMPLOYEE',
      });
      setSuccessMessage('Kullanıcı başarıyla oluşturuldu.');
      await loadAdminData();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Kullanıcı oluşturulamadı.',
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function changeUserStatus(user: AdminUser) {
    const nextStatus = !user.isActive;

    if (
      !window.confirm(
        nextStatus
          ? `${user.fullName} kullanıcısı aktifleştirilsin mi?`
          : `${user.fullName} kullanıcısı pasifleştirilsin mi?`,
      )
    ) {
      return;
    }

    setUpdatingUserId(user.id);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch(
        `${API_URL}/admin/users/${user.id}/status`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            isActive: nextStatus,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      setSuccessMessage(
        nextStatus
          ? 'Kullanıcı aktifleştirildi.'
          : 'Kullanıcı pasifleştirildi.',
      );
      await loadAdminData();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Kullanıcı durumu güncellenemedi.',
      );
    } finally {
      setUpdatingUserId(null);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <LoaderCircle className="h-9 w-9 animate-spin text-cyan-700" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cyan-500/15 p-2.5 text-cyan-300">
              <ShieldCheck className="h-6 w-6" />
            </div>

            <div>
              <h1 className="font-semibold">Yönetici Paneli</h1>
              <p className="text-sm text-slate-400">
                {currentUser?.fullName}
              </p>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm transition hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Operasyon ekranı
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl space-y-5 p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Toplam kullanıcı"
            value={users.length}
            icon={<Users className="h-5 w-5" />}
          />
          <SummaryCard
            label="Aktif kullanıcı"
            value={users.filter((user) => user.isActive).length}
            icon={<ShieldCheck className="h-5 w-5" />}
          />
          <SummaryCard
            label="Aktif vardiya"
            value={
              users.filter((user) => user.shifts.length > 0)
                .length
            }
            icon={<Clock3 className="h-5 w-5" />}
          />
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        )}

        {successMessage && (
          <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
            {successMessage}
          </p>
        )}

        <div className="flex gap-2 rounded-xl bg-white p-2 shadow-sm">
          <TabButton
            active={activeTab === 'USERS'}
            onClick={() => setActiveTab('USERS')}
          >
            Kullanıcılar
          </TabButton>
          <TabButton
            active={activeTab === 'SHIFTS'}
            onClick={() => setActiveTab('SHIFTS')}
          >
            Vardiya geçmişi
          </TabButton>
        </div>

        {activeTab === 'USERS' ? (
          <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
            <form
              onSubmit={createUser}
              className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-cyan-700" />
                <h2 className="font-semibold">Kullanıcı ekle</h2>
              </div>

              <div className="mt-5 space-y-4">
                <FormInput
                  label="Ad soyad"
                  value={form.fullName}
                  onChange={(value) =>
                    setForm({ ...form, fullName: value })
                  }
                />
                <FormInput
                  label="Kullanıcı adı"
                  value={form.username}
                  onChange={(value) =>
                    setForm({ ...form, username: value })
                  }
                />
                <FormInput
                  label="Geçici parola"
                  type="password"
                  value={form.password}
                  onChange={(value) =>
                    setForm({ ...form, password: value })
                  }
                />

                <label className="block text-sm font-medium">
                  Yetki
                  <select
                    value={form.role}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        role: event.target.value as UserRole,
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 p-3"
                  >
                    <option value="EMPLOYEE">Çalışan</option>
                    <option value="MANAGER">Yönetici</option>
                  </select>
                </label>

                <button
                  disabled={isCreating}
                  className="flex w-full justify-center rounded-xl bg-cyan-700 p-3 font-medium text-white disabled:opacity-50"
                >
                  {isCreating ? (
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                  ) : (
                    'Kullanıcı oluştur'
                  )}
                </button>
              </div>
            </form>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b p-5">
                <h2 className="font-semibold">Kullanıcılar</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="p-4">Kullanıcı</th>
                      <th className="p-4">Rol</th>
                      <th className="p-4">Vardiya</th>
                      <th className="p-4">Durum</th>
                      <th className="p-4">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="p-4">
                          <p className="font-medium">
                            {user.fullName}
                          </p>
                          <p className="text-xs text-slate-500">
                            @{user.username}
                          </p>
                        </td>
                        <td className="p-4">
                          {user.role === 'MANAGER'
                            ? 'Yönetici'
                            : 'Çalışan'}
                        </td>
                        <td className="p-4">
                          {user.shifts.length > 0
                            ? 'Vardiyada'
                            : 'Vardiyada değil'}
                        </td>
                        <td className="p-4">
                          {user.isActive ? 'Aktif' : 'Pasif'}
                        </td>
                        <td className="p-4">
                          <button
                            type="button"
                            disabled={
                              updatingUserId === user.id
                            }
                            onClick={() =>
                              void changeUserStatus(user)
                            }
                            className="rounded-lg border px-3 py-2 disabled:opacity-50"
                          >
                            {user.isActive
                              ? 'Pasifleştir'
                              : 'Aktifleştir'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b p-5">
              <h2 className="font-semibold">Vardiya geçmişi</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="p-4">Çalışan</th>
                    <th className="p-4">Planlanan başlangıç</th>
                    <th className="p-4">Giriş</th>
                    <th className="p-4">Çıkış</th>
                    <th className="p-4">Durum</th>
                    <th className="p-4">Not</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {shifts.map((shift) => (
                    <tr key={shift.id}>
                      <td className="p-4 font-medium">
                        {shift.user.fullName}
                      </td>
                      <td className="p-4">
                        {formatDate(shift.scheduledStart)}
                      </td>
                      <td className="p-4">
                        {formatDate(shift.clockedInAt)}
                      </td>
                      <td className="p-4">
                        {formatDate(shift.clockedOutAt)}
                      </td>
                      <td className="p-4">{shift.status}</td>
                      <td className="p-4">
                        {shift.note ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="text-cyan-700">{icon}</div>
      <p className="mt-3 text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-2.5 text-sm font-medium ${
        active
          ? 'bg-slate-900 text-white'
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}

function FormInput({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        required
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-cyan-600"
      />
    </label>
  );
}