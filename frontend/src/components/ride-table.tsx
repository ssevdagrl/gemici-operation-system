"use client";

import {
  BusFront,
  CircleX,
  Clock3,
  Eye,
  LoaderCircle,
  MessageSquareText,
  RefreshCw,
  Search,
  Star,
  TriangleAlert,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RideDetailModal } from "./ride-detail-modal";
import { RideNotesModal } from "./ride-notes-modal";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type RideStatus =
  | "SCHEDULED"
  | "ON_TIME"
  | "DELAYED"
  | "CANCELLED"
  | "COMPLETED";

interface Ride {
  id: string;
  plannedDeparture: string;
  estimatedArrival: string | null;
  origin: string;
  destination: string;
  platform: string | null;
  status: RideStatus;
  delayMinutes: number;
  currentLocationName: string | null;
  currentLatitude: number | null;
  currentLongitude: number | null;
  locationUpdatedAt: string | null;
  locationStatus: string | null;
  hasPassedKocaeli: boolean;
  kocaeliPassengerCount: number;
  companyLineCode: string | null;
  lastSyncedAt: string | null;
  isStarred: boolean;
  isAlert: boolean;
  vehicle: {
    plate: string;
    model: string | null;
    callShortCode: string | null;
    companyPhone: string | null;
  } | null;
  _count: {
    notes: number;
  };
}

