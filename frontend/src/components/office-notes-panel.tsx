'use client';

import {
  ClipboardList,
  LoaderCircle,
  Pin,
  Send,
  Trash2,
} from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface OfficeNote {
  id: string;
  content: string;
  isPinned: boolean;
  expiresAt: string | null;
  createdAt: string;
  author: {
    id: string;
    fullName: string;
    role: 'EMPLOYEE' | 'MANAGER';
  };
}

interface OfficeNotesPanelProps {
  isManager: boolean;
}

function formatDate(value: string) {
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

    return Array.isArray(result.message)
      ? result.message.join(' ')
      : result.message ?? 'İşlem gerçekleştirilemedi.';
  } catch {
    return 'İşlem gerçekleştirilemedi.';
  }
}

export function OfficeNotesPanel({
  isManager,
}: OfficeNotesPanelProps) {
  const [notes, setNotes] = useState<OfficeNote[]>([]);
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState('');

  async function loadNotes() {
    try {
      const response = await fetch(`${API_URL}/office-notes`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      setNotes((await response.json()) as OfficeNote[]);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Notlar yüklenemedi.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadNotes();
  }, []);

  async function createNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!content.trim()) {
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/office-notes`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      setContent('');
      await loadNotes();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Not eklenemedi.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function updateNote(
    noteId: string,
    data: {
      isPinned?: boolean;
      isActive?: boolean;
    },
  ) {
    setUpdatingId(noteId);
    setError('');

    try {
      const response = await fetch(
        `${API_URL}/office-notes/${noteId}`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      await loadNotes();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Not güncellenemedi.',
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-cyan-700" />
          <h2 className="font-semibold">Yazıhane genel notları</h2>
        </div>

        <p className="mt-1 text-sm text-slate-500">
          Vardiyalar arasında paylaşılacak genel bilgiler
        </p>

        <form
          onSubmit={createNote}
          className="mt-4 flex flex-col gap-3 sm:flex-row"
        >
          <textarea
            required
            rows={2}
            maxLength={1000}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Yeni yazıhane notu..."
            className="min-h-20 flex-1 resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-cyan-600"
          />

          <button
            disabled={isSaving || !content.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-700 px-5 py-3 font-medium text-white disabled:opacity-50"
          >
            {isSaving ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
            Not ekle
          </button>
        </form>
      </div>

      {error && (
        <p className="m-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {isLoading ? (
        <div className="flex justify-center p-10">
          <LoaderCircle className="h-7 w-7 animate-spin text-cyan-700" />
        </div>
      ) : notes.length === 0 ? (
        <p className="p-10 text-center text-slate-500">
          Henüz genel not bulunmuyor.
        </p>
      ) : (
        <div className="divide-y divide-slate-100">
          {notes.map((note) => (
            <article
              key={note.id}
              className={`p-5 ${
                note.isPinned ? 'bg-amber-50' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  {note.isPinned && (
                    <span className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                      <Pin className="h-3.5 w-3.5" />
                      Sabitlenmiş not
                    </span>
                  )}

                  <p className="whitespace-pre-wrap text-sm leading-6">
                    {note.content}
                  </p>

                  <p className="mt-3 text-xs text-slate-500">
                    {note.author.fullName} ·{' '}
                    {note.author.role === 'MANAGER'
                      ? 'Yönetici'
                      : 'Çalışan'}{' '}
                    · {formatDate(note.createdAt)}
                  </p>
                </div>

                {isManager && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={updatingId === note.id}
                      title={
                        note.isPinned
                          ? 'Sabitlemeyi kaldır'
                          : 'Notu sabitle'
                      }
                      onClick={() =>
                        void updateNote(note.id, {
                          isPinned: !note.isPinned,
                        })
                      }
                      className="rounded-lg border p-2 text-amber-600 disabled:opacity-50"
                    >
                      <Pin className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      disabled={updatingId === note.id}
                      title="Notu kaldır"
                      onClick={() => {
                        if (
                          window.confirm(
                            'Bu genel not kaldırılsın mı?',
                          )
                        ) {
                          void updateNote(note.id, {
                            isActive: false,
                          });
                        }
                      }}
                      className="rounded-lg border p-2 text-red-600 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}