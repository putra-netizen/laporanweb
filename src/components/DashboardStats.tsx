import React from "react";
import { OrderData, ShopeeTransaction } from "../types";
import { formatRupiah } from "../utils";
import { TrendingUp, Users, Coins, Wallet, Sparkles, AlertCircle } from "lucide-react";

interface StatsProps {
  orders: OrderData[];
  shopeeTransactions: ShopeeTransaction[];
  rate: number;
}

export default function DashboardStats({ orders, shopeeTransactions, rate }: StatsProps) {
  // 1. Worker calculations
  const totalOrders = orders.reduce((sum, o) => sum + o.orderCount, 0);
  const totalWorkerEarnings = orders.reduce((sum, o) => sum + (o.orderCount * (o.customRate !== undefined ? o.customRate : rate)), 0);

  // 2. Shopee calculations
  // Summing all "Transaksi Masuk" or positive transactions which constitute the income stream
  const shopeeIncomeTx = shopeeTransactions.filter(t => t.jumlah > 0);
  const totalShopeeIncome = shopeeIncomeTx.reduce((sum, t) => sum + t.jumlah, 0);

  // 3. Profit analysis
  const netProfit = totalShopeeIncome - totalWorkerEarnings;
  const isProfitPositive = netProfit >= 0;
  const profitMarginPercent = totalShopeeIncome > 0 ? Math.round((netProfit / totalShopeeIncome) * 100) : 0;

  // Count active workers
  const uniqueWorkers = Array.from(new Set(orders.map((o) => o.worker).filter(Boolean)));
  const totalWorkers = uniqueWorkers.length;

  return (
    <div className="space-y-6">
      {/* Prime Financial Scoreboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Card 1: Pemasukan Toko Shopee */}
        <div id="shopee-income-card" className="bg-white border border-orange-100 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full translate-x-12 -translate-y-12 transition-all group-hover:scale-110"></div>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-orange-500 uppercase tracking-wider">
                Pemasukan Shopee
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-800 mt-2.5 tracking-tight group-hover:text-orange-950 transition-colors">
                {formatRupiah(totalShopeeIncome)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
                Dari <strong className="text-slate-600 font-extrabold">{shopeeIncomeTx.length}</strong> transaksi masuk Shopee
              </p>
            </div>
            <div className="p-3 bg-orange-50 text-orange-600 border border-orange-100 rounded-xl shrink-0 group-hover:bg-orange-500 group-hover:text-white transition-all duration-300">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-semibold uppercase">Sumber: Shopee Seller Wallet</span>
            <span className="text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded-full">LIVE</span>
          </div>
        </div>

        {/* Card 2: Bayaran Talent / Worker */}
        <div id="worker-cost-card" className="bg-white border border-indigo-100 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full translate-x-12 -translate-y-12 transition-all group-hover:scale-110"></div>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider">
                Bayaran Talent (Worker)
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-800 mt-2.5 tracking-tight group-hover:text-indigo-950 transition-colors">
                {formatRupiah(totalWorkerEarnings)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
                Upah untuk <strong className="text-slate-600 font-extrabold">{totalOrders.toLocaleString("id-ID")}</strong> total orders harian
              </p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl shrink-0 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
              <Coins className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-semibold uppercase">Tarif Standar: Rp {rate}/order</span>
            <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">{totalWorkers} Worker</span>
          </div>
        </div>

        {/* Card 3: Keuntungan Bersih (Profit) */}
        <div 
          id="net-profit-card" 
          className={`bg-white border rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden group ${
            isProfitPositive ? "border-emerald-100" : "border-rose-100"
          }`}
        >
          <div className={`absolute top-0 right-0 w-32 h-32 rounded-full translate-x-12 -translate-y-12 transition-all group-hover:scale-110 ${
            isProfitPositive ? "bg-emerald-500/5" : "bg-rose-500/5"
          }`}></div>
          
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-xs font-bold uppercase tracking-wider ${
                isProfitPositive ? "text-emerald-600" : "text-rose-600"
              }`}>
                Sisa Bersih (Keuntungan)
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-800 mt-2.5 tracking-tight group-hover:text-slate-950 transition-colors">
                {formatRupiah(netProfit)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
                Margin Bersih: <strong className={isProfitPositive ? "text-emerald-600 font-black" : "text-rose-600 font-black"}>
                  {profitMarginPercent}%
                </strong>
              </p>
            </div>
            
            <div className={`p-3 border rounded-xl shrink-0 transition-all duration-300 ${
              isProfitPositive 
                ? "bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-500 group-hover:text-white" 
                : "bg-rose-50 text-rose-600 border-rose-100 group-hover:bg-rose-500 group-hover:text-white"
            }`}>
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-semibold uppercase">Pemasukan vs Pengeluaran</span>
            <span className={`font-extrabold px-2 py-0.5 rounded-full text-[9px] ${
              isProfitPositive ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
            }`}>
              {isProfitPositive ? "SURPLUS" : "DEFISIT"}
            </span>
          </div>
        </div>

      </div>

      {/* Auxiliary Mini-stats indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-3xs text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-widest">Total Transaksi Selesai</span>
          <span className="text-lg font-black text-slate-800 tracking-tight mt-1 block">{(orders.length + shopeeTransactions.length).toLocaleString("id-ID")}</span>
          <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">{orders.length} Order | {shopeeTransactions.length} Shopee</span>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-3xs text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-widest">Penarikan Dana / WD</span>
          <span className="text-lg font-black text-rose-600 tracking-tight mt-1 block">
            {formatRupiah(Math.abs(shopeeTransactions.filter(t => t.tipeTransaksi === "Penarikan Dana").reduce((sum, t) => sum + t.jumlah, 0)))}
          </span>
          <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">Dana dicairkan dari Shopee</span>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-3xs text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-widest">Kekuatan Talent</span>
          <span className="text-lg font-black text-slate-800 tracking-tight mt-1 block">{totalWorkers} Worker</span>
          <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">Bekerja di klasemen aktif</span>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-3xs text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-widest">Efisiensi Profitabilitas</span>
          <span className="text-lg font-black text-slate-800 tracking-tight mt-1 block">
            {netProfit > 0 ? "Sangat Sehat" : "Perlu Optimasi"}
          </span>
          <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">Status keuangan operasional</span>
        </div>
      </div>
    </div>
  );
}