const STATUS_LABELS: Record<RideStatus, string> = {
  SCHEDULED: "Planlandı",
  ON_TIME: "Zamanında",
  DELAYED: "Gecikiyor",
  CANCELLED: "İptal",
  COMPLETED: "Tamamlandı",
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function todayValue() {
  return new Intl.DateTimeFormat("sv-SE").format(new Date());
}

function timeValueToMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function matchesTimeRange(
  departureValue: string,
  startTime: string,
  endTime: string,
) {
  const departure = new Date(departureValue);
  const departureMinutes = departure.getHours() * 60 + departure.getMinutes();

  if (!startTime && !endTime) return true;

  if (startTime && !endTime) {
    return departureMinutes >= timeValueToMinutes(startTime);
  }

  if (!startTime && endTime) {
    return departureMinutes <= timeValueToMinutes(endTime);
  }

  const startMinutes = timeValueToMinutes(startTime);
  const endMinutes = timeValueToMinutes(endTime);

  if (startMinutes <= endMinutes) {
    return departureMinutes >= startMinutes && departureMinutes <= endMinutes;
  }

  return departureMinutes >= startMinutes || departureMinutes <= endMinutes;
}

function statusStyle(status: RideStatus) {
  switch (status) {
    case "ON_TIME":
      return "bg-emerald-50 text-emerald-700";
    case "DELAYED":
      return "bg-amber-50 text-amber-700";
    case "CANCELLED":
      return "bg-red-50 text-red-700";
    case "COMPLETED":
      return "bg-slate-100 text-slate-500";
    default:
      return "bg-blue-50 text-blue-700";
  }
}

export function RideTable() {
  const router = useRouter();
  const [rides, setRides] = useState<Ride[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | RideStatus>("ALL");
  const [origin, setOrigin] = useState("ALL");
  const [destination, setDestination] = useState("ALL");
  const [selectedDate, setSelectedDate] = useState(todayValue);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [onlyStarred, setOnlyStarred] = useState(false);
  const [onlyAlert, setOnlyAlert] = useState(false);
  /*
   * Aracı henüz atanmamış seferler operasyonda işe yaramıyor: external data provider
   * onlara plaka da radar kaydı da vermiyor ve Kocaeli'den binen
   * yolcuları olmuyor. Varsayılan olarak gizli, istendiğinde açılır.
   */
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [updatingMarker, setUpdatingMarker] = useState<string | null>(null);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [selectedDetailRideId, setSelectedDetailRideId] = useState<
    string | null
  >(null);

  const loadRides = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setIsRefreshing(true);

      try {
        const parameters = new URLSearchParams({ date: selectedDate });
        const response = await fetch(`${API_URL}/rides?${parameters}`, {
          credentials: "include",
          cache: "no-store",
        });

        if (response.status === 401) {
          router.replace("/");
          return;
        }

        if (!response.ok) throw new Error("Seferler alınamadı.");

        setRides((await response.json()) as Ride[]);
        setLastUpdatedAt(new Date());
        setError("");
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Seferler yüklenemedi.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [router, selectedDate],
  );

  useEffect(() => {
    void loadRides();

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadRides();
      }
    }, 30_000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void loadRides();
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [loadRides]);

  async function updateMarker(
    rideId: string,
    field: "isStarred" | "isAlert",
    value: boolean,
  ) {
    const markerKey = `${rideId}-${field}`;
    setUpdatingMarker(markerKey);

    try {
      const response = await fetch(`${API_URL}/rides/${rideId}/marker`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          [field]: value,
        }),
      });

      if (!response.ok) {
        throw new Error("Sefer işareti kaydedilemedi.");
      }

      const updatedMarker = (await response.json()) as {
        rideId: string;
        isStarred: boolean;
        isAlert: boolean;
      };

      setRides((currentRides) =>
        currentRides.map((ride) =>
          ride.id === rideId
            ? {
                ...ride,
                isStarred: updatedMarker.isStarred,
                isAlert: updatedMarker.isAlert,
              }
            : ride,
        ),
      );
    } catch (caughtError) {
      window.alert(
        caughtError instanceof Error
          ? caughtError.message
          : "İşaret kaydedilemedi.",
      );
    } finally {
      setUpdatingMarker(null);
    }
  }

  function increaseNoteCount(rideId: string) {
    setRides((currentRides) =>
      currentRides.map((ride) =>
        ride.id === rideId
          ? {
              ...ride,
              _count: {
                ...ride._count,
                notes: ride._count.notes + 1,
              },
            }
          : ride,
      ),
    );

    setSelectedRide((currentRide) =>
      currentRide?.id === rideId
        ? {
            ...currentRide,
            _count: {
              ...currentRide._count,
              notes: currentRide._count.notes + 1,
            },
          }
        : currentRide,
    );
  }

  const origins = useMemo(
    () => [...new Set(rides.map((ride) => ride.origin))],
    [rides],
  );

  const destinations = useMemo(
    () => [...new Set(rides.map((ride) => ride.destination))],
    [rides],
  );

  /*
   * Özet kartları da tablo da aynı listeyi esas alsın: aracı atanmamış
   * seferler gizliyken kartın "121 sefer" deyip tabloda 68 satır
   * göstermesi kafa karıştırıcı olurdu.
   */
  const visibleRides = useMemo(
    () => rides.filter((ride) => showUnassigned || ride.vehicle !== null),
    [rides, showUnassigned],
  );

  const filteredRides = useMemo(() => {
    const normalizedSearch = search.toLocaleLowerCase("tr-TR");

    return visibleRides.filter((ride) => {
      const searchableText = [
        ride.origin,
        ride.destination,
        ride.vehicle?.plate,
        ride.companyLineCode,
        ride.vehicle?.callShortCode,
        ride.vehicle?.companyPhone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      return (
        searchableText.includes(normalizedSearch) &&
        matchesTimeRange(ride.plannedDeparture, startTime, endTime) &&
        (status === "ALL" || ride.status === status) &&
        (origin === "ALL" || ride.origin === origin) &&
        (destination === "ALL" || ride.destination === destination) &&
        (!onlyStarred || ride.isStarred) &&
        (!onlyAlert || ride.isAlert)
      );
    });
  }, [
    visibleRides,
    search,
    status,
    origin,
    destination,
    startTime,
    endTime,
    onlyStarred,
    onlyAlert,
  ]);

  const unassignedCount = rides.filter((ride) => ride.vehicle === null).length;

  /*
   * Verinin gerçekten ne zaman tazelendiği. Eklentinin "son yakalama"
   * zamanı bunun yerine kullanılamaz: hiç iş yapmadan tamamlanan bir
   * senkron bile onu güncelliyor, dolayısıyla senkron saatlerce ölü
   * kalsa da güncel görünüyordu.
   */
  const lastSyncedAt = useMemo(() => {
    const timestamps = rides
      .map((ride) =>
        ride.lastSyncedAt ? new Date(ride.lastSyncedAt).getTime() : null,
      )
      .filter((value): value is number => value !== null && !Number.isNaN(value));

    return timestamps.length > 0 ? Math.max(...timestamps) : null;
  }, [rides]);

  const staleMinutes =
    lastSyncedAt === null
      ? null
      : Math.floor((Date.now() - lastSyncedAt) / 60_000);

  const isStale = staleMinutes !== null && staleMinutes >= 20;

  const delayedCount = visibleRides.filter(
    (ride) => ride.status === "DELAYED",
  ).length;

  const cancelledCount = visibleRides.filter(
    (ride) => ride.status === "CANCELLED",
  ).length;

  const passengerCount = visibleRides.reduce(
    (total, ride) => total + ride.kocaeliPassengerCount,
    0,
  );

  return (
    <section className="mt-6 space-y-5">
      {isStale && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />

          <div>
            <p className="font-semibold">Veriler güncel olmayabilir</p>

            <p className="mt-1 text-sm leading-6">
              Seferler {staleMinutes} dakikadır external data provider ile
              güncellenmedi. Ekrandaki bilgiler son başarılı
              senkronizasyona ait. external data provider sekmesinin açık ve oturumunun
              geçerli olduğundan emin olun.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Toplam sefer"
          value={visibleRides.length}
          icon={<BusFront className="h-5 w-5" />}
          color="bg-blue-50 text-blue-700"
        />

        <SummaryCard
          label="Geciken"
          value={delayedCount}
          icon={<Clock3 className="h-5 w-5" />}
          color="bg-amber-50 text-amber-700"
        />

        <SummaryCard
          label="İptal"
          value={cancelledCount}
          icon={<CircleX className="h-5 w-5" />}
          color="bg-red-50 text-red-700"
        />

        <SummaryCard
          label="Kocaeli yolcusu"
          value={passengerCount}
          icon={<Users className="h-5 w-5" />}
          color="bg-emerald-50 text-emerald-700"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <div className="flex flex-col justify-between gap-4 xl:flex-row">
            <div>
              <h2 className="text-lg font-semibold">Canlı seferler</h2>

              <p className="mt-1 text-sm text-slate-500">
                Günlük araç ve sefer operasyonu
              </p>
              <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                <span>
                  Son güncelleme:{" "}
                  {lastUpdatedAt
                    ? formatTime(lastUpdatedAt.toISOString())
                    : "—"}
                </span>
                <button
                  type="button"
                  disabled={isRefreshing}
                  onClick={() => void loadRides(true)}
                  className="inline-flex items-center gap-1 text-cyan-700 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  Yenile
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                aria-label="Sefer tarihi"
              />

              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
                <span className="whitespace-nowrap text-slate-500">
                  Başlangıç
                </span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  className="bg-transparent outline-none"
                  aria-label="Başlangıç saati"
                />
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
                <span className="whitespace-nowrap text-slate-500">Bitiş</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  className="bg-transparent outline-none"
                  aria-label="Bitiş saati"
                />
              </label>

              {(startTime || endTime) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartTime("");
                    setEndTime("");
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50"
                >
                  Saati temizle
                </button>
              )}

              <label className="flex min-w-60 flex-1 items-center rounded-lg border border-slate-200 px-3">
                <Search className="h-4 w-4 text-slate-400" />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Plaka, güzergâh veya hat kodu..."
                  className="w-full px-3 py-2.5 text-sm outline-none"
                />
              </label>

              <select
                value={origin}
                onChange={(event) => setOrigin(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
              >
                <option value="ALL">Tüm kalkışlar</option>

                {origins.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>

              <select
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
              >
                <option value="ALL">Tüm varışlar</option>

                {destinations.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>

              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as "ALL" | RideStatus)
                }
                className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
              >
                <option value="ALL">Tüm durumlar</option>
                <option value="ON_TIME">Zamanında</option>
                <option value="DELAYED">Geciken</option>
                <option value="CANCELLED">İptal</option>
                <option value="SCHEDULED">Planlanan</option>
                <option value="COMPLETED">Tamamlanan</option>
              </select>

              <button
                type="button"
                onClick={() => setOnlyStarred((value) => !value)}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm ${onlyStarred ? "border-amber-300 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-600"}`}
              >
                <Star
                  className="h-4 w-4"
                  fill={onlyStarred ? "currentColor" : "none"}
                />
                Yıldızlılar
              </button>

              <button
                type="button"
                onClick={() => setOnlyAlert((value) => !value)}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm ${onlyAlert ? "border-red-300 bg-red-50 text-red-700" : "border-slate-200 text-slate-600"}`}
              >
                <TriangleAlert className="h-4 w-4" />
                Ünlemliler
              </button>

              {unassignedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowUnassigned((value) => !value)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm ${showUnassigned ? "border-slate-400 bg-slate-100 text-slate-700" : "border-slate-200 text-slate-600"}`}
                  title="external data provider'ta henüz araç atanmamış seferler"
                >
                  Araçsız ({unassignedCount})
                </button>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-14">
            <LoaderCircle className="h-7 w-7 animate-spin text-cyan-700" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-700">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4">Saat</th>
                  <th className="px-5 py-4">Güzergâh</th>
                  <th className="px-5 py-4">Hat kodu</th>
                  <th className="px-5 py-4">Plaka</th>
                  <th className="px-5 py-4">Araç kısa kodu</th>
                  <th className="px-5 py-4">Araç GSM</th>
                  <th className="px-5 py-4">Konum</th>
                  <th className="px-5 py-4">Yolcu</th>
                  <th className="px-5 py-4">Durum</th>
                  <th className="px-5 py-4">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRides.map((ride) => (
                  <tr key={ride.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-4 font-semibold">
                      {formatTime(ride.plannedDeparture)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="space-y-1 font-medium text-slate-800">
                        <p>{ride.origin}</p>
                        <p className="flex items-center gap-1.5">
                          <span aria-hidden="true" className="text-slate-400">
                            →
                          </span>
                          {ride.destination}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4 font-medium">
                      {ride.companyLineCode ?? "—"}
                    </td>

                    <td className="px-5 py-4">
                      {ride.vehicle?.plate ?? "Atanmadı"}
                    </td>

                    <td className="px-5 py-4 font-medium">
                      {ride.vehicle?.callShortCode ?? "—"}
                    </td>

                    <td className="px-5 py-4">
                      {ride.vehicle?.companyPhone ? (
                        <a
                          href={`tel:${ride.vehicle.companyPhone}`}
                          className="text-cyan-700 hover:underline"
                        >
                          {ride.vehicle.companyPhone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-col items-start gap-1">
                        {ride.hasPassedKocaeli && (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            Kocaeli geçildi
                          </span>
                        )}

                        {ride.currentLatitude != null &&
                        ride.currentLongitude != null ? (
                          <a
                            href={`https://www.google.com/maps?q=${ride.currentLatitude},${ride.currentLongitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-cyan-700 hover:underline"
                            title="Konumu haritada aç"
                          >
                            {ride.currentLocationName ?? "Haritada aç"}
                          </a>
                        ) : (
                          <span className="text-slate-400">
                            {ride.currentLocationName ??
                              (ride.locationStatus === "NO_RADAR"
                                ? "Radar verisi yok"
                                : "Konum bekleniyor")}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 font-medium">
                      {ride.kocaeliPassengerCount}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1.5 text-xs font-medium ${statusStyle(
                          ride.status,
                        )}`}
                      >
                        {STATUS_LABELS[ride.status]}

                        {ride.delayMinutes > 0 && ` · ${ride.delayMinutes} dk`}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          title={
                            ride.isStarred
                              ? "Yıldızı kaldır"
                              : "Seferi yıldızla"
                          }
                          aria-label={
                            ride.isStarred
                              ? "Yıldızı kaldır"
                              : "Seferi yıldızla"
                          }
                          disabled={updatingMarker === `${ride.id}-isStarred`}
                          onClick={() =>
                            void updateMarker(
                              ride.id,
                              "isStarred",
                              !ride.isStarred,
                            )
                          }
                          className={`rounded-lg border p-2 transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            ride.isStarred
                              ? "border-amber-300 bg-amber-50 text-amber-500"
                              : "border-slate-200 text-slate-400 hover:bg-slate-50"
                          }`}
                        >
                          {updatingMarker === `${ride.id}-isStarred` ? (
                            <LoaderCircle className="h-5 w-5 animate-spin" />
                          ) : (
                            <Star
                              className="h-5 w-5"
                              fill={ride.isStarred ? "currentColor" : "none"}
                            />
                          )}
                        </button>

                        <button
                          type="button"
                          title={
                            ride.isAlert ? "Ünlemi kaldır" : "Sefere ünlem koy"
                          }
                          aria-label={
                            ride.isAlert ? "Ünlemi kaldır" : "Sefere ünlem koy"
                          }
                          disabled={updatingMarker === `${ride.id}-isAlert`}
                          onClick={() =>
                            void updateMarker(ride.id, "isAlert", !ride.isAlert)
                          }
                          className={`rounded-lg border p-2 transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            ride.isAlert
                              ? "border-red-300 bg-red-50 text-red-600"
                              : "border-slate-200 text-slate-400 hover:bg-slate-50"
                          }`}
                        >
                          {updatingMarker === `${ride.id}-isAlert` ? (
                            <LoaderCircle className="h-5 w-5 animate-spin" />
                          ) : (
                            <TriangleAlert className="h-5 w-5" />
                          )}
                        </button>

                        <button
                          type="button"
                          title="Sefer notlarını aç"
                          aria-label="Sefer notlarını aç"
                          onClick={() => setSelectedRide(ride)}
                          className="relative rounded-lg border border-slate-200 p-2 text-slate-400 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700"
                        >
                          <MessageSquareText className="h-5 w-5" />

                          {ride._count.notes > 0 && (
                            <span className="absolute -right-2 -top-2 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-cyan-700 px-1 text-[10px] font-semibold text-white">
                              {ride._count.notes}
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          title="Sefer detaylarını aç"
                          aria-label="Sefer detaylarını aç"
                          onClick={() => setSelectedDetailRideId(ride.id)}
                          className="rounded-lg border border-slate-200 p-2 text-slate-400 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredRides.length === 0 && (
              <div className="p-10 text-center text-slate-500">
                Filtrelere uygun sefer bulunamadı.
              </div>
            )}
          </div>
        )}
      </div>

      {selectedRide && (
        <RideNotesModal
          rideId={selectedRide.id}
          routeLabel={`${selectedRide.origin} → ${selectedRide.destination}`}
          onClose={() => setSelectedRide(null)}
          onNoteCreated={() => increaseNoteCount(selectedRide.id)}
        />
      )}

      {selectedDetailRideId && (
        <RideDetailModal
          rideId={selectedDetailRideId}
          onClose={() => setSelectedDetailRideId(null)}
        />
      )}
    </section>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`inline-flex rounded-xl p-2.5 ${color}`}>{icon}</div>

      <p className="mt-4 text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}