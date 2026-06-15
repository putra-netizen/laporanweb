import { OrderData, ShopeeTransaction, WorkerPerformance, MonthlyTrendData } from "./types";

// Default rate per order is Rp 500
export const DEFAULT_RATE = 500;

export const INITIAL_CSV_DATA = `Tanggal,No Order,Nama Toko,Nama Klien,No Target,SPAM,Order,Worker,Admin,LIMIT,Link Bukti
12/06/2026,WA548,WA,8444,1. 081261613790,Spam chat,10,Romo,Era Cahaya,1,
12/06/2026,SLY453,SLY,filb,62816-1958-522,Spam chat,50,Romo,Era Cahaya,2,
12/06/2026,SLY377,SLY,aya,6281355471497,Spam chat,10,reh,Era Cahaya,1,
12/06/2026,BONGZ873,BONGZ,luq,6285210208660,Spam chat,11,Romo,Era Cahaya,3,
12/06/2026,AC581,AC,hedi,62857153O8514,Chat&Call,20,bunga,Admin C,1,
12/06/2026,AC348,AC,riom,0853-6368-6098,Chat,11,bunga,Admin C,2,
12/06/2026,NA907,NA,lanas,62895389796470,Chat,10,bunga,Admin C,3,
13/06/2026,ADI316,ADI,luqma,6285210208660,Chat,10,reh,Admin C,1,
13/06/2026,WA748,WA,A,6282113273980,Spam Chat,25,reh,Era Cahaya,2,
13/06/2026,NA262,NA,aini,62811-7715-050,Chat,5,bunga,Admin C,1,
13/06/2026,WA932,WA,RENA,200 TRAGET,Chat,200,Romo,ciel,1,
13/06/2026,ACS317,ACS,ary,62895401487863,Chat,10,Rembo|| GM,Admin C,1,
13/06/2026,AC707,AC,masp,#ERROR!,Chat,11,Rembo|| GM,Admin C,2,
13/06/2026,PC850,PC,masp,#ERROR!,Chat,11,Rembo|| GM,Admin C,3,`;

