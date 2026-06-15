import { OrderData, ShopeeTransaction, WorkerPerformance, MonthlyTrendData } from "./types";

// ==========================================
// 🔴 KONFIGURASI PERMANEN GOOGLE SPREADSHEET 🔴
// ==========================================
// Tautan Google Sheets di bawah ini diset secara PERMANENT dan tidak dapat diubah dari tampilan UI.
// Aplikasi akan selalu otomatis terhubung ke link di bawah ini saat startup tanpa perlu input manual.
//
// Anda dapat mengaturnya langsung di sini ATAU lewat Environment Variables:
// - VITE_SHEETS_SOURCE_1: Tautan untuk Sumber Laporan 1
// - VITE_SHEETS_SOURCE_2: Tautan untuk Sumber Laporan 2
export const PERMANENT_SHEETS_SOURCE_1 = (import.meta as any).env?.VITE_SHEETS_SOURCE_1 || "https://docs.google.com/spreadsheets/d/e/2PACX-1vT3jY16vyl34OXgongBsct6Agb6S3PstBMiZnzjXogwIZsMTcxmUMQ8yrVwkG_0bVOUqhsK6ebhe1Oj/pub?gid=0&single=true&output=csv";
export const PERMANENT_SHEETS_SOURCE_2 = (import.meta as any).env?.VITE_SHEETS_SOURCE_2 || "https://docs.google.com/spreadsheets/d/e/2PACX-1vSH2r59Rn5uSaa-_kOuP6m65O4gRlHneYI90mHN0SFecSWtcIY2HZHURWhK0eb8WtRRhwuJYtIXsCU7/pub?gid=0&single=true&output=csv";

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
Total Saldo Masuk;;;;0;IDR;0;
Total Saldo Keluar;;;;0;IDR;0;
;;;;;;;
;;;;;;;
Rincian Transaksi;;;;;;;
;;;;;;;
Tanggal Transaksi;Tipe Transaksi;Deskripsi;No. Pesanan;Jenis Transaksi;Jumlah;Status;Saldo Akhir`;

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

/**
 * Fetches Google Sheets text with an automatic CORS fallback to bypass Vercel restrictions.
 * Direct fetch can fail with CORS blocks on production/Vercel (especially for standard shared link exports),
 * in which case we try multiple fast, open, secure CORS-bypass proxies sequentially.
 */
export async function fetchSpreadsheetText(url: string, sourceName?: string): Promise<string> {
  const displayName = sourceName ? `[${sourceName}] ` : "";
  
  const isHtmlOrLoginResponse = (text: string): boolean => {
    const lower = text.toLowerCase().trim();
    return (
      lower.includes("<!doctype html") ||
      lower.includes("<html") ||
      lower.includes("google accounts") ||
      lower.includes("servicelogin") ||
      lower.includes("login.google") ||
      lower.includes("sign in - google accounts") ||
      lower.startsWith("<html") ||
      lower.startsWith("<!doctype")
    );
  };

  const privateErrorMsg = 
    `SINKRONISASI DIPERLUKAN (AKSES PRIVATE SPREADSHEET):\n\n` +
    `Google Sheets menolak akses tanpa login karena file masih bersifat Pribadi/Private.\n\n` +
    `SOLUSI UTAMA (Sangat Direkomendasikan):\n` +
    `1. Di Google Sheets Anda, buka menu 'File' -> 'Bagikan' -> 'Publikasikan ke web'.\n` +
    `2. Pilih lembar laporan Anda, ubah format dari 'Halaman Web' menjadi 'Nilai yang dipisahkan koma (.csv)'.\n` +
    `3. Klik tombol 'Publikasikan' (Publish) dan klik OK.\n` +
    `4. Salin link publikasi tersebut (biasanya berakhiran /pub?output=csv) lalu tempelkan di aplikasi ini.\n\n` +
    `Solusi Alternatif:\n` +
    `- Pastikan menu 'Bagikan' di Google Sheets sudah diubah dari 'Dibatasi' (Restricted) menjadi 'Siapa saja yang memiliki link dapat melihat' (Anyone with URL can view).`;

  // 1. Try direct fetch first
  try {
    const response = await fetch(url);
    if (response.ok) {
      const text = await response.text();
      if (text && text.trim().length > 0) {
        if (isHtmlOrLoginResponse(text)) {
          throw new Error(privateErrorMsg);
        }
        return text;
      }
    }
  } catch (error: any) {
    if (error.message && error.message.includes("SINKRONISASI DIPERLUKAN")) {
      throw error;
    }
    console.warn(`${displayName}Direct fetch failed due to CORS or network block, trying backup proxies...`, error);
  }

  // 2. Try list of high-reliability CORS proxies sequentially
  const proxies = [
    {
      name: "corsproxy.io",
      getUrl: (target: string) => `https://corsproxy.io/?${encodeURIComponent(target)}`
    },
    {
      name: "allorigins",
      getUrl: (target: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`
    },
    {
      name: "codetabs",
      getUrl: (target: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(target)}`
    }
  ];

  for (const proxy of proxies) {
    try {
      const proxyUrl = proxy.getUrl(url);
      
      // Setup a 7-second abort controller so if one proxy hangs, we don't get stuck forever
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);
      
      const response = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const text = await response.text();
        if (text && text.trim().length > 0 && !text.includes(`"error"`)) {
          if (isHtmlOrLoginResponse(text)) {
            throw new Error(privateErrorMsg);
          }
          console.log(`${displayName}Successfully connected and loaded spreadsheet via ${proxy.name} bypass proxy.`);
          return text;
        }
      }
      console.warn(`${displayName}Proxy ${proxy.name} returned bad status status: ${response.status}`);
    } catch (e: any) {
      if (e.message && e.message.includes("SINKRONISASI DIPERLUKAN")) {
        throw e;
      }
      console.warn(`${displayName}Proxy ${proxy.name} failed or timed out:`, e.message || e);
    }
  }
  
  throw new Error(
    `Gagal mendownload lembar kerja Google Sheets (RTO atau CORS Block di Vercel).\n\n` +
    `SOLUSI UTAMA (100% Berhasil Secara Instan & Atasi Masalah Vercel):\n` +
    `1. Di Google Sheets Anda, pilih menu 'File' -> 'Bagikan' -> 'Publikasikan ke web'.\n` +
    `2. Pilih lembar laporan Anda, ubah tipe web page menjadi 'Nilai yang dipisahkan koma (.csv)' lalu klik tombol 'Publikasikan'.\n` +
    `3. Salin link hasil publikasi tersebut lalu simpan di pengaturan aplikasi ini.\n\n` +
    `Metode Alternatif:\n` +
    `- Pastikan Akses Umum link diatur ke 'Siapa saja yang memiliki link dapat melihat' (Anyone with URL can view).`
  );
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
