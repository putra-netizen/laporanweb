import React, { useState } from "react";
import { ShopeeTransaction } from "../types";
import { formatRupiah, generateId } from "../utils";
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  Download,
  Filter,
  ShoppingBag,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  X,
  CreditCard,
  XCircle,
  FileCheck,
  RefreshCw
} from "lucide-react";

interface ShopeeTableProps {
  shopeeTransactions: ShopeeTransaction[];
  onAddTransaction: (tx: ShopeeTransaction) => void;
  onUpdateTransaction: (tx: ShopeeTransaction) => void;
  onDeleteTransaction: (id: string) => void;
  onExportShopeeCSV: () => void;
  onSyncGoogleSheets?: () => void;
  isSyncing?: boolean;
}

export default function ShopeeTable({
  shopeeTransactions,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onExportShopeeCSV,
  onSyncGoogleSheets,
  isSyncing = false,
}: ShopeeTableProps) {
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTipe, setSelectedTipe] = useState<string>("ALL");
  const [selectedJenis, setSelectedJenis] = useState<string>("ALL");

  // Form modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<ShopeeTransaction | null>(null);

  // Form Fields State
  const [tanggal, setTanggal] = useState("");
  const [tipe, setTipe] = useState("Penghasilan dari Pesanan");
  const [deskripsi, setDeskripsi] = useState("");
  const [noPesanan, setNoPesanan] = useState("");
  const [jenis, setJenis] = useState("Transaksi Masuk");
  const [jumlah, setJumlah] = useState<number>(0);
  const [status, setStatus] = useState("Transaksi Selesai");
  const [saldoAkhir, setSaldoAkhir] = useState<number>(0);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Derived calculations specifically for the Shopee dashboard view
  const totalIn = shopeeTransactions
    .filter((t) => t.jumlah > 0)
    .reduce((sum, t) => sum + t.jumlah, 0);

  const totalOut = shopeeTransactions
    .filter((t) => t.jumlah < 0)
    .reduce((sum, t) => sum + t.jumlah, 0);

  const totalPenarikan = shopeeTransactions
    .filter((t) => t.tipeTransaksi === "Penarikan Dana")
    .reduce((sum, t) => sum + t.jumlah, 0);

  // Filter transactions
  const filteredTransactions = shopeeTransactions.filter((t) => {
    const matchesSearch =
      (t.noPesanan || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.deskripsi || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.tipeTransaksi || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTipe = selectedTipe === "ALL" || t.tipeTransaksi === selectedTipe;
    const matchesJenis = selectedJenis === "ALL" || t.jenisTransaksi === selectedJenis;

    return matchesSearch && matchesTipe && matchesJenis;
  });

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Get unique transaction types for filter
  const tipeOptions = Array.from(new Set(shopeeTransactions.map((t) => t.tipeTransaksi).filter(Boolean)));

  const openAddModal = () => {
    setEditingTx(null);
    const now = new Date();
    const formattedNow = now.toISOString().replace("T", " ").substring(0, 19);
    setTanggal(formattedNow);
    setTipe("Omset");
    setDeskripsi("Pemasukan Shopee (Omset)");
    setNoPesanan("-");
    setJenis("Transaksi Masuk");
    setJumlah(50000);
    setStatus("Transaksi Selesai");
    setSaldoAkhir(0);
    setIsModalOpen(true);
  };

  const openEditModal = (tx: ShopeeTransaction) => {
    setEditingTx(tx);
    setTanggal(tx.tanggalTransaksi);
    setTipe(tx.tipeTransaksi);
    setDeskripsi(tx.deskripsi);
    setNoPesanan(tx.noPesanan);
    setJenis(tx.jenisTransaksi);
    setJumlah(tx.jumlah);
    setStatus(tx.status);
    setSaldoAkhir(tx.saldoAkhir || 0);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const preparedTx: ShopeeTransaction = {
      id: editingTx ? editingTx.id : generateId(),
      tanggalTransaksi: tanggal,
      tipeTransaksi: tipe,
      deskripsi,
      noPesanan: noPesanan.trim() || "-",
      jenisTransaksi: jenis,
      jumlah: Number(jumlah),
      status,
      saldoAkhir: Number(saldoAkhir),
    };

    if (editingTx) {
      onUpdateTransaction(preparedTx);
    } else {
      onAddTransaction(preparedTx);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6" id="shopee-table-view">
      
      {/* 1. Shopee Wallet KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-orange-50 to-amber-50/30 border border-orange-100 rounded-xl p-4 shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-orange-600 font-extrabold uppercase tracking-wider block">Total Omzet Masuk</span>
            <span className="text-xl font-bold text-slate-800 mt-1 block">{formatRupiah(totalIn)}</span>
            <span className="text-[9px] text-slate-400 font-bold block mt-0.5">Semua Transaksi Masuk</span>
          </div>
          <div className="p-2.5 bg-orange-100/80 rounded-lg text-orange-600 border border-orange-200">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-rose-50 to-rose-100/20 border border-rose-100 rounded-xl p-4 shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-rose-600 font-extrabold uppercase tracking-wider block">Sudah Di-WD (Ditarik)</span>
            <span className="text-xl font-bold text-slate-800 mt-1 block">{formatRupiah(Math.abs(totalPenarikan))}</span>
            <span className="text-[9px] text-slate-400 font-bold block mt-0.5">Penarikan Saldo Toko</span>
          </div>
          <div className="p-2.5 bg-rose-100/85 rounded-lg text-rose-600 border border-rose-200">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/10 border border-emerald-100 rounded-xl p-4 shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-wider block">Selisih Alur Dana</span>
            <span className={`text-xl font-bold mt-1 block ${totalIn + totalOut >= 0 ? "text-slate-800" : "text-rose-700"}`}>
              {formatRupiah(totalIn + totalOut)}
            </span>
            <span className="text-[9px] text-slate-400 font-bold block mt-0.5">Sisa di Buku Kas Shopee</span>
          </div>
          <div className="p-2.5 bg-emerald-100/80 rounded-lg text-emerald-600 border border-emerald-200">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. Controls Row */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Header */}
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-orange-500" />
              <span>Pemasukan Finansial Shopee</span>
              <span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full font-bold text-[9px] uppercase tracking-wider">
                {shopeeTransactions.length} Log
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola penarikan dana & komisi pesanan marketplace Shopee Indonesia.
            </p>
          </div>

          {/* Action Row Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {onSyncGoogleSheets && (
              <button
                onClick={onSyncGoogleSheets}
                disabled={isSyncing}
                className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 hover:border-amber-300 disabled:opacity-50 font-extrabold rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-amber-600" : "text-amber-700"}`} />
                <span>{isSyncing ? "Menyinkronkan..." : "Tarik Google Sheet"}</span>
              </button>
            )}
            <button
              onClick={onExportShopeeCSV}
              className="px-3.5 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 bg-slate-50 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Ekspor Laporan
            </button>
            <button
              onClick={openAddModal}
              className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-extrabold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-xs hover:shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Input Transaksi
            </button>
          </div>
          
        </div>

        {/* Filters and search block */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mt-4 pt-4 border-t border-slate-100">
          
          {/* Search bar */}
          <div className="sm:col-span-6 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nomor pesanan, deskripsi transaksi..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-800 focus:outline-hidden focus:border-orange-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Type dropdown */}
          <div className="sm:col-span-3">
            <select
              value={selectedTipe}
              onChange={(e) => {
                setSelectedTipe(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-orange-500 focus:bg-white transition-colors"
            >
              <option value="ALL">Semua Tipe Transaksi</option>
              {tipeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Flow Direction Direct Line */}
          <div className="sm:col-span-3">
            <select
              value={selectedJenis}
              onChange={(e) => {
                setSelectedJenis(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-hidden focus:border-orange-500 focus:bg-white transition-colors"
            >
              <option value="ALL">Semua Aliran (In/Out)</option>
              <option value="Transaksi Masuk">Transaksi Masuk (+) </option>
              <option value="Transaksi Keluar">Transaksi Keluar (-)</option>
            </select>
          </div>

        </div>

        {/* 3. Shopee Spreadsheet List */}
        <div className="overflow-x-auto mt-4 rounded-xl border border-slate-100">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 font-black uppercase text-[9px] tracking-wider border-b border-slate-100">
                <th className="py-3 px-4">Tanggal Transaksi</th>
                <th className="py-3 px-4">Tipe Transaksi</th>
                <th className="py-3 px-4">Deskripsi</th>
                <th className="py-3 px-4">No. Pesanan</th>
                <th className="py-3 px-3 text-center">Jenis</th>
                <th className="py-3 px-4 text-right">Jumlah</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Tidak ditemukan data transaksi keuangan Shopee yang cocok
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 font-medium text-slate-600 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">{tx.tanggalTransaksi}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-700">{tx.tipeTransaksi}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate" title={tx.deskripsi}>
                      {tx.deskripsi}
                    </td>
                    <td className="py-3 px-4">
                      {tx.noPesanan && tx.noPesanan !== "-" ? (
                        <span className="px-2 py-0.5 bg-orange-50/50 border border-orange-100 text-orange-850 font-mono text-[10px] rounded">
                          {tx.noPesanan}
                        </span>
                      ) : (
                        <span className="text-slate-350">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 text-[9px] rounded-full font-bold inline-block ${
                        tx.jenisTransaksi.includes("Masuk") 
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-100" 
                          : "bg-rose-50 text-rose-800 border border-rose-100"
                      }`}>
                        {tx.jenisTransaksi}
                      </span>
                    </td>
                    <td className={`py-3 px-4 text-right font-mono font-bold text-[13px] whitespace-nowrap ${
                      tx.jumlah >= 0 ? "text-emerald-600" : "text-rose-600"
                    }`}>
                      {formatRupiah(tx.jumlah)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(tx)}
                          className="p-1 text-slate-400 hover:text-indigo-650 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                          title="Edit log"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Hapus rincian transaksi Shopee ini?")) {
                              onDeleteTransaction(tx.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Hapus log"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Row */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4 text-xs font-semibold">
            <span className="text-slate-400">
              Menampilkan {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} dari {filteredTransactions.length} rincian
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 text-slate-500 hover:text-slate-900 border border-slate-200 rounded disabled:opacity-40 disabled:cursor-not-allowed text-[11px]"
              >
                Sebelumnya
              </button>
              {Array.from({ length: totalPages }, (_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx + 1)}
                  className={`px-2.5 py-1 rounded text-[11px] ${
                    currentPage === idx + 1 ? "bg-orange-600 text-white" : "border text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 text-slate-500 hover:text-slate-900 border border-slate-200 rounded disabled:opacity-40 disabled:cursor-not-allowed text-[11px]"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. MODAL ADD / EDIT MANUAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden select-none animate-fade-in">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-150 flex items-center justify-between bg-orange-50">
              <h3 className="text-sm sm:text-base font-black text-slate-800">
                {editingTx ? "Edit Log Transaksi Shopee" : "Input Transaksi Shopee Baru"}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              
              <div className="grid grid-cols-2 gap-3">
                {/* Tanggal */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Tanggal & Waktu</label>
                  <input
                    type="text"
                    required
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    placeholder="2026-03-30 11:12:16"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-orange-500"
                  />
                </div>

                {/* No Pesanan */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">No. Pesanan / Order ID</label>
                  <input
                    type="text"
                    value={noPesanan}
                    onChange={(e) => setNoPesanan(e.target.value)}
                    placeholder="2603265WXHHPR2"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Tipe Transaksi */}
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Tipe Transaksi</label>
                <select
                  value={tipe}
                  onChange={(e) => setTipe(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-orange-500 font-medium text-slate-800"
                >
                  <option value="Omset">Omset</option>
                  <option value="Penghasilan dari Pesanan">Penghasilan dari Pesanan</option>
                  <option value="Penarikan Dana">Penarikan Dana</option>
                  <option value="Penyesuaian">Penyesuaian</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Deskripsi</label>
                <input
                  type="text"
                  required
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  placeholder="Penghasilan dari Pesanan #26032..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Jenis Aliran */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Aliran Kas</label>
                  <select
                    value={jenis}
                    onChange={(e) => {
                      setJenis(e.target.value);
                      // Auto apply sign to amount
                      if (e.target.value === "Transaksi Keluar" && jumlah > 0) {
                        setJumlah(-Math.abs(jumlah));
                      } else if (e.target.value === "Transaksi Masuk" && jumlah < 0) {
                        setJumlah(Math.abs(jumlah));
                      }
                    }}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-orange-500"
                  >
                    <option value="Transaksi Masuk">Transaksi Masuk (+)</option>
                    <option value="Transaksi Keluar">Transaksi Keluar (-)</option>
                  </select>
                </div>

                {/* Jumlah Nominal */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Jumlah Nominal (Rp)</label>
                  <input
                    type="number"
                    required
                    value={jumlah}
                    onChange={(e) => setJumlah(Number(e.target.value))}
                    placeholder="35117"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-orange-500 font-mono"
                  />
                </div>
              </div>

              {/* Status & Saldo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Status</label>
                  <input
                    type="text"
                    required
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    placeholder="Transaksi Selesai"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Saldo Akhir (Rp)</label>
                  <input
                    type="number"
                    value={saldoAkhir}
                    onChange={(e) => setSaldoAkhir(Number(e.target.value))}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-orange-500 font-mono"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-700 bg-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-extrabold shadow-sm cursor-pointer"
                >
                  Simpan Transaksi
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
