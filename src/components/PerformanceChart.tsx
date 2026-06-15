import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { OrderData, ShopeeTransaction } from "../types";
import { formatRupiah, INDONESIAN_MONTHS, parseDateParts } from "../utils";
import { BarChart3, LineChart as LineIcon, Users, Wallet, Scale } from "lucide-react";

interface ChartProps {
  orders: OrderData[];
  shopeeTransactions: ShopeeTransaction[];
  rate: number;
}

export default function PerformanceChart({ orders, shopeeTransactions, rate }: ChartProps) {
  const [mounted, setMounted] = useState(false);
  const [chartType, setChartType] = useState<"compare" | "monthly" | "worker">("compare");
  const [metric, setMetric] = useState<"earnings" | "orders">("earnings");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-72 bg-slate-50 flex items-center justify-center text-slate-400">Memuat analisis grafik...</div>;
  }

  // 1. Process Monthly Comparison: Shopee Pemasukan vs Worker Bayaran
  const compMap: { [key: string]: { shopee: number; worker: number; monthName: string } } = {};

  // Aggregate Shopee (positive "jumlah" represents store income)
  shopeeTransactions.forEach((t) => {
    if (t.jumlah <= 0) return; // skip withdrawals
    const parts = parseDateParts(t.tanggalTransaksi);
    if (parts) {
      const key = `${parts.year}-${parts.month.toString().padStart(2, "0")}`;
      const monthIdx = parts.month - 1;
      const monthName = INDONESIAN_MONTHS[monthIdx] || `Bulan ${parts.month}`;
      const dispName = `${monthName} ${parts.year}`;

      if (!compMap[key]) {
        compMap[key] = { shopee: 0, worker: 0, monthName: dispName };
      }
      compMap[key].shopee += t.jumlah;
    }
  });

  // Aggregate Worker upah (orderCount * rate)
  orders.forEach((o) => {
    const parts = parseDateParts(o.tanggal);
    if (parts) {
      const key = `${parts.year}-${parts.month.toString().padStart(2, "0")}`;
      const monthIdx = parts.month - 1;
      const monthName = INDONESIAN_MONTHS[monthIdx] || `Bulan ${parts.month}`;
      const dispName = `${monthName} ${parts.year}`;

      if (!compMap[key]) {
        compMap[key] = { shopee: 0, worker: 0, monthName: dispName };
      }
      const actualRate = o.customRate !== undefined ? o.customRate : rate;
      compMap[key].worker += o.orderCount * actualRate;
    }
  });

  const comparisonChartData = Object.keys(compMap)
    .sort()
    .map((key) => ({
      name: compMap[key].monthName,
      shopee: compMap[key].shopee,
      worker: compMap[key].worker,
      profit: compMap[key].shopee - compMap[key].worker,
    }));

  // 2. Process Monthly Order Data (Worker metrics only)
  const monthlyMap: { [key: string]: { totalOrders: number; earnings: number; monthName: string } } = {};

  orders.forEach((o) => {
    const parts = parseDateParts(o.tanggal);
    if (parts) {
      const monthIdx = parts.month - 1;
      const monthName = INDONESIAN_MONTHS[monthIdx] || `Bulan ${parts.month}`;
      const yearStr = parts.year.toString();
      const key = `${yearStr}-${parts.month.toString().padStart(2, "0")}`;
      const dispName = `${monthName} ${yearStr}`;

      if (!monthlyMap[key]) {
        monthlyMap[key] = { totalOrders: 0, earnings: 0, monthName: dispName };
      }
      monthlyMap[key].totalOrders += o.orderCount;
      const actualRate = o.customRate !== undefined ? o.customRate : rate;
      monthlyMap[key].earnings += o.orderCount * actualRate;
    }
  });

  const monthlyChartData = Object.keys(monthlyMap)
    .sort()
    .map((key) => ({
      name: monthlyMap[key].monthName,
      totalOrders: monthlyMap[key].totalOrders,
      earnings: monthlyMap[key].earnings,
      rate: rate,
    }));

  // 3. Process Worker Data (Top Workers for comparison)
  const workerMap: { [key: string]: { ordersCount: number; earnings: number } } = {};
  orders.forEach((o) => {
    const w = o.worker || "Tanpa Nama";
    if (!workerMap[w]) {
      workerMap[w] = { ordersCount: 0, earnings: 0 };
    }
    workerMap[w].ordersCount += o.orderCount;
    const actualRate = o.customRate !== undefined ? o.customRate : rate;
    workerMap[w].earnings += o.orderCount * actualRate;
  });

  const workerChartData = Object.keys(workerMap)
    .map((name) => ({
      name,
      totalOrders: workerMap[name].ordersCount,
      earnings: workerMap[name].earnings,
    }))
    .sort((a, b) => b.totalOrders - a.totalOrders);

  const colors = ["#4f46e5", "#10b981", "#f59e0b", "#06b6d4", "#ec4899", "#8b5cf6"];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs" id="performance-chart-container">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
            <span>Analisis Grafik Interaktif</span>
            <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[9px] rounded font-black uppercase">
              Double Source
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            {chartType === "compare" 
              ? "Membandingkan omzet toko Shopee vs total upah dibayarkan ke worker." 
              : "Menampilkan analisis terperinci per bulan atau performa klasemen pekerja."}
          </p>
        </div>

        {/* Dashboard Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chart View Selector */}
          <div className="bg-slate-100 p-0.5 rounded-lg flex text-xs font-semibold">
            <button
              onClick={() => setChartType("compare")}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                chartType === "compare" ? "bg-white text-indigo-600 shadow-3xs" : "text-slate-600 hover:text-slate-950"
              }`}
            >
              <Scale className="h-3.5 w-3.5" />
              Toko vs Worker
            </button>
            <button
              onClick={() => setChartType("monthly")}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                chartType === "monthly" ? "bg-white text-indigo-600 shadow-3xs" : "text-slate-600 hover:text-slate-950"
              }`}
            >
              <LineIcon className="h-3.5 w-3.5" />
              Tren Bulanan
            </button>
            <button
              onClick={() => setChartType("worker")}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                chartType === "worker" ? "bg-white text-indigo-600 shadow-3xs" : "text-slate-600 hover:text-slate-950"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Kerja Worker
            </button>
          </div>

          {/* Metric Selector for non-compare charts */}
          {chartType !== "compare" && (
            <div className="bg-slate-100 p-0.5 rounded-lg flex text-xs font-semibold">
              <button
                onClick={() => setMetric("earnings")}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                  metric === "earnings" ? "bg-white text-emerald-600 shadow-3xs" : "text-slate-600 hover:text-slate-950"
                }`}
              >
                <Wallet className="h-3.5 w-3.5" />
                Bayaran (Rp)
              </button>
              <button
                onClick={() => setMetric("orders")}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                  metric === "orders" ? "bg-white text-emerald-600 shadow-3xs" : "text-slate-600 hover:text-slate-950"
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Order (Pcs)
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="h-72 w-full mt-2">
        {chartType === "compare" ? (
          comparisonChartData.length === 0 ? (
            <div className="h-full flex items-center justify-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-slate-400 text-xs">
              Belum ada data Shopee dan Worker yang sesuai untuk dibandingkan
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonChartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `Rp ${val / 1000}k`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", borderRadius: "12px", border: "none", color: "#f8fafc" }}
                  labelStyle={{ fontWeight: "bold" }}
                  formatter={(value: any, name: string) => {
                    const label = name === "shopee" ? "Pemasukan Shopee" : name === "worker" ? "Bayaran Worker" : "Sisa Bersih (Profit)";
                    return [formatRupiah(Number(value)), label];
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <Bar dataKey="shopee" name="shopee" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="worker" name="worker" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="profit" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )
        ) : chartType === "monthly" ? (
          monthlyChartData.length === 0 ? (
            <div className="h-full flex items-center justify-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-slate-400 text-xs font-semibold">
              Tidak ada data bulanan untuk dirender
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => (metric === "earnings" ? `Rp ${val / 1000}k` : val)}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", borderRadius: "12px", border: "none", color: "#f8fafc" }}
                  labelStyle={{ fontWeight: "bold" }}
                  formatter={(value: any) => [
                    metric === "earnings" ? formatRupiah(Number(value)) : `${value} Order`,
                    metric === "earnings" ? "Pendapatan Bayaran" : "Jumlah Order",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey={metric === "earnings" ? "earnings" : "totalOrders"}
                  stroke="#4f46e5"
                  strokeWidth={3}
                  activeDot={{ r: 8 }}
                  name={metric === "earnings" ? "Pendapatan (Rp)" : "Total Order"}
                />
              </LineChart>
            </ResponsiveContainer>
          )
        ) : workerChartData.length === 0 ? (
          <div className="h-full flex items-center justify-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-slate-400 text-xs font-semibold">
            Tidak ada data worker untuk dirender
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={workerChartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => (metric === "earnings" ? `Rp ${val / 1000}k` : val)}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#1e293b", borderRadius: "12px", border: "none", color: "#f8fafc" }}
                labelStyle={{ fontWeight: "bold" }}
                formatter={(value: any) => [
                  metric === "earnings" ? formatRupiah(Number(value)) : `${value} Order`,
                  metric === "earnings" ? "Total Bayaran" : "Jumlah Order",
                ]}
              />
              <Bar dataKey={metric === "earnings" ? "earnings" : "totalOrders"} radius={[6, 6, 0, 0]}>
                {workerChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