export const INITIAL_SHOPEE_CSV_DATA = `Laporan;;;;;;;
;;;;;;;
;;;;;;;
Info Rekening;;;;;;;
Username (Penjual);pc_store1;;;;;;
Dari;2026-03-01;;;;;;
Ke;2026-03-31;;;;;;
** Semua perubahan yang dibuat di laporan yang di-download akan menjadi tanggung jawab Penjual.;;;;;;;
;;;;;;;
Ringkasan;;;;$;Mata Uang;Jumlah Transaksi;
Total Saldo Masuk;;;;2875549;IDR;115;
Total Saldo Keluar;;;;-2887440;IDR;4;
;;;;;;;
;;;;;;;
Rincian Transaksi;;;;;;;
;;;;;;;
Tanggal Transaksi;Tipe Transaksi;Deskripsi;No. Pesanan;Jenis Transaksi;Jumlah;Status;Saldo Akhir
2026-03-31 01:56:48;Penarikan Dana;Penarikan Dana;-;Transaksi Keluar;-880530;Transaksi Selesai;0
2026-03-30 11:12:16;Penghasilan dari Pesanan;Penghasilan dari Pesanan #2603265WXHHPR2;2603265WXHHPR2;Transaksi Masuk;35117;Transaksi Selesai;880530
2026-03-30 10:50:38;Penghasilan dari Pesanan;Penghasilan dari Pesanan #2603265WSS0G1X;2603265WSS0G1X;Transaksi Masuk;211151;Transaksi Selesai;845413
2026-03-30 10:08:39;Penghasilan dari Pesanan;Penghasilan dari Pesanan #2603265P410HF3;2603265P410HF3;Transaksi Masuk;63842;Transaksi Selesai;634262
2026-03-28 14:58:27;Penghasilan dari Pesanan;Penghasilan dari Pesanan #2603252WQMH6BJ;2603252WQMH6BJ;Transaksi Masuk;161479;Transaksi Selesai;570420
2026-03-22 20:19:17;Penghasilan dari Pesanan;Penghasilan dari Pesanan #26031329S33RGN;26031329S33RGN;Transaksi Masuk;33550;Transaksi Selesai;408941
2026-03-22 20:18:22;Penghasilan dari Pesanan;Penghasilan dari Pesanan #2603132NUXQDGM;2603132NUXQDGM;Transaksi Masuk;37371;Transaksi Selesai;375391
2026-03-22 05:52:36;Penghasilan dari Pesanan;Penghasilan dari Pesanan #2603158BEHKHEB;2603158BEHKHEB;Transaksi Masuk;14265;Transaksi Selesai;338020
2026-03-21 21:27:14;Penghasilan dari Pesanan;Penghasilan dari Pesanan #260312UY6YG9VJ;260312UY6YG9VJ;Transaksi Masuk;13723;Transaksi Selesai;323755
2026-03-21 12:31:00;Penghasilan dari Pesanan;Penghasilan dari Pesanan #260317CPDE4FF1;260317CPDE4FF1;Transaksi Masuk;63842;Transaksi Selesai;310032
2026-03-20 18:10:27;Penghasilan dari Pesanan;Penghasilan dari Pesanan #2603144WMD1JAN;2603144WMD1JAN;Transaksi Masuk;14265;Transaksi Selesai;246190
2026-03-20 00:03:25;Penghasilan dari Pesanan;Penghasilan dari Pesanan #260310RSE50B2K;260310RSE50B2K;Transaksi Masuk;13723;Transaksi Selesai;231925
2026-03-19 21:58:38;Penghasilan dari Pesanan;Penghasilan dari Pesanan #260310REC2CS6P;260310REC2CS6P;Transaksi Masuk;14265;Transaksi Selesai;218202
2026-03-18 21:24:39;Penghasilan dari Pesanan;Penghasilan dari Pesanan #260309NRYA79AK;260309NRYA79AK;Transaksi Masuk;13215;Transaksi Selesai;203937
2026-03-18 11:43:52;Penghasilan dari Pesanan;Penghasilan dari Pesanan #2603144GGNFQJ4;2603144GGNFQJ4;Transaksi Masuk;59436;Transaksi Selesai;190722
2026-03-18 07:45:20;Penghasilan dari Pesanan;Penghasilan dari Pesanan #260311U18K7GT6;260311U18K7GT6;Transaksi Masuk;68548;Transaksi Selesai;131286
2026-03-17 15:50:48;Penghasilan dari Pesanan;Penghasilan dari Pesanan #2603157D7U8VNF;2603157D7U8VNF;Transaksi Masuk;13222;Transaksi Selesai;62738
2026-03-17 08:55:25;Penghasilan dari Pesanan;Penghasilan dari Pesanan #26031581DJFEA4;26031581DJFEA4;Transaksi Masuk;13229;Transaksi Selesai;49516
2026-03-16 21:13:38;Penghasilan dari Pesanan;Penghasilan dari Pesanan #2603157FDRJTP7;2603157FDRJTP7;Transaksi Masuk;22022;Transaksi Selesai;36287
2026-03-16 03:05:11;Penghasilan dari Pesanan;Penghasilan dari Pesanan #260306EE2YVBG8;260306EE2YVBG8;Transaksi Masuk;14265;Transaksi Selesai;14265
2026-03-16 02:32:35;Penarikan Dana;Penarikan Dana;-;Transaksi Keluar;-1161372;Transaksi Selesai;0
2026-03-16 01:43:44;Penghasilan dari Pesanan;Penghasilan dari Pesanan #2603144RJDT6F3;2603144RJDT6F3;Transaksi Masuk;14265;Transaksi Selesai;1161372`;

export function formatRupiah(amount: number): string {
  // support negative amounts as well
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  const formatted = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(absVal);
  return isNegative ? `-${formatted}` : formatted;
}

