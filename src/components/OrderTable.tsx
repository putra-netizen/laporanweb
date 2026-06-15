import React, { useState } from "react";
import { OrderData } from "../types";
import { formatRupiah, INDONESIAN_MONTHS, parseDateParts, generateId } from "../utils";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Download,
  Filter,
  CheckCircle,
  AlertCircle,
  X,
  Edit2,
  Trash2,
  Plus,
} from "lucide-react";

interface OrderTableProps {
  orders: OrderData[];
  rate: number;
  onAddOrder: (order: OrderData) => void;
  onUpdateOrder: (updatedOrder: OrderData) => void;
  onDeleteOrder: (id: string) => void;
  onExportCSV: () => void;
}

export default function OrderTable({
  orders,
  rate,
  onAddOrder,
  onUpdateOrder,
  onDeleteOrder,
  onExportCSV,
}: OrderTableProps) {
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("all"); // "1" to "12" or "all"
  const [selectedYear, setSelectedYear] = useState<string>("all"); // "2026", etc or "all"
  const [selectedWorker, setSelectedWorker] = useState<string>("all");
  const [selectedAdmin, setSelectedAdmin] = useState<string>("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderData | null>(null);

  // Form Fields
  const [formTanggal, setFormTanggal] = useState("");
  const [formNoOrder, setFormNoOrder] = useState("");
  const [formNamaToko, setFormNamaToko] = useState("");
  const [formNamaKlien, setFormNamaKlien] = useState("");
  const [formNoTarget, setFormNoTarget] = useState("");
  const [formSpam, setFormSpam] = useState("");
  const [formOrderCount, setFormOrderCount] = useState<number>(10);
  const [formWorker, setFormWorker] = useState("");
  const [formAdmin, setFormAdmin] = useState("");
  const [formLimit, setFormLimit] = useState("");
  const [formLinkBukti, setFormLinkBukti] = useState("");

  const [formError, setFormError] = useState("");

  // Unique lists for dropdown filters
  const workers = Array.from(new Set(orders.map((o) => o.worker).filter(Boolean))).sort();
  const admins = Array.from(new Set(orders.map((o) => o.admin).filter(Boolean))).sort();
  const years = Array.from(
    new Set(
      orders
        .map((o) => {
          const parts = parseDateParts(o.tanggal);
          return parts ? parts.year.toString() : "";
        })
        .filter(Boolean)
    )
  ).sort();

  // Handle Form open
  const openAddForm = () => {
    // Get current date formatted in DD/MM/YYYY
    const today = new Date();
    const formattedDate = `${today.getDate().toString().padStart(2, "0")}/${(today.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${today.getFullYear()}`;

    setEditingOrder(null);
    setFormTanggal(formattedDate);
    setFormNoOrder("");
    setFormNamaToko("WA");
    setFormNamaKlien("");
    setFormNoTarget("");
    setFormSpam("Spam chat");
    setFormOrderCount(10);
    setFormWorker("");
    setFormAdmin("");
    setFormLimit("1");
    setFormLinkBukti("");
    setFormError("");
    setIsFormOpen(true);
  };

  const openEditForm = (order: OrderData) => {
    setEditingOrder(order);
    setFormTanggal(order.tanggal);
    setFormNoOrder(order.noOrder);
    setFormNamaToko(order.namaToko);
    setFormNamaKlien(order.namaKlien);
    setFormNoTarget(order.noTarget);
    setFormSpam(order.spam);
    setFormOrderCount(order.orderCount);
    setFormWorker(order.worker);
    setFormAdmin(order.admin);
    setFormLimit(order.limit);
    setFormLinkBukti(order.linkBukti);
    setFormError("");
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTanggal.trim() || !formNoOrder.trim() || !formWorker.trim() || isNaN(formOrderCount)) {
      setFormError("Mohon lengkapi kolom berlogo (*) wajib!");
      return;
    }

    // validate date format DD/MM/YYYY
    const datePattern = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!datePattern.test(formTanggal)) {
      setFormError("Format tanggal harus DD/MM/YYYY (contoh: 12/06/2026)");
      return;
    }

    const payload: OrderData = {
      id: editingOrder ? editingOrder.id : generateId(),
      tanggal: formTanggal.trim(),
      noOrder: formNoOrder.trim(),
      namaToko: formNamaToko.trim(),
      namaKlien: formNamaKlien.trim(),
      noTarget: formNoTarget.trim(),
      spam: formSpam.trim(),
      orderCount: Number(formOrderCount),
      worker: formWorker.trim(),
      admin: formAdmin.trim(),
      limit: formLimit.trim(),
      linkBukti: formLinkBukti.trim(),
      sourceId: editingOrder ? editingOrder.sourceId : "manual",
      sourceName: editingOrder ? editingOrder.sourceName : "Input Manual",
      customRate: editingOrder ? editingOrder.customRate : undefined,
    };

    if (editingOrder) {
      onUpdateOrder(payload);
    } else {
      onAddOrder(payload);
    }

    setIsFormOpen(false);
  };

  // Filter Logic
  const filteredOrders = orders.filter((o) => {
    // 1. Search term
    const s = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      o.noOrder.toLowerCase().includes(s) ||
      o.namaKlien.toLowerCase().includes(s) ||
      o.namaToko.toLowerCase().includes(s) ||
      o.worker.toLowerCase().includes(s) ||
      o.admin.toLowerCase().includes(s) ||
      o.noTarget.toLowerCase().includes(s);

    // 2. Month filter
    let matchesMonth = true;
    if (selectedMonth !== "all") {
      const parts = parseDateParts(o.tanggal);
      matchesMonth = parts ? parts.month.toString() === selectedMonth : false;
    }

    // 3. Year filter
    let matchesYear = true;
    if (selectedYear !== "all") {
      const parts = parseDateParts(o.tanggal);
      matchesYear = parts ? parts.year.toString() === selectedYear : false;
    }

    // 4. Worker filter
    const matchesWorker = selectedWorker === "all" || o.worker === selectedWorker;

    // 5. Admin filter
    const matchesAdmin = selectedAdmin === "all" || o.admin === selectedAdmin;

    return matchesSearch && matchesMonth && matchesYear && matchesWorker && matchesAdmin;
  });

  // Sort by Date descending by default (to show recent first)
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const partsA = parseDateParts(a.tanggal);
    const partsB = parseDateParts(b.tanggal);
    if (!partsA || !partsB) return 0;

    const dateA = new Date(partsA.year, partsA.month - 1, partsA.day);
    const dateB = new Date(partsB.year, partsB.month - 1, partsB.day);
    return dateB.getTime() - dateA.getTime();
  });

  // Pagination calculation
  const totalItems = sortedOrders.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = sortedOrders.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const resetAllFilters = () => {
    setSearchTerm("");
    setSelectedMonth("all");
    setSelectedYear("all");
    setSelectedWorker("all");
    setSelectedAdmin("all");
    setCurrentPage(1);
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs" id="order-table-section">
      {/* Table Title and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Daftar Transaksi Order</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola, saring, dan periksa orderan beserta rincian pembayarannya
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 px-3.5 py-2 rounded-xl text-xs font-semibold select-none shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-650 inline-block animate-pulse"></span>
            <span>Database Terhubung</span>
          </div>

          <button
            onClick={onExportCSV}
            className="px-4 py-2 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 bg-white font-semibold rounded-xl text-xs flex items-center gap-2 transition-all shadow-2xs cursor-pointer"
            id="export-csv-btn"
          >
            <Download className="h-4 w-4" />
            Ekspor Excel (CSV)
          </button>

          <button
            onClick={openAddForm}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-2xs cursor-pointer"
            id="input-order-btn"
          >
            <Plus className="h-4 w-4" />
            Input Order Manual
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 mb-5 p-4 rounded-xl bg-slate-50 border border-slate-100">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Cari Transaksi
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="No Order, worker, klien..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs placeholder:text-slate-400 bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 transition-all font-medium"
            />
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Cek Bulan
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-hidden focus:border-indigo-500"
          >
            <option value="all">Semua Bulan</option>
            {INDONESIAN_MONTHS.map((m, idx) => (
              <option key={idx} value={(idx + 1).toString()}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Tahun
          </label>
          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-hidden focus:border-indigo-500"
          >
            <option value="all">Semua Tahun</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Saring Worker
          </label>
          <select
            value={selectedWorker}
            onChange={(e) => {
              setSelectedWorker(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-hidden focus:border-indigo-500"
          >
            <option value="all">Tampilkan Semua</option>
            {workers.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col justify-between">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Saring Admin
            </label>
            <select
              value={selectedAdmin}
              onChange={(e) => {
                setSelectedAdmin(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-hidden focus:border-indigo-500 focus:ring-1"
            >
              <option value="all">Semua Admin</option>
              {admins.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Filter and Clear Filter tags */}
      {(searchTerm ||
        selectedMonth !== "all" ||
        selectedYear !== "all" ||
        selectedWorker !== "all" ||
        selectedAdmin !== "all") && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 bg-indigo-50/50 rounded-lg border border-indigo-100/50 px-3 py-2">
          <div className="text-xs text-indigo-800 font-medium flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-indigo-500" />
            Terfilter: <span className="font-bold">{totalItems}</span> dari{" "}
            <span className="font-bold">{orders.length}</span> entri order
          </div>
          <button
            onClick={resetAllFilters}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
          >
            Bersihkan Filter
          </button>
        </div>
      )}

      {/* Responsive Table Wrapper */}
      <div className="overflow-x-auto -mx-6 md:mx-0">
        <table className="w-full border-collapse text-left min-w-[1000px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
              <th className="py-3.5 px-4 w-[110px]">Tanggal</th>
              <th className="py-3.5 px-3">No Order</th>
              <th className="py-3.5 px-3">Toko / Klien</th>
              <th className="py-3.5 px-3">No Target</th>
              <th className="py-3.5 px-3">Limit / SPAM</th>
              <th className="py-3.5 px-3 text-center">Jumlah Order</th>
              <th className="py-3.5 px-3">Worker</th>
              <th className="py-3.5 px-3">Admin</th>
              <th className="py-3.5 px-3 text-right">Bayaran</th>
              <th className="py-3.5 px-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-left">
            {paginatedOrders.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                  {orders.length === 0 ? (
                    "Tidak ada data transaksi. Silakan impor dari Excel ata paste CSV contoh di menu samping."
                  ) : (
                    "Tidak ada transaksi yang cocok dengan kriteria pencarian & filter."
                  )}
                </td>
              </tr>
            ) : (
              paginatedOrders.map((ord) => {
                const currentRate = ord.customRate !== undefined ? ord.customRate : rate;
                const rowPay = ord.orderCount * currentRate;
                return (
                  <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="py-3 px-4 font-semibold text-slate-600 whitespace-nowrap">
                      {ord.tanggal}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 font-mono text-[11x] font-bold rounded-md">
                        {ord.noOrder}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800">{ord.namaKlien || "-"}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Toko: {ord.namaToko || "WA"}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {ord.noTarget === "#ERROR!" ? (
                        <span className="text-red-500 font-semibold">{ord.noTarget}</span>
                      ) : (
                        ord.noTarget || "-"
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-[11px] font-semibold text-slate-700 max-w-[130px] truncate">
                        {ord.spam || "-"}
                      </div>
                      <div className="text-[10px] text-slate-400">Limit: {ord.limit || "1"}</div>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-800 font-bold font-mono text-xs">
                      {ord.orderCount}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-700 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        {ord.worker}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium">{ord.admin || "-"}</td>
                    <td className="py-3 px-3 text-right font-mono">
                      <div className="font-bold text-emerald-600">{formatRupiah(rowPay)}</div>
                      {ord.customRate !== undefined && (
                        <div className="text-[9px] text-slate-400 font-semibold leading-none mt-0.5">@Rp {ord.customRate}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {ord.linkBukti && ord.linkBukti.trim() !== "" && (
                          <a
                            href={ord.linkBukti}
                            target="_blank"
                            referrerPolicy="no-referrer"
                            className="p-1.5 text-slate-400 hover:text-indigo-650 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Buka Bukti Link"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => openEditForm(ord)}
                          className="p-1.5 text-slate-400 hover:text-indigo-650 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Sunting order ini"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Apakah Anda yakin ingin menghapus order ${ord.noOrder} oleh ${ord.worker}?`)) {
                              onDeleteOrder(ord.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus order ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <span className={`px-1.5 py-0.5 text-[9px] rounded-md font-bold inline-block border font-mono ${
                          ord.sourceId && ord.sourceId !== "manual" 
                            ? "bg-emerald-50 text-emerald-800 border-emerald-100" 
                            : "bg-amber-50 text-amber-800 border-amber-100"
                        }`}>
                          {ord.sourceId && ord.sourceId !== "manual" ? "Synced" : "Manual"}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100 mt-4">
          <p className="text-xs text-slate-500 font-medium">
            Menampilkan <span className="font-bold">{startIndex + 1}</span> sampai{" "}
            <span className="font-bold">{Math.min(startIndex + itemsPerPage, totalItems)}</span> dari{" "}
            <span className="font-bold">{totalItems}</span> orderan
          </p>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
              // Only render limited page numbers for layout precision
              if (pg === 1 || pg === totalPages || Math.abs(pg - currentPage) <= 1) {
                return (
                  <button
                    key={pg}
                    onClick={() => handlePageChange(pg)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      currentPage === pg
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {pg}
                  </button>
                );
              } else if (pg === 2 || pg === totalPages - 1) {
                return (
                  <span key={pg} className="text-slate-400 px-1 text-xs">
                    ...
                  </span>
                );
              }
              return null;
            })}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Form Dialog Modal for Add/Edit */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
              <h4 className="text-base font-bold text-slate-800">
                {editingOrder ? "Sunting Transaksi Orderan" : "Catat Transaksi Orderan Baru"}
              </h4>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="font-semibold">{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tanggal */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Tanggal (DD/MM/YYYY) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 12/06/2026"
                    value={formTanggal}
                    onChange={(e) => setFormTanggal(e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:border-indigo-500"
                    required
                  />
                </div>

                {/* No Order */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    No Order <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: WA548 atau SLY453"
                    value={formNoOrder}
                    onChange={(e) => setFormNoOrder(e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:border-indigo-500"
                    required
                  />
                </div>

                {/* Nama Toko */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nama Toko</label>
                  <input
                    type="text"
                    placeholder="Contoh: WA, SLY, AC, NA"
                    value={formNamaToko}
                    onChange={(e) => setFormNamaToko(e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                {/* Nama Klien */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nama Klien</label>
                  <input
                    type="text"
                    placeholder="Contoh: filb, aya, 8444"
                    value={formNamaKlien}
                    onChange={(e) => setFormNamaKlien(e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                {/* No Target */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">No Target</label>
                  <input
                    type="text"
                    placeholder="Contoh: 62812xxxxx atau #ERROR!"
                    value={formNoTarget}
                    onChange={(e) => setFormNoTarget(e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                {/* SPAM */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">SPAM (Status)</label>
                  <input
                    type="text"
                    placeholder="Contoh: Spam chat, Chat&Call, Chat"
                    value={formSpam}
                    onChange={(e) => setFormSpam(e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                {/* Order count */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Jumlah Order <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Contoh: 10, 50, 200"
                    value={formOrderCount}
                    onChange={(e) => setFormOrderCount(Number(e.target.value))}
                    className="w-full text-xs font-bold bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:border-indigo-500"
                    required
                  />
                </div>

                {/* Worker */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Worker <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Nama Worker (Contoh: Romo, reh, bunga)"
                    value={formWorker}
                    onChange={(e) => setFormWorker(e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:border-indigo-500"
                    required
                  />
                </div>

                {/* Admin */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Admin</label>
                  <input
                    type="text"
                    placeholder="Nama Admin atau Era Cahaya"
                    value={formAdmin}
                    onChange={(e) => setFormAdmin(e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                {/* Limit */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">LIMIT</label>
                  <input
                    type="text"
                    placeholder="Contoh: 1, 2, 3"
                    value={formLimit}
                    onChange={(e) => setFormLimit(e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Link Bukti */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Link Bukti Gambar/Drive</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={formLinkBukti}
                  onChange={(e) => setFormLinkBukti(e.target.value)}
                  className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-800 font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <CheckCircle className="h-4 w-4" />
                  {editingOrder ? "Simpan Perubahan" : "Simpan Transaksi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
