'use client';

import {
  LoaderCircle,
  MessageSquareText,
  Send,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface RideNote {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    fullName: string;
    role: 'EMPLOYEE' | 'MANAGER';
  };
}

interface RideNotesModalProps {
  rideId: string;
  routeLabel: string;
  onClose: () => void;
  onNoteCreated: () => void;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function RideNotesModal({
  rideId,
  routeLabel,
  onClose,
  onNoteCreated,
}: RideNotesModalProps) {
  const [notes, setNotes] = useState<RideNote[]>([]);
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadNotes() {
      try {
        const response = await fetch(
          `${API_URL}/rides/${rideId}/notes`,
          {
            credentials: 'include',
          },
        );

        if (!response.ok) {
          throw new Error('Sefer notları alınamadı.');
        }

        setNotes((await response.json()) as RideNote[]);
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

    void loadNotes();
  }, [rideId]);

  async function createNote() {
    const trimmedContent = content.trim();

    if (!trimmedContent || isSaving) {
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const response = await fetch(
        `${API_URL}/rides/${rideId}/notes`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: trimmedContent,
          }),
        },
      );

      if (!response.ok) {
        throw new Error('Not kaydedilemedi.');
      }

      const createdNote = (await response.json()) as RideNote;

      setNotes((currentNotes) => [
        createdNote,
        ...currentNotes,
      ]);
      setContent('');
      onNoteCreated();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Not kaydedilemedi.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-200 p-5">
          <div>
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-cyan-700" />

              <h2 className="text-lg font-semibold">
                Sefer notları
              </h2>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              {routeLabel}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Not penceresini kapat"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoaderCircle className="h-7 w-7 animate-spin text-cyan-700" />
            </div>
          ) : notes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
              <MessageSquareText className="mx-auto h-8 w-8 text-slate-300" />

              <p className="mt-3 font-medium text-slate-700">
                Bu sefere henüz not eklenmemiş
              </p>

              <p className="mt-1 text-sm text-slate-500">
                İlk yazıhane notunu aşağıdan ekleyebilirsiniz.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <article
                  key={note.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {note.content}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span>
                      {note.author.fullName}
                      {note.author.role === 'MANAGER'
                        ? ' · Yönetici'
                        : ' · Çalışan'}
                    </span>

                    <time>{formatDate(note.createdAt)}</time>
                  </div>
                </article>
              ))}
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>

        <footer className="border-t border-slate-200 p-5">
          <label
            htmlFor="ride-note"
            className="text-sm font-medium text-slate-700"
          >
            Yeni not
          </label>

          <textarea
            id="ride-note"
            value={content}
            maxLength={1000}
            rows={3}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                (event.ctrlKey || event.metaKey)
              ) {
                event.preventDefault();
                void createNote();
              }
            }}
            placeholder="Yazıhane içinde paylaşılacak notu yazın..."
            className="mt-2 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
          />

          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              {content.length}/1000 · Ctrl + Enter ile kaydet
            </span>

            <button
              type="button"
              disabled={!content.trim() || isSaving}
              onClick={() => void createNote()}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}

              Notu kaydet
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}