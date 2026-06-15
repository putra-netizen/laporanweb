import React, { useState } from "react";
import { OrderData, ShopeeTransaction } from "../types";
import { parseCSV, parseShopeeCSV, INITIAL_CSV_DATA, INITIAL_SHOPEE_CSV_DATA, formatRupiah, DEFAULT_RATE } from "../utils";
import {
  FileText,
  Upload,
  Database,
  CheckCircle,
  AlertCircle,
  Sparkles,
  ClipboardCheck,
  ShoppingBag,
  Users,
} from "lucide-react";

interface ImporterProps {
  onImportOrders: (newData: OrderData[], action: "merge" | "overwrite") => void;
  onImportShopee: (newTransactions: ShopeeTransaction[], action: "merge" | "overwrite") => void;
  ordersCount: number;
  shopeeCount: number;
}

export default function CsvImporter({ onImportOrders, onImportShopee, ordersCount, shopeeCount }: ImporterProps) {
  const [activeImportTab, setActiveImportTab] = useState<"orders" | "shopee">("orders");
  const [csvText, setCsvText] = useState("");
  const [importAction, setImportAction] = useState<"merge" | "overwrite">("merge");
  
  // Previews
  const [previewOrders, setPreviewOrders] = useState<OrderData[]>([]);
  const [previewShopee, setPreviewShopee] = useState<ShopeeTransaction[]>([]);
  
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleTabChange = (tab: "orders" | "shopee") => {
    setActiveImportTab(tab);
    setCsvText("");
    setPreviewOrders([]);
    setPreviewShopee([]);
    setErrorMsg("");
    setSuccessMsg("");
  };

  const processText = (text: string, tab: "orders" | "shopee") => {
    if (!text.trim()) {
      setPreviewOrders([]);
      setPreviewShopee([]);
      return;
    }

    if (tab === "orders") {
      const parsed = parseCSV(text);
      if (parsed.length === 0 && text.includes(";")) {
        throw new Error("Laporan terdeteksi menggunakan separator titik koma. Silakan beralih ke tab Shopee.");
      }
      setPreviewOrders(parsed.slice(0, 5));
      setPreviewShopee([]);
    } else {
      const parsed = parseShopeeCSV(text);
      setPreviewShopee(parsed.slice(0, 5));
      setPreviewOrders([]);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setCsvText(text);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      processText(text, activeImportTab);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal mengurai teks data.");
      setPreviewOrders([]);
      setPreviewShopee([]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
      setErrorMsg("");
      setSuccessMsg("");

      try {
        processText(content, activeImportTab);
      } catch (err: any) {
        setErrorMsg("Gagal memproses file. " + err.message);
        setPreviewOrders([]);
        setPreviewShopee([]);
      }
    };
    reader.readAsText(file);
  };

  const loadSampleData = () => {
    setErrorMsg("");
    setSuccessMsg("");
    setImportAction("overwrite");

    if (activeImportTab === "orders") {
      setCsvText(INITIAL_CSV_DATA);
      const parsed = parseCSV(INITIAL_CSV_DATA);
      setPreviewOrders(parsed.slice(0, 5));
    } else {
      setCsvText(INITIAL_SHOPEE_CSV_DATA);
      const parsed = parseShopeeCSV(INITIAL_SHOPEE_CSV_DATA);
      setPreviewShopee(parsed.slice(0, 5));
    }
  };

  const triggerImport = () => {
    if (!csvText.trim()) {
      setErrorMsg("Silakan paste kode laporan atau unggah berkas terlebih dahulu.");
      return;
    }

    try {
      if (activeImportTab === "orders") {
        const parsed = parseCSV(csvText);
        if (parsed.length === 0) {
          setErrorMsg("Tidak ada data order valid yang terdeteksi.");
          return;
        }
        onImportOrders(parsed, importAction);
        setSuccessMsg(`Berhasil mengimpor ${parsed.length} entri order worker!`);
      } else {
        const parsed = parseShopeeCSV(csvText);
        if (parsed.length === 0) {
          setErrorMsg("Tidak ada data transaksi Shopee valid yang terdeteksi. Hubungkan file ekspor keuangan dari Shopee.");
          return;
        }
        onImportShopee(parsed, importAction);
        setSuccessMsg(`Berhasil mengimpor ${parsed.length} data rincian transaksi Shopee!`);
      }
      setCsvText("");
      setPreviewOrders([]);
      setPreviewShopee([]);
    } catch (err: any) {
      setErrorMsg("Impor gagal: Pastikan format delimiter file Anda sesuai.");
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs" id="csv-importer-panel">
      
      {/* Tab Header Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-800">Pusat Integrasi Sumber Laporan Excel/CSV</h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            Pilih dan upload berkas untuk mengelola penarikan omzet shopee & pembayaran upah kerja worker.
          </p>
        </div>

        {/* Action Toggle Tab */}
        <div className="bg-slate-100 p-1 rounded-xl flex text-xs font-bold shrink-0 self-start sm:self-auto">
          <button
            onClick={() => handleTabChange("orders")}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              activeImportTab === "orders" 
                ? "bg-white text-indigo-600 shadow-3xs" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Worker Orders ({ordersCount})</span>
          </button>
          
          <button
            onClick={() => handleTabChange("shopee")}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              activeImportTab === "shopee" 
                ? "bg-white text-orange-600 shadow-3xs" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Pemasukan Shopee ({shopeeCount})</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        
        {/* Left Input area */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
              1. Salin Teks atau Unggah Berkas (.CSV)
            </span>
            <button
              type="button"
              onClick={loadSampleData}
              className={`text-[11px] font-extrabold flex items-center gap-1 cursor-pointer underline decoration-dotted ${
                activeImportTab === "orders" 
                  ? "text-indigo-600 hover:text-indigo-800 decoration-indigo-300" 
                  : "text-orange-600 hover:text-orange-800 decoration-orange-300"
              }`}
            >
              <Sparkles className="h-3 w-3 animate-bounce" />
              Suntik Contoh Laporan {activeImportTab === "orders" ? "Worker" : "Shopee"}
            </button>
          </div>

          <textarea
            rows={7}
            placeholder={
              activeImportTab === "orders"
                ? `Format Laporan Worker (Gunakan Koma / ,):\nTanggal,No Order,Nama Toko,Nama Klien,No Target,SPAM,Order,Worker,Admin\n12/06/2026,WA548,WA,8444,081261613790,Spam chat,10,Romo,Era Cahaya`
                : `Format Ekspor Finansial Shopee (Gunakan Semicolon / ;):\nTanggal Transaksi;Tipe Transaksi;Deskripsi;No. Pesanan;Jenis Transaksi;Jumlah;Status;Saldo Akhir\n2026-03-30 11:12:16;Penghasilan dari Pesanan;Penghasilan dari Pesanan #X;X;Transaksi Masuk;35117;Transaksi Selesai;880530`
            }
            value={csvText}
            onChange={handleTextChange}
            className={`w-full text-xs font-mono p-3 bg-slate-50 border rounded-xl focus:outline-hidden focus:bg-white text-slate-800 transition-colors ${
              activeImportTab === "orders" 
                ? "border-indigo-100 focus:border-indigo-500" 
                : "border-orange-100 focus:border-orange-500"
            }`}
          />

          {/* Upload Drop Widget */}
          <div className="border border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-2.5">
              <Upload className={`h-5 w-5 ${activeImportTab === "orders" ? "text-indigo-500" : "text-orange-500"}`} />
              <div>
                <p className="text-xs font-bold text-slate-700">Pilih / Seret File Laporan Anda</p>
                <p className="text-[10px] text-slate-400">
                  {activeImportTab === "orders" 
                    ? "Berkas csv delimiter koma (,)" 
                    : "Berkas laporan shopee titik koma (;)"}
                </p>
              </div>
            </div>
            <label className="px-3.5 py-1.5 bg-white border border-slate-200 shadow-3xs rounded-lg text-xs font-bold hover:border-slate-300 focus:outline-hidden cursor-pointer shrink-0">
              <span>Pilih Berkas CSV</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Right integration pane */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
              2. Opsi Penyimpanan & Aksi
            </span>

            <div className="space-y-2">
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-150 hover:bg-slate-50 transition-colors cursor-pointer text-xs">
                <input
                  type="radio"
                  name="importAction"
                  checked={importAction === "merge"}
                  onChange={() => setImportAction("merge")}
                  className={`mt-0.5 ${activeImportTab === "orders" ? "text-indigo-600 focus:ring-indigo-500" : "text-orange-600 focus:ring-orange-500"}`}
                />
                <div>
                  <span className="font-bold text-slate-800">Tambahkan Data (Merge)</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Gabungkan data baru dengan data impor lama di browser lokal.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-150 hover:bg-slate-50 transition-colors cursor-pointer text-xs">
                <input
                  type="radio"
                  name="importAction"
                  checked={importAction === "overwrite"}
                  onChange={() => setImportAction("overwrite")}
                  className={`mt-0.5 ${activeImportTab === "orders" ? "text-indigo-600 focus:ring-indigo-500" : "text-orange-600 focus:ring-orange-500"}`}
                />
                <div>
                  <span className="font-bold text-rose-700">Timpakan (Overwrite / Hapus Lama)</span>
                  <p className="text-[10px] text-rose-500 mt-0.5">
                    Bersihkan data lama dari jenis tab ini, lalu timpa dengan teks saat ini.
                  </p>
                </div>
              </label>
            </div>

            {/* Error messaging */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 flex items-start gap-2 animate-pulse">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Format Kurang Valid</span>
                  <p className="text-[10px] text-rose-600 mt-0.5">{errorMsg}</p>
                </div>
              </div>
            )}

            {/* Success logs */}
            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                <div>
                  <span className="font-bold">Proses Sukses</span>
                  <p className="text-[10px] text-emerald-600 mt-0.5">{successMsg}</p>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={triggerImport}
            disabled={!csvText.trim()}
            className={`w-full py-2.5 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
              activeImportTab === "orders" 
                ? "bg-indigo-600 hover:bg-indigo-700" 
                : "bg-orange-600 hover:bg-orange-700"
            }`}
          >
            <Database className="h-4 w-4" />
            <span>Impor ke Dashboard {activeImportTab === "orders" ? "Worker" : "Shopee"}</span>
          </button>
        </div>
      </div>

      {/* RENDER DYNAMIC PREVIEWS SIDE BY SIDE */}
      {activeImportTab === "orders" && previewOrders.length > 0 && (
        <div className="mt-6 pt-5 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-3">
            <ClipboardCheck className="h-4 w-4 text-indigo-500" />
            Pratinjau {previewOrders.length} Laporan Kerja Worker Pertama:
          </span>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse min-w-[650px]">
              <thead>
                <tr className="border-b border-slate-150 text-slate-400 font-bold uppercase text-[9px]">
                  <th className="py-2 px-3">Tanggal</th>
                  <th className="py-2 px-3">No Order</th>
                  <th className="py-2 px-3">Nama Toko</th>
                  <th className="py-2 px-3">Klien</th>
                  <th className="py-2 px-3">Order</th>
                  <th className="py-2 px-3">Worker (Remunerasi)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewOrders.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-55 font-medium text-slate-600">
                    <td className="py-2 px-3">{row.tanggal}</td>
                    <td className="py-2 px-3 font-mono text-indigo-700 font-extrabold">{row.noOrder}</td>
                    <td className="py-2 px-3">{row.namaToko || "-"}</td>
                    <td className="py-2 px-3">{row.namaKlien || "-"}</td>
                    <td className="py-2 px-3 font-mono text-slate-900 font-extrabold">{row.orderCount} pcs</td>
                    <td className="py-2 px-3 text-slate-800 font-bold">
                      {row.worker} (<span className="text-emerald-600">{formatRupiah(row.orderCount * DEFAULT_RATE)}</span>)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeImportTab === "shopee" && previewShopee.length > 0 && (
        <div className="mt-6 pt-5 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-3">
            <ClipboardCheck className="h-4 w-4 text-orange-500" />
            Pratinjau {previewShopee.length} Keuangan Shopee Pertama:
          </span>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse min-w-[650px]">
              <thead>
                <tr className="border-b border-slate-150 text-slate-400 font-bold uppercase text-[9px]">
                  <th className="py-2 px-3">Tanggal Transaksi</th>
                  <th className="py-2 px-3">Tipe</th>
                  <th className="py-2 px-3">Deskripsi</th>
                  <th className="py-2 px-3">No. Pesanan</th>
                  <th className="py-2 px-3">Jenis</th>
                  <th className="py-2 px-3">Jumlah (Rupiah)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewShopee.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-55 font-medium text-slate-600">
                    <td className="py-2 px-3">{row.tanggalTransaksi}</td>
                    <td className="py-2 px-3 text-slate-700">{row.tipeTransaksi}</td>
                    <td className="py-2 px-3 italic max-w-xs truncate" title={row.deskripsi}>{row.deskripsi}</td>
                    <td className="py-2 px-3 font-mono font-semibold">{row.noPesanan || "-"}</td>
                    <td className="py-2 px-3">
                      <span className={`px-1.5 py-0.5 text-[9px] rounded font-bold ${
                        row.jenisTransaksi.includes("Masuk") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                      }`}>
                        {row.jenisTransaksi}
                      </span>
                    </td>
                    <td className={`py-2 px-3 font-mono font-bold ${row.jumlah >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {formatRupiah(row.jumlah)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