// Convert Indonesian Month Names
export const INDONESIAN_MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export function parseCSV(csvText: string): OrderData[] {
  if (!csvText || !csvText.trim()) return [];

  const lines = csvText.split(/\r?\n/);
  if (lines.length <= 1) return [];

  const results: OrderData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = parseCsvLine(line);
    if (columns.length < 3) continue;

    // Skip if it is actually the Shopee headers or other metadata accident
    if (line.includes(";")) continue;

    const tanggal = columns[0] || "";
    const noOrder = columns[1] || "";
    const namaToko = columns[2] || "";
    const namaKlien = columns[3] || "";
    const noTarget = columns[4] || "";
    const spam = columns[5] || "";
    const orderRaw = columns[6] || "0";
    const orderCount = parseInt(orderRaw.replace(/[^0-9-]/g, "")) || 0;
    const worker = columns[7] || "Tanpa Nama";
    const admin = columns[8] || "";
    const limitVal = columns[9] || "";
    const linkBukti = columns[10] || "";

    results.push({
      id: `${noOrder}-${worker}-${tanggal}-${i}`,
      tanggal,
      noOrder,
      namaToko,
      namaKlien,
      noTarget,
      spam,
      orderCount,
      worker: worker.trim() || "Nama Kosong",
      admin,
      limit: limitVal,
      linkBukti,
    });
  }

  return results;
}

