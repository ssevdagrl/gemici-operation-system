"use client";

import {
  BusFront,
  Clock3,
  LoaderCircle,
  MapPin,
  Phone,
  Printer,
  TicketCheck,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type RideStatus =
  | "SCHEDULED"
  | "ON_TIME"
  | "DELAYED"
  | "CANCELLED"
  | "COMPLETED";

interface RidePassenger {
  id: string;
  fullName: string;
  phone: string | null;
  seatNumber: string | null;
  ticketNumber: string | null;
  boardingPoint: string;
  passengerDestination: string | null;
  salesChannel: string | null;
  checkinStatus: string | null;
  isKocaeliPassenger: boolean;
  isCancelled: boolean;
}

interface RideDetail {
  id: string;
  plannedDeparture: string;
  plannedArrival: string | null;
  estimatedArrival: string | null;
  origin: string;
  destination: string;
  companyLineCode: string | null;
  status: RideStatus;
  delayMinutes: number;
  kocaeliPassengerCount: number;
  currentLocationName: string | null;
  currentLatitude: number | null;
  currentLongitude: number | null;
  locationUpdatedAt: string | null;
  locationStatus: string | null;
  isStarred: boolean;
  isAlert: boolean;
  vehicle: {
    plate: string;
    model: string | null;
    callShortCode: string | null;
    companyPhone: string | null;
  } | null;
  passengers: RidePassenger[];
}

interface RideDetailModalProps {
  rideId: string;
  onClose: () => void;
}

const STATUS_LABELS: Record<RideStatus, string> = {
  SCHEDULED: "Planlandı",
  ON_TIME: "Zamanında",
  DELAYED: "Gecikiyor",
  CANCELLED: "İptal",
  COMPLETED: "Tamamlandı",
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

const LOCATION_TRACKING_STARTS_BEFORE_MS = 2 * 60 * 60 * 1000;

/*
 * Konumu olmayan her seferi "Konum bekleniyor" diye göstermek yanıltıcı:
 * kimi seferin external data provider'ta radar kaydı hiç yok, kiminin de takip penceresi
 * henüz açılmamış. Bu ikisini ayırt ediyoruz.
 */
function describeLocation(ride: RideDetail) {
  if (ride.currentLocationName || ride.currentLatitude !== null) {
    return {
      title: ride.currentLocationName ?? "Konum alındı",
      detail: `Son güncelleme: ${formatDateTime(ride.locationUpdatedAt)}`,
      muted: false,
    };
  }

  if (ride.locationStatus === "NO_RADAR") {
    return {
      title: "Radar verisi yok",
      detail: "external data provider bu sefer için konum kaydı tutmuyor.",
      muted: false,
    };
  }

  const referenceValue = ride.estimatedArrival ?? ride.plannedDeparture;
  const referenceTime = new Date(referenceValue).getTime();

  if (
    !Number.isNaN(referenceTime) &&
    referenceTime - Date.now() > LOCATION_TRACKING_STARTS_BEFORE_MS
  ) {
    return {
      title: "Araç takibi başlamadı",
      detail: "Takip, Kocaeli saatine iki saat kala başlar.",
      muted: true,
    };
  }

  return {
    title: "Konum bekleniyor",
    detail: "external data provider'tan ilk konum verisi henüz gelmedi.",
    muted: true,
  };
}

function checkinLabel(value: string | null) {
  const normalizedValue = value?.trim().toLowerCase();

  if (!normalizedValue) {
    return "Bilinmiyor";
  }

  if (
    normalizedValue === "checked" ||
    normalizedValue === "checked_in" ||
    normalizedValue === "check_in"
  ) {
    return "Check-in yapıldı";
  }

  if (
    normalizedValue === "not_checked" ||
    normalizedValue === "not_checked_in"
  ) {
    return "Check-in bekliyor";
  }

  if (normalizedValue === "no_show") {
    return "Gelmedi";
  }

  return value ?? "Bilinmiyor";
}

function escapeHtml(value: string | null | undefined) {
  return (value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function RideDetailModal({ rideId, onClose }: RideDetailModalProps) {
  const [ride, setRide] = useState<RideDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadRide() {
      try {
        const response = await fetch(`${API_URL}/rides/${rideId}`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Sefer detayları alınamadı.");
        }

        const rideDetail = (await response.json()) as RideDetail;

        if (isActive) {
          setRide(rideDetail);
          setError("");
        }
      } catch (caughtError) {
        if (isActive) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Sefer detayları yüklenemedi.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadRide();

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadRide();
      }
    }, 30_000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadRide();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isActive = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [rideId]);

  function printPassengerList() {
    if (!ride) {
      return;
    }

    const printablePassengers = ride.passengers.filter(
      (passenger) => passenger.isKocaeliPassenger && !passenger.isCancelled,
    );

    const rows = printablePassengers
      .map(
        (passenger, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(passenger.seatNumber) || "—"}</td>
            <td>${escapeHtml(passenger.fullName)}</td>
            <td>${escapeHtml(passenger.phone) || "—"}</td>
            <td>${escapeHtml(passenger.boardingPoint)}</td>
            <td>${escapeHtml(passenger.passengerDestination) || "—"}</td>
            <td>${escapeHtml(passenger.ticketNumber) || "—"}</td>
            <td>${escapeHtml(passenger.salesChannel) || "Bilinmiyor"}</td>
            <td>${escapeHtml(checkinLabel(passenger.checkinStatus))}</td>
          </tr>
        `,
      )
      .join("");

    const printWindow = window.open("", "_blank", "width=1100,height=750");

    if (!printWindow) {
      window.alert(
        "Yazdırma penceresi açılamadı. Açılır pencere iznini kontrol edin.",
      );
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html lang="tr">
        <head>
          <meta charset="utf-8" />
          <title>Kocaeli Yolcu Listesi</title>
          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 32px;
              color: #0f172a;
              font-family: Arial, sans-serif;
            }

            h1 {
              margin: 0 0 8px;
              font-size: 22px;
            }

            .subtitle {
              margin-bottom: 20px;
              color: #475569;
            }

            .information {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 10px;
              margin-bottom: 22px;
              padding: 14px;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              font-size: 13px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }

            th,
            td {
              padding: 9px;
              border: 1px solid #cbd5e1;
              text-align: left;
            }

            th {
              background: #f1f5f9;
            }

            .footer {
              margin-top: 18px;
              color: #64748b;
              font-size: 11px;
            }

            @media print {
              body {
                margin: 12mm;
              }
            }
          </style>
        </head>

        <body>
          <h1>BusOps Otobüs İşletmeleri</h1>

          <div class="subtitle">
            Kocaeli Otogar Yolcu Listesi
          </div>

          <div class="information">
            <div>
              <strong>Güzergâh:</strong>
              ${escapeHtml(ride.origin)} →
              ${escapeHtml(ride.destination)}
            </div>

            <div>
              <strong>Plaka:</strong>
              ${escapeHtml(ride.vehicle?.plate) || "Atanmadı"}
            </div>

            <div>
              <strong>Hat kodu:</strong>
              ${escapeHtml(ride.companyLineCode) || "—"}
            </div>

            <div>
              <strong>Kalkış:</strong>
              ${escapeHtml(formatDateTime(ride.plannedDeparture))}
            </div>

            <div>
              <strong>Araç kısa kodu:</strong>
              ${escapeHtml(ride.vehicle?.callShortCode) || "—"}
            </div>

            <div>
              <strong>Yolcu sayısı:</strong>
              ${printablePassengers.length}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Koltuk</th>
                <th>Ad soyad</th>
                <th>Telefon</th>
                <th>Biniş</th>
                <th>Varış</th>
                <th>PNR</th>
                <th>Satış kanalı</th>
                <th>Check-in</th>
              </tr>
            </thead>

            <tbody>
              ${rows}
            </tbody>
          </table>

          <div class="footer">
            Yazdırılma zamanı:
            ${escapeHtml(formatDateTime(new Date().toISOString()))}
          </div>

          <script>
            window.addEventListener('load', () => {
              window.print();
            });
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
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
      <section className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-200 p-5">
          <div>
            <div className="flex items-center gap-2">
              <BusFront className="h-5 w-5 text-cyan-700" />

              <h2 className="text-lg font-semibold">Sefer detayları</h2>
            </div>

            {ride && (
              <p className="mt-1 text-sm text-slate-500">
                {ride.origin} → {ride.destination}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Detay penceresini kapat"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {isLoading ? (
          <div className="flex justify-center p-20">
            <LoaderCircle className="h-8 w-8 animate-spin text-cyan-700" />
          </div>
        ) : error ? (
          <div className="p-10 text-center text-red-700">{error}</div>
        ) : ride ? (
          <div className="overflow-y-auto p-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <InfoCard
                icon={<BusFront className="h-5 w-5" />}
                label="Araç"
                value={ride.vehicle?.plate ?? "Atanmadı"}
                detail={ride.vehicle?.model ?? "Model bilgisi bulunmuyor"}
              />

              <InfoCard
                icon={<TicketCheck className="h-5 w-5" />}
                label="Hat kodu"
                value={ride.companyLineCode ?? "—"}
                detail="Seferin şirket hat kodu"
              />

              <InfoCard
                icon={<Phone className="h-5 w-5" />}
                label="Araç kısa kodu"
                value={ride.vehicle?.callShortCode ?? "—"}
                detail="Araca telefonla erişim kodu"
              />

              <InfoCard
                icon={<Clock3 className="h-5 w-5" />}
                label="Kocaeli tahmini geliş"
                value={formatDateTime(ride.estimatedArrival)}
                detail={
                  ride.delayMinutes > 0
                    ? `${ride.delayMinutes} dakika gecikme`
                    : STATUS_LABELS[ride.status]
                }
              />

              <InfoCard
                icon={<Users className="h-5 w-5" />}
                label="Kocaeli yolcusu"
                value={String(
                  Math.max(
                    ride.kocaeliPassengerCount,
                    ride.passengers.filter(
                      (passenger) => !passenger.isCancelled,
                    ).length,
                  ),
                )}
                detail="Aktif Kocaeli yolcu kayıtları"
              />
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-cyan-700" />

                  <h3 className="font-semibold">Araç konumu</h3>
                </div>

                {(() => {
                  const location = describeLocation(ride);

                  return (
                    <>
                      <p
                        className={`mt-4 text-lg font-medium ${
                          location.muted ? "text-slate-500" : ""
                        }`}
                      >
                        {location.title}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {location.detail}
                      </p>
                    </>
                  );
                })()}

                {ride.currentLatitude !== null &&
                  ride.currentLongitude !== null && (
                    <a
                      href={`https://www.google.com/maps?q=${ride.currentLatitude},${ride.currentLongitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-50 px-4 py-2 text-sm font-medium text-cyan-700 transition hover:bg-cyan-100"
                    >
                      <MapPin className="h-4 w-4" />
                      Haritada aç
                    </a>
                  )}
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-cyan-700" />

                  <h3 className="font-semibold">Şirket iletişimi</h3>
                </div>

                <p className="mt-4 text-lg font-medium">
                  {ride.vehicle?.companyPhone ?? "Telefon bilgisi bulunmuyor"}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Araç şirket uzun telefon numarası
                </p>

                {ride.vehicle?.companyPhone && (
                  <a
                    href={`tel:${ride.vehicle.companyPhone.replaceAll(
                      " ",
                      "",
                    )}`}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-50 px-4 py-2 text-sm font-medium text-cyan-700 transition hover:bg-cyan-100"
                  >
                    <Phone className="h-4 w-4" />
                    Numarayı ara
                  </a>
                )}
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
                <div>
                  <h3 className="font-semibold">Kocaeli yolcu listesi</h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Yolcu iletişim ve bilet bilgileri
                  </p>
                </div>

                <button
                  type="button"
                  onClick={printPassengerList}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  <Printer className="h-4 w-4" />
                  Yolcu listesini yazdır
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Koltuk</th>
                      <th className="px-4 py-3">Ad soyad</th>
                      <th className="px-4 py-3">Telefon</th>
                      <th className="px-4 py-3">Biniş</th>
                      <th className="px-4 py-3">Varış</th>
                      <th className="px-4 py-3">PNR</th>
                      <th className="px-4 py-3">Satış kanalı</th>
                      <th className="px-4 py-3">Check-in</th>
                      <th className="px-4 py-3">Durum</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {ride.passengers.map((passenger) => (
                      <tr
                        key={passenger.id}
                        className={
                          passenger.isCancelled
                            ? "bg-red-50 text-slate-400"
                            : "hover:bg-slate-50"
                        }
                      >
                        <td className="px-4 py-3 font-semibold">
                          {passenger.seatNumber ?? "—"}
                        </td>

                        <td className="px-4 py-3">{passenger.fullName}</td>

                        <td className="px-4 py-3">
                          {passenger.phone ? (
                            <a
                              href={`tel:${passenger.phone.replaceAll(" ", "")}`}
                              className="text-cyan-700 hover:underline"
                            >
                              {passenger.phone}
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>

                        <td className="px-4 py-3">{passenger.boardingPoint}</td>

                        <td className="px-4 py-3">
                          {passenger.passengerDestination ?? "—"}
                        </td>

                        <td className="px-4 py-3">
                          {passenger.ticketNumber ?? "—"}
                        </td>

                        <td className="px-4 py-3">
                          {passenger.salesChannel ?? "Bilinmiyor"}
                        </td>

                        <td className="px-4 py-3">
                          {checkinLabel(passenger.checkinStatus)}
                        </td>

                        <td className="px-4 py-3">
                          {passenger.isCancelled ? "İptal" : "Aktif"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {ride.passengers.length === 0 && (
                  <div className="p-10 text-center text-slate-500">
                    {ride.kocaeliPassengerCount > 0
                      ? `${ride.kocaeliPassengerCount} Kocaeli yolcusu görünüyor; ayrıntılı yolcu kayıtları henüz senkronize edilmedi.`
                      : "Bu sefer için Kocaeli yolcusu bulunmuyor."}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 text-cyan-700">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>

      <p className="mt-4 font-semibold">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}