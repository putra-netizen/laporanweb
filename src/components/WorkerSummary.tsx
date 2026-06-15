import React, { useState } from "react";
import { OrderData, WorkerPerformance } from "../types";
import { formatRupiah, parseDateParts } from "../utils";
import { Search, User, ClipboardList, TrendingUp, Calendar, ArrowRight, X } from "lucide-react";

interface WorkerSummaryProps {
  orders: OrderData[];
  rate: number;
}

export default function WorkerSummary({ orders, rate }: WorkerSummaryProps) {
  const [workerSearch, setWorkerSearch] = useState("");
  const [selectedWorkerDetail, setSelectedWorkerDetail] = useState<string | null>(null);
  const [splitBySource, setSplitBySource] = useState(false);

  // Calculate worker stats
  interface AugmentedWorkerStats extends WorkerPerformance {
    key: string;
    sourceId?: string;
    sourceName?: string;
  }

  const workerStatsMap: { [key: string]: AugmentedWorkerStats } = {};
  const totalAllOrders = orders.reduce((sum, o) => sum + o.orderCount, 0);

  orders.forEach((o) => {
    const w = o.worker || "Tanpa Nama";
    const groupKey = splitBySource && o.sourceId ? `${w}___${o.sourceId}` : w;

    if (!workerStatsMap[groupKey]) {
      workerStatsMap[groupKey] = {
        key: groupKey,
        workerName: w,
        totalOrders: 0,
        totalEarnings: 0,
        orderCountByDate: {},
        activeDaysCount: 0,
        sourceId: o.sourceId,
        sourceName: o.sourceName,
      };
    }
    workerStatsMap[groupKey].totalOrders += o.orderCount;
    const currentRate = o.customRate !== undefined ? o.customRate : rate;
    workerStatsMap[groupKey].totalEarnings += o.orderCount * currentRate;

    // Track active dates
    const date = o.tanggal;
    if (!workerStatsMap[groupKey].orderCountByDate[date]) {
      workerStatsMap[groupKey].orderCountByDate[date] = 0;
    }
    workerStatsMap[groupKey].orderCountByDate[date] += o.orderCount;
  });

  // Calculate days count
  Object.keys(workerStatsMap).forEach((gk) => {
    workerStatsMap[gk].activeDaysCount = Object.keys(workerStatsMap[gk].orderCountByDate).length;
  });

  const workerList = Object.values(workerStatsMap).sort((a, b) => b.totalOrders - a.totalOrders);

  // Filter list by search criteria
  const filteredWorkerList = workerList.filter((w) =>
    w.workerName.toLowerCase().includes(workerSearch.toLowerCase())
  );

  // Gather specific orders for details
  const selectedWorkerOrders = selectedWorkerDetail
    ? orders.filter((o) => {
        const w = o.worker || "Tanpa Nama";
        if (splitBySource && selectedWorkerDetail.includes("___")) {
          const [namePart, sourceIdPart] = selectedWorkerDetail.split("___");
          return w === namePart && o.sourceId === sourceIdPart;
        }
        return w === selectedWorkerDetail;
      }).sort((a, b) => {
        const partsA = parseDateParts(a.tanggal);
        const partsB = parseDateParts(b.tanggal);
        if (!partsA || !partsB) return 0;
        const dateA = new Date(partsA.year, partsA.month - 1, partsA.day);
        const dateB = new Date(partsB.year, partsB.month - 1, partsB.day);
        return dateB.getTime() - dateA.getTime();
      })
    : [];

  const totalWorkerOrdersSelected = selectedWorkerOrders.reduce((sum, o) => sum + o.orderCount, 0);
  const totalSelectedEarnings = selectedWorkerOrders.reduce((sum, o) => sum + (o.orderCount * (o.customRate !== undefined ? o.customRate : rate)), 0);

  // Pre-calculate modal title values
  let modalWorkerName = selectedWorkerDetail || "";
  let modalSourceName = "";
  if (selectedWorkerDetail && splitBySource && selectedWorkerDetail.includes("___")) {
    const [nameVal] = selectedWorkerDetail.split("___");
    modalWorkerName = nameVal;
    const match = selectedWorkerOrders[0];
    if (match && match.sourceName) {
      modalSourceName = match.sourceName;
    }
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs" id="worker-summary-section">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Kinerja & Produktivitas Worker</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Papan klasemen dan tinjauan upah masing-masing worker
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Combined vs Separated selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold self-start">
            <button
              type="button"
              onClick={() => setSplitBySource(false)}
              className={`px-3 py-1.5 rounded-lg transition-all duration-150 cursor-pointer ${
                !splitBySource
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Gabungkan Worker
            </button>
            <button
              type="button"
              onClick={() => setSplitBySource(true)}
              className={`px-3 py-1.5 rounded-lg transition-all duration-150 cursor-pointer ${
                splitBySource
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Pisahkan per Laporan
            </button>
          </div>

          {/* Search Worker */}
          <div className="relative w-full sm:w-56">
            <input
              type="text"
              placeholder="Cari nama worker..."
              value={workerSearch}
              onChange={(e) => setWorkerSearch(e.target.value)}
              className="w-full text-xs placeholder:text-slate-400 bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-slate-800 focus:outline-hidden focus:border-indigo-500 font-semibold"
            />
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>
      </div>

      {filteredWorkerList.length === 0 ? (
        <div className="py-12 text-center text-slate-400 font-medium border border-dashed border-slate-200 bg-slate-50 rounded-xl">
          Tidak ada data worker yang terdeteksi
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkerList.map((worker, index) => {
            const sharePercentage =
              totalAllOrders > 0 ? Math.round((worker.totalOrders / totalAllOrders) * 100) : 0;
            const initials = (worker.workerName || "W")
              .split(" ")
              .filter(Boolean)
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .substring(0, 2);

            // Set rank badge color
            let rankColor = "bg-slate-100 text-slate-700";
            if (index === 0) rankColor = "bg-amber-100 text-amber-800 border-amber-200";
            else if (index === 1) rankColor = "bg-slate-200 text-slate-800 border-slate-300";
            else if (index === 2) rankColor = "bg-amber-50 text-amber-700 border-amber-100";

            return (
              <div
                key={worker.key}
                onClick={() => setSelectedWorkerDetail(worker.key)}
                className="bg-white border border-slate-100 hover:border-indigo-100 rounded-xl p-5 shadow-2xs hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between group animate-fade-in"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm tracking-tight capitalize">
                        {initials || "W"}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors uppercase">
                          {worker.workerName}
                        </h4>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                            {worker.activeDaysCount} Hari
                          </span>
                          {splitBySource && worker.sourceName && (
                            <span className="text-[9px] bg-indigo-50/50 text-indigo-600 font-extrabold px-1.5 py-0.5 rounded-md uppercase border border-indigo-100">
                              {worker.sourceName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${rankColor}`}>
                      Rank #{index + 1}
                    </span>
                  </div>

                  {/* Orders Stats Row */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-lg p-3">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Total Order
                      </div>
                      <div className="font-bold text-slate-800 text-sm font-mono mt-0.5">
                        {worker.totalOrders} <span className="text-[10px] text-slate-400">pcs</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Total Upah
                      </div>
                      <div className="font-bold text-emerald-600 text-sm font-mono mt-0.5">
                        {formatRupiah(worker.totalEarnings)}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-[11px] text-slate-500 font-semibold mb-1">
                      <span>Kontribusi Kontrak</span>
                      <span>{sharePercentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${sharePercentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 group-hover:text-indigo-600 font-bold mt-5 pt-3 border-t border-slate-50 transition-colors">
                  <span>Lihat Detail Pekerjaan</span>
                  <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Worker Details Drill Down Modal */}
      {selectedWorkerDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm uppercase">
                  {modalWorkerName ? modalWorkerName[0].toUpperCase() : "W"}
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    Detail Pekerjaan: <span className="uppercase">{modalWorkerName}</span>
                    {modalSourceName && (
                      <span className="text-[10px] bg-indigo-100 text-indigo-850 border border-indigo-200 font-extrabold px-2 py-0.5 rounded-md uppercase">
                        {modalSourceName}
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-400">
                    Menampilkan seluruh log transaksi order untuk worker ini
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedWorkerDetail(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Metrics of chosen Worker */}
            <div className="grid grid-cols-3 gap-3 p-5 bg-indigo-50/50 border-b border-indigo-100">
              <div className="bg-white p-3.5 rounded-xl border border-indigo-100">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                  <ClipboardList className="h-3 w-3 text-indigo-500" /> Total Orderan
                </div>
                <div className="text-xl font-bold text-slate-800 font-mono">
                  {totalWorkerOrdersSelected.toLocaleString("id-ID")}
                </div>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-indigo-100">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-emerald-500" /> Total Pendapatan
                </div>
                <div className="text-xl font-bold text-emerald-600 font-mono">
                  {formatRupiah(totalSelectedEarnings)}
                </div>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-indigo-100">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-sky-500" /> Hari Aktif
                </div>
                <div className="text-xl font-bold text-slate-800 font-mono">
                  {new Set(selectedWorkerOrders.map((o) => o.tanggal)).size} Hari
                </div>
              </div>
            </div>

            {/* Selected Worker Table Log */}
            <div className="overflow-y-auto flex-1 p-5">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">No Order</th>
                    <th className="py-2.5 px-3">Klien (Toko)</th>
                    <th className="py-2.5 px-3 text-center">Jumlah</th>
                    <th className="py-2.5 px-3">Admin</th>
                    <th className="py-2.5 px-3 text-right">Pembayaran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedWorkerOrders.map((itm) => (
                    <tr key={itm.id} className="hover:bg-slate-50/60 font-semibold text-slate-700">
                      <td className="py-2.5 px-3 text-slate-500 font-medium">{itm.tanggal}</td>
                      <td className="py-2.5 px-3 font-mono text-indigo-700">{itm.noOrder}</td>
                      <td className="py-2.5 px-3">
                        {itm.namaKlien || "-"} <span className="text-[10px] text-slate-400">({itm.namaToko})</span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold font-mono">{itm.orderCount}</td>
                      <td className="py-2.5 px-3 text-slate-500 font-normal">{itm.admin || "-"}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-600 font-bold font-mono">
                        {formatRupiah(itm.orderCount * (itm.customRate !== undefined ? itm.customRate : rate))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-100 p-4 flex justify-end">
              <button
                onClick={() => setSelectedWorkerDetail(null)}
                className="px-5 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