export function parseShopeeCSV(csvText: string): ShopeeTransaction[] {
  if (!csvText || !csvText.trim()) return [];

  const lines = csvText.split(/\r?\n/);
  const results: ShopeeTransaction[] = [];
  let headerIndex = -1;

  // Find actual transaction table header
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.toLowerCase().includes("tanggal transaksi")) {
      headerIndex = i;
      break;
    }
  }

  const startIdx = headerIndex !== -1 ? headerIndex + 1 : 0;

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Split using semicolon (;) which is standard for Shopee Indonesian financial logs
    const columns = line.split(";").map(c => c.trim().replace(/^"|"$/g, ""));
    if (columns.length < 4) continue;

    const tgl = columns[0] || "";
    // Ensure date looks somewhat correct (starts with numeric or includes separators)
    if (!tgl || (!tgl.includes("-") && !tgl.includes("/"))) {
      continue;
    }

    const tipe = columns[1] || "";
    const deskripsi = columns[2] || "";
    const noPesanan = columns[3] || "";
    const jenis = columns[4] || "";
    const jumlahRaw = columns[5] || "0";
    const status = columns[6] || "";
    const saldoRaw = columns[7] || "0";

    // parse numeric amounts safely
    const jumlah = parseInt(jumlahRaw.replace(/[^0-9-]/g, "")) || 0;
    const saldoAkhir = parseInt(saldoRaw.replace(/[^0-9-]/g, "")) || 0;

    results.push({
      id: `shopee-${noPesanan}-${tgl}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      tanggalTransaksi: tgl,
      tipeTransaksi: tipe,
      deskripsi,
      noPesanan,
      jenisTransaksi: jenis,
      jumlah,
      status,
      saldoAkhir,
    });
  }

  return results;
}

// Basic CSV Line Parser with Quotes handling
export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Extract Spreadsheet ID, GID, and generate the direct CSV fetch endpoint
export function getGoogleSheetsCsvUrl(inputUrl: string): { csvUrl: string; spreadsheetId: string; gid: string } | null {
  const cleanUrl = inputUrl.trim();
  if (!cleanUrl) return null;

  let spreadsheetId = "";
  let gid = "0";

  // Check if it's a URL
  if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
    const isPublished = cleanUrl.includes("/d/e/");
    
    if (isPublished) {
      // Published format: https://docs.google.com/spreadsheets/d/e/2PACX-1v.../pub?output=csv
      const idMatch = cleanUrl.match(/\/d\/e\/([a-zA-Z0-9-_]+)/);
      if (idMatch && idMatch[1]) {
        spreadsheetId = idMatch[1];
      } else {
        return null;
      }
      
      const gidMatch = cleanUrl.match(/[#&?]gid=([0-9]+)/);
      if (gidMatch && gidMatch[1]) {
        gid = gidMatch[1];
      }
      
      return {
        spreadsheetId,
        gid,
        csvUrl: `https://docs.google.com/spreadsheets/d/e/${spreadsheetId}/pub?output=csv&gid=${gid}`
      };
    } else {
      // Standard shared format: https://docs.google.com/spreadsheets/d/1BxiMVs.../edit
      const idMatch = cleanUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (idMatch && idMatch[1]) {
        spreadsheetId = idMatch[1];
      } else {
        return null;
      }

      const gidMatch = cleanUrl.match(/[#&?]gid=([0-9]+)/);
      if (gidMatch && gidMatch[1]) {
        gid = gidMatch[1];
      }

      return {
        spreadsheetId,
        gid,
        csvUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`
      };
    }
  } else {
    // Treat as raw spreadsheet ID
    spreadsheetId = cleanUrl;
    return {
      spreadsheetId,
      gid,
      csvUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`
    };
  }
}

// Convert order data to CSV string for export
export function convertToCSV(data: OrderData[]): string {
  const headers = [
    "Tanggal",
    "No Order",
    "Nama Toko",
    "Nama Klien",
    "No Target",
    "SPAM",
    "Order",
    "Worker",
    "Admin",
    "LIMIT",
    "Link Bukti",
    "Hitungan Bayaran (Rp)",
  ];

  const rows = data.map((item) => [
    item.tanggal,
    `"${item.noOrder.replace(/"/g, '""')}"`,
    `"${item.namaToko.replace(/"/g, '""')}"`,
    `"${item.namaKlien.replace(/"/g, '""')}"`,
    `"${item.noTarget.replace(/"/g, '""')}"`,
    `"${item.spam.replace(/"/g, '""')}"`,
    item.orderCount,
    `"${item.worker.replace(/"/g, '""')}"`,
    `"${item.admin.replace(/"/g, '""')}"`,
    `"${item.limit.replace(/"/g, '""')}"`,
    `"${item.linkBukti.replace(/"/g, '""')}"`,
    item.orderCount * DEFAULT_RATE,
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

export function convertShopeeToCSV(data: ShopeeTransaction[]): string {
  const headers = [
    "Tanggal Transaksi",
    "Tipe Transaksi",
    "Deskripsi",
    "No. Pesanan",
    "Jenis Transaksi",
    "Jumlah",
    "Status",
    "Saldo Akhir"
  ];

  const rows = data.map((item) => [
    item.tanggalTransaksi,
    `"${item.tipeTransaksi.replace(/"/g, '""')}"`,
    `"${item.deskripsi.replace(/"/g, '""')}"`,
    `"${item.noPesanan.replace(/"/g, '""')}"`,
    `"${item.jenisTransaksi.replace(/"/g, '""')}"`,
    item.jumlah,
    `"${item.status.replace(/"/g, '""')}"`,
    item.saldoAkhir,
  ]);

  return [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\n");
}

// Trigger CSV download
export function downloadCSV(csvContent: string, fileName: string) {
  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Universal date parsing supporting DD/MM/YYYY and YYYY-MM-DD (Shopee)
export function parseDateParts(dateStr: string): { day: number; month: number; year: number } | null {
  if (!dateStr) return null;
  const cleanStr = dateStr.trim();

  // Try standard DD/MM/YYYY format (used in orders)
  if (cleanStr.includes("/")) {
    const parts = cleanStr.split("/");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return { day, month, year };
      }
    }
  }

  // Try ISO YYYY-MM-DD or YYYY-MM-DD HH:mm:ss (used in Shopee)
  if (cleanStr.includes("-")) {
    const datePart = cleanStr.split(" ")[0];
    const parts = datePart.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return { day, month, year };
      }
    }
  }

  return null;
}

// Generate unique ID
export function generateId(): string {
  return "order_" + Math.random().toString(36).substr(2, 9);
}
