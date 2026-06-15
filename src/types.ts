export interface OrderData {
  id: string; // generated uuid or derived
  tanggal: string; // DD/MM/YYYY
  noOrder: string;
  namaToko: string;
  namaKlien: string;
  noTarget: string;
  spam: string;
  orderCount: number; // parsed "Order" column
  worker: string;
  admin: string;
  limit: string;
  linkBukti: string;
  customRate?: number; // specific tariff for this order
  sourceId?: string; // which report/spreadsheet source did it come from
  sourceName?: string; // name of the source (e.g., Laporan 1 or Laporan 2)
}

export interface ShopeeTransaction {
  id: string;
  tanggalTransaksi: string; // YYYY-MM-DD HH:mm:ss
  tipeTransaksi: string; // Penghasilan dari Pesanan, Penarikan Dana, etc
  deskripsi: string;
  noPesanan: string;
  jenisTransaksi: string; // Transaksi Masuk, Transaksi Keluar
  jumlah: number;
  status: string;
  saldoAkhir: number;
}

export interface WorkerPerformance {
  workerName: string;
  totalOrders: number;
  totalEarnings: number;
  orderCountByDate: { [date: string]: number };
  activeDaysCount: number;
}

export interface MonthlyTrendData {
  monthKey: string; // YYYY-MM
  monthName: string; // e.g. "Juni 2026"
  totalOrders: number;
  totalEarnings: number;
}
