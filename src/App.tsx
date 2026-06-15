import React, { useState, useEffect } from "react";
import { OrderData, ShopeeTransaction } from "./types";
import {
  parseCSV,
  parseShopeeCSV,
  INITIAL_CSV_DATA,
  INITIAL_SHOPEE_CSV_DATA,
  convertToCSV,
  convertShopeeToCSV,
  downloadCSV,
  DEFAULT_RATE,
  getGoogleSheetsCsvUrl,
  parseCsvLine,
  fetchSpreadsheetText,
  PERMANENT_SHEETS_SOURCE_1,
  PERMANENT_SHEETS_SOURCE_2,
} from "./utils";
import DashboardStats from "./components/DashboardStats";
import PerformanceChart from "./components/PerformanceChart";
import OrderTable from "./components/OrderTable";
import WorkerSummary from "./components/WorkerSummary";
import CsvImporter from "./components/CsvImporter";
import SheetsImporter from "./components/SheetsImporter";
import ShopeeTable from "./components/ShopeeTable";
import {
  Sparkles,
  LayoutDashboard,
  Table,
  Users,
  Download,
  Upload,
  Coins,
  RefreshCw,
  Info,
  DollarSign,
  Briefcase,
  ShoppingBag,
} from "lucide-react";

export default function App() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [shopeeTransactions, setShopeeTransactions] = useState<ShopeeTransaction[]>([]);
  const [rate, setRate] = useState<number>(DEFAULT_RATE);
  const [source1Rate, setSource1Rate] = useState<number>(220);
  const [source2Rate, setSource2Rate] = useState<number>(500);
  const [activeTab, setActiveTab] = useState<"overview" | "table" | "shopee" | "workers" | "import">( "overview");
  const [alert, setAlert] = useState<{ type: "success" | "info" | "error"; message: string } | null>(null);
  
  // Realtime active indicators
  const [isRealtimeSyncing, setIsRealtimeSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(localStorage.getItem("google_sheets_last_sync") || "");

  // Load initial data on mount
  useEffect(() => {
    // 1. Load rate
    const savedRate = localStorage.getItem("order_tariff_rate");
    if (savedRate) {
      setRate(Number(savedRate));
    }

    // Load custom source rates from multisource config
    const savedMultisource = localStorage.getItem("google_sheets_multisource_config");
    if (savedMultisource) {
      try {
        const parsed = JSON.parse(savedMultisource);
        if (Array.isArray(parsed)) {
          const s1 = parsed.find(s => s.id === "source_1");
          const s2 = parsed.find(s => s.id === "source_2");
          if (s1) {
            setSource1Rate(s1.rate !== undefined ? s1.rate : 220);
          }
          if (s2) {
            setSource2Rate(s2.rate !== undefined ? s2.rate : 500);
          }
        }
      } catch (e) {
        console.error("Gagal memuat rate dari multisource config:", e);
      }
    }

    // 2. Load orders
    const savedOrders = localStorage.getItem("order_dashboard_data");
    if (savedOrders) {
      try {
        const parsed = JSON.parse(savedOrders);
        const sheetOnly = Array.isArray(parsed) 
          ? parsed.filter((o: OrderData) => o.sourceId && o.sourceId !== "manual")
          : [];
        setOrders(sheetOnly);
        localStorage.setItem("order_dashboard_data", JSON.stringify(sheetOnly));
      } catch (e) {
        setOrders([]);
        localStorage.setItem("order_dashboard_data", JSON.stringify([]));
      }
    } else {
      // Data is strictly fetched from the sheet database, do not seed mock csv data.
      setOrders([]);
      localStorage.setItem("order_dashboard_data", JSON.stringify([]));
    }

    // 3. Load Shopee transactions with auto-cleanup of old mock data
    const savedShopee = localStorage.getItem("shopee_dashboard_data");
    let initialList: ShopeeTransaction[] = [];
    if (savedShopee) {
      try {
        initialList = JSON.parse(savedShopee);
      } catch (e) {
        initialList = parseShopeeCSV(INITIAL_SHOPEE_CSV_DATA);
      }
    } else {
      initialList = parseShopeeCSV(INITIAL_SHOPEE_CSV_DATA);
    }

    // Migration flag to ensure we do it once and clear all default seed data
    const keyCleared = "shopee_data_cleaned_manual_v3";
    if (!localStorage.getItem(keyCleared)) {
      // Keep only manually created transactions (or non-sample ones).
      // The sample transactions have the old format/dates or ID starting with "shopee-" 
      // where they don't have user alterations. Let's filter those obsolete ones.
      initialList = initialList.filter(tx => 
        tx.tipeTransaksi !== "Penghasilan dari Pesanan" && 
        tx.tipeTransaksi !== "Penarikan Dana" &&
        !tx.id.startsWith("shopee-")
      );
      localStorage.setItem("shopee_dashboard_data", JSON.stringify(initialList));
      localStorage.setItem(keyCleared, "true");
    }

    setShopeeTransactions(initialList);
  }, []);

  const triggerAlert = (type: "success" | "info" | "error", message: string) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert(null);
    }, 4000);
  };

  // Real-time Background Google Sheets Synchronization
  useEffect(() => {
    const performBackgroundSync = async () => {
      const savedMultisource = localStorage.getItem("google_sheets_multisource_config");
      const autoSyncSet = localStorage.getItem("google_sheets_global_autosync");
      const globalAutoSync = autoSyncSet === null ? true : autoSyncSet === "true";

      if (savedMultisource && globalAutoSync) {
        try {
          const sources = JSON.parse(savedMultisource);
          if (Array.isArray(sources)) {
            const activeSources = sources.filter((s: any) => s.isConnected && s.url);
            if (activeSources.length > 0) {
              setIsRealtimeSyncing(true);
              const fetchPromises = activeSources.map((source: any) => {
                const parseResult = getGoogleSheetsCsvUrl(source.url);
                if (!parseResult) return Promise.resolve([]);

                return fetchSpreadsheetText(parseResult.csvUrl, source.name)
                  .then((text) => {
                    const lines = text.split(/\r?\n/).filter((line) => line.trim());
                    if (lines.length <= 1) return [];

                    const fileHeaders = parseCsvLine(lines[0]);
                    const mappings = source.mappings;

                    let noOrderIdx = fileHeaders.indexOf(mappings.noOrder);
                    let orderCountIdx = fileHeaders.indexOf(mappings.orderCount);

                    const lowerNoOrder = mappings.noOrder ? mappings.noOrder.toLowerCase() : "";
                    const lowerOrderCount = mappings.orderCount ? mappings.orderCount.toLowerCase() : "";

                    if (noOrderIdx === orderCountIdx || lowerOrderCount.includes("no") || lowerOrderCount.includes("kode") || lowerOrderCount.includes("id")) {
                      const betterCountHeader = fileHeaders.find(h => {
                        const lh = h.toLowerCase().trim();
                        const isQtyCol = lh === "order" || lh === "order count" || lh.includes("jumlah") || lh.includes("qty") || lh.includes("pcs") || lh.includes("jumlah order");
                        const isIdCol = lh.includes("no") || lh.includes("kode") || lh.includes("id");
                        return isQtyCol && !isIdCol;
                      });
                      if (betterCountHeader) {
                        orderCountIdx = fileHeaders.indexOf(betterCountHeader);
                      }
                    }

                    const exactOrderColIdx = fileHeaders.findIndex(h => h.toLowerCase().trim() === "order");
                    const noOrderVariants = ["no order", "no.order", "no_order", "kode order", "order id"];
                    const exactNoOrderColIdx = fileHeaders.findIndex(h => noOrderVariants.includes(h.toLowerCase().trim()));
                    if (exactOrderColIdx !== -1 && exactNoOrderColIdx !== -1) {
                      noOrderIdx = exactNoOrderColIdx;
                      orderCountIdx = exactOrderColIdx;
                    }

                    let workerColIdx = fileHeaders.indexOf(mappings.worker);
                    const physicalWorkerIdx = fileHeaders.findIndex(h => {
                      const lh = h.toLowerCase().trim();
                      return lh === "worker" || lh === "talent" || lh === "nama worker" || lh === "nama" || lh === "name";
                    });
                    if (physicalWorkerIdx !== -1) {
                      workerColIdx = physicalWorkerIdx;
                    }

                    const indexMap = {
                      tanggal: fileHeaders.indexOf(mappings.tanggal),
                      noOrder: noOrderIdx,
                      namaToko: fileHeaders.indexOf(mappings.namaToko),
                      namaKlien: fileHeaders.indexOf(mappings.namaKlien),
                      noTarget: fileHeaders.indexOf(mappings.noTarget),
                      spam: fileHeaders.indexOf(mappings.spam),
                      orderCount: orderCountIdx,
                      worker: workerColIdx,
                      admin: fileHeaders.indexOf(mappings.admin),
                      limit: fileHeaders.indexOf(mappings.limit),
                      linkBukti: fileHeaders.indexOf(mappings.linkBukti),
                    };

                    if (
                      indexMap.tanggal === -1 ||
                      indexMap.noOrder === -1 ||
                      indexMap.worker === -1 ||
                      indexMap.orderCount === -1
                    ) {
                      return [];
                    }

                    const parsedList: OrderData[] = [];
                    for (let i = 1; i < lines.length; i++) {
                      const columns = parseCsvLine(lines[i]);
                      if (columns.length === 0) continue;

                      const valOf = (idx: number) =>
                        idx !== -1 && idx < columns.length ? columns[idx] : "";
                      
                      const dateVal = valOf(indexMap.tanggal).trim();
                      const orderId = valOf(indexMap.noOrder).trim();
                      const workerName = valOf(indexMap.worker).trim();

                      // 1. Skip completely empty rows
                      if (!dateVal && !orderId && !workerName) {
                        continue;
                      }

                      // 2. Skip total / count / summary rows
                      const isTotalRow = 
                        workerName.toLowerCase().includes("total") ||
                        workerName.toLowerCase().includes("jumlah") ||
                        workerName.toLowerCase().includes("grand") ||
                        workerName.toLowerCase().includes("summary") ||
                        workerName.toLowerCase().includes("rekap") ||
                        orderId.toLowerCase().includes("total") ||
                        orderId.toLowerCase().includes("jumlah") ||
                        dateVal.toLowerCase().includes("total") ||
                        dateVal.toLowerCase().includes("jumlah") ||
                        workerName.startsWith("=") ||
                        orderId.startsWith("=");

                      if (isTotalRow) {
                        continue;
                      }

                      // 3. Skip headers duplicated inside cells
                      if (
                        workerName.toLowerCase() === "worker" || 
                        orderId.toLowerCase() === "no order" || 
                        dateVal.toLowerCase() === "tanggal"
                      ) {
                        continue;
                      }

                      const rawOrderCount = valOf(indexMap.orderCount);
                      // Fallback blank qty cell to 1 if details are valid
                      const orderCount = rawOrderCount.trim() === "" ? 1 : (parseInt(rawOrderCount.replace(/[^0-9-]/g, "")) || 0);

                      const finalWorkerName = workerName || "Worker Kosong";
                      const finalOrderId = orderId || `ORDER-${i}`;

                      parsedList.push({
                        id: `sheet-${source.id}-${finalOrderId}-${finalWorkerName}-${i}`,
                        tanggal: dateVal,
                        noOrder: finalOrderId,
                        namaToko: valOf(indexMap.namaToko),
                        namaKlien: valOf(indexMap.namaKlien),
                        noTarget: valOf(indexMap.noTarget),
                        spam: valOf(indexMap.spam),
                        orderCount,
                        worker: finalWorkerName,
                        admin: valOf(indexMap.admin),
                        limit: valOf(indexMap.limit),
                        linkBukti: valOf(indexMap.linkBukti),
                        customRate: source.rate !== undefined ? source.rate : undefined,
                        sourceId: source.id,
                        sourceName: source.name,
                      });
                    }
                    return parsedList;
                  })
                  .catch((err) => {
                    console.error(`Gagal melakukan sinkronisasi otomatis untuk ${source.name}:`, err);
                    return [];
                  });
              });

              const results = await Promise.all(fetchPromises);
              const combinedOrders = results.flat();
              
              if (combinedOrders.length > 0) {
                const activeSourceIds = activeSources.map((s: any) => s.id);
                setOrders((prev) => {
                  // "nimpa, bukan ditambahkan" - Overwrite any existing items belonging to active sheet sources
                  const untouchedOrders = prev.filter((o) => !o.sourceId || !activeSourceIds.includes(o.sourceId));
                  const finalOrders = [...combinedOrders, ...untouchedOrders];
                  localStorage.setItem("order_dashboard_data", JSON.stringify(finalOrders));
                  return finalOrders;
                });

                const now = new Date();
                const localTimeString = now.toLocaleDateString("id-ID") + " " + now.toLocaleTimeString("id-ID");
                localStorage.setItem("google_sheets_last_sync", localTimeString);
                setLastSyncTime(localTimeString);
              }
              setIsRealtimeSyncing(false);
            }
          }
        } catch (e) {
          console.error("Gagal melakukan konfigurasi sinkronisasi multi-sheet:", e);
          setIsRealtimeSyncing(false);
        }
        return;
      }

      // Fallback: Legacy Single Google Sheet Synchronization
      const savedConfig = localStorage.getItem("google_sheets_sync_config");
      if (savedConfig) {
        try {
          const config = JSON.parse(savedConfig);
          if (config.autoSync && config.url && config.mappings) {
            setIsRealtimeSyncing(true);
            const parseResult = getGoogleSheetsCsvUrl(config.url);
            if (parseResult) {
              const text = await fetchSpreadsheetText(parseResult.csvUrl, "Google Spreadsheet");
              const lines = text.split(/\r?\n/).filter((line) => line.trim());
              if (lines.length <= 1) {
                setIsRealtimeSyncing(false);
                return;
              }

              const fileHeaders = parseCsvLine(lines[0]);
              let noOrderIdx = fileHeaders.indexOf(config.mappings.noOrder);
              let orderCountIdx = fileHeaders.indexOf(config.mappings.orderCount);

              const lowerNoOrder = config.mappings.noOrder ? config.mappings.noOrder.toLowerCase() : "";
              const lowerOrderCount = config.mappings.orderCount ? config.mappings.orderCount.toLowerCase() : "";

              if (noOrderIdx === orderCountIdx || lowerOrderCount.includes("no") || lowerOrderCount.includes("kode") || lowerOrderCount.includes("id")) {
                const betterCountHeader = fileHeaders.find(h => {
                  const lh = h.toLowerCase().trim();
                  const isQtyCol = lh === "order" || lh === "order count" || lh.includes("jumlah") || lh.includes("qty") || lh.includes("pcs") || lh.includes("jumlah order");
                  const isIdCol = lh.includes("no") || lh.includes("kode") || lh.includes("id");
                  return isQtyCol && !isIdCol;
                });
                if (betterCountHeader) {
                  orderCountIdx = fileHeaders.indexOf(betterCountHeader);
                }
              }

              const exactOrderColIdx = fileHeaders.findIndex(h => h.toLowerCase().trim() === "order");
              const noOrderVariants = ["no order", "no.order", "no_order", "kode order", "order id"];
              const exactNoOrderColIdx = fileHeaders.findIndex(h => noOrderVariants.includes(h.toLowerCase().trim()));
              if (exactOrderColIdx !== -1 && exactNoOrderColIdx !== -1) {
                noOrderIdx = exactNoOrderColIdx;
                orderCountIdx = exactOrderColIdx;
              }

              let workerColIdx = fileHeaders.indexOf(config.mappings.worker);
              const physicalWorkerIdx = fileHeaders.findIndex(h => {
                const lh = h.toLowerCase().trim();
                return lh === "worker" || lh === "talent" || lh === "nama worker" || lh === "nama" || lh === "name";
              });
              if (physicalWorkerIdx !== -1) {
                workerColIdx = physicalWorkerIdx;
              }

              const indexMap = {
                tanggal: fileHeaders.indexOf(config.mappings.tanggal),
                noOrder: noOrderIdx,
                namaToko: fileHeaders.indexOf(config.mappings.namaToko),
                namaKlien: fileHeaders.indexOf(config.mappings.namaKlien),
                noTarget: fileHeaders.indexOf(config.mappings.noTarget),
                spam: fileHeaders.indexOf(config.mappings.spam),
                orderCount: orderCountIdx,
                worker: workerColIdx,
                admin: fileHeaders.indexOf(config.mappings.admin),
                limit: fileHeaders.indexOf(config.mappings.limit),
                linkBukti: fileHeaders.indexOf(config.mappings.linkBukti),
              };

              if (
                indexMap.tanggal === -1 ||
                indexMap.noOrder === -1 ||
                indexMap.worker === -1 ||
                indexMap.orderCount === -1
              ) {
                setIsRealtimeSyncing(false);
                return;
              }

              const parsedOrders: OrderData[] = [];
              for (let i = 1; i < lines.length; i++) {
                const columns = parseCsvLine(lines[i]);
                if (columns.length === 0) continue;

                const valOf = (idx: number) =>
                  idx !== -1 && idx < columns.length ? columns[idx] : "";
                
                const dateVal = valOf(indexMap.tanggal).trim();
                const orderId = valOf(indexMap.noOrder).trim();
                const workerName = valOf(indexMap.worker).trim();

                // 1. Skip completely empty rows
                if (!dateVal && !orderId && !workerName) {
                  continue;
                }

                // 2. Skip total / count / summary rows
                const isTotalRow = 
                  workerName.toLowerCase().includes("total") ||
                  workerName.toLowerCase().includes("jumlah") ||
                  workerName.toLowerCase().includes("grand") ||
                  workerName.toLowerCase().includes("summary") ||
                  workerName.toLowerCase().includes("rekap") ||
                  orderId.toLowerCase().includes("total") ||
                  orderId.toLowerCase().includes("jumlah") ||
                  dateVal.toLowerCase().includes("total") ||
                  dateVal.toLowerCase().includes("jumlah") ||
                  workerName.startsWith("=") ||
                  orderId.startsWith("=");

                if (isTotalRow) {
                  continue;
                }

                // 3. Skip headers duplicated inside cells
                if (
                  workerName.toLowerCase() === "worker" || 
                  orderId.toLowerCase() === "no order" || 
                  dateVal.toLowerCase() === "tanggal"
                ) {
                  continue;
                }

                const rawOrderCount = valOf(indexMap.orderCount);
                // Fallback blank qty cell to 1 if details are valid
                const orderCount = rawOrderCount.trim() === "" ? 1 : (parseInt(rawOrderCount.replace(/[^0-9-]/g, "")) || 0);

                const finalWorkerName = workerName || "Worker Kosong";
                const finalOrderId = orderId || `ORDER-${i}`;

                parsedOrders.push({
                  id: `sheet-legacy-${finalOrderId}-${finalWorkerName}-${i}`,
                  tanggal: dateVal,
                  noOrder: finalOrderId,
                  namaToko: valOf(indexMap.namaToko),
                  namaKlien: valOf(indexMap.namaKlien),
                  noTarget: valOf(indexMap.noTarget),
                  spam: valOf(indexMap.spam),
                  orderCount,
                  worker: finalWorkerName,
                  admin: valOf(indexMap.admin),
                  limit: valOf(indexMap.limit),
                  linkBukti: valOf(indexMap.linkBukti),
                  sourceId: "source_legacy",
                  sourceName: "Google Sheet Standar",
                });
              }

              if (parsedOrders.length > 0) {
                setOrders((prev) => {
                  // "nimpa, bukan ditambahkan" for legacy single source
                  const untouchedOrders = prev.filter((o) => o.sourceId !== "source_legacy");
                  const finalOrders = [...parsedOrders, ...untouchedOrders];
                  localStorage.setItem("order_dashboard_data", JSON.stringify(finalOrders));
                  return finalOrders;
                });

                const now = new Date();
                const localTimeString = now.toLocaleDateString("id-ID") + " " + now.toLocaleTimeString("id-ID");
                localStorage.setItem("google_sheets_last_sync", localTimeString);
                setLastSyncTime(localTimeString);
              }
              setIsRealtimeSyncing(false);
            }
          }
        } catch (e) {
          console.error("Gagal melakukan konfigurasi sinkronisasi Google Sheet legacy:", e);
          setIsRealtimeSyncing(false);
        }
      }
    };

    // Run first sync immediately on component load
    performBackgroundSync();

    // Setup active background interval running every 15 seconds to fetch in real-time
    const intervalId = setInterval(() => {
      performBackgroundSync();
    }, 15000);

    return () => clearInterval(intervalId);
  }, []);

  // Persist Rate
  const handleRateChange = (newRate: number) => {
    if (isNaN(newRate) || newRate < 0) return;
    setRate(newRate);
    localStorage.setItem("order_tariff_rate", newRate.toString());
  };

  const handleSourceRateChange = (sourceId: "source_1" | "source_2", newRate: number) => {
    if (isNaN(newRate) || newRate < 0) return;
    
    if (sourceId === "source_1") {
      setSource1Rate(newRate);
    } else {
      setSource2Rate(newRate);
    }

    const savedMultisource = localStorage.getItem("google_sheets_multisource_config");
    let sourcesList: any[] = [];
    if (savedMultisource) {
      try {
        sourcesList = JSON.parse(savedMultisource);
      } catch (e) {
        console.error("Gagal parse multisource config.");
      }
    }

    if (!Array.isArray(sourcesList) || sourcesList.length === 0) {
      sourcesList = [
        {
          id: "source_1",
          name: "Jasa Spam WA",
          url: PERMANENT_SHEETS_SOURCE_1,
          spreadsheetId: "",
          gid: "0",
          isConnected: false,
          headers: [],
          rawRows: [],
          lastSyncTime: null,
          rate: sourceId === "source_1" ? newRate : 220,
          mappings: {
            worker: "Worker",
            noOrder: "No Order",
            orderCount: "Jumlah Order",
            tanggal: "Tanggal",
            namaToko: "Nama Toko",
            namaKlien: "Nama Klien",
            noTarget: "No Target",
            spam: "Spam",
            admin: "Admin",
            limit: "Limit",
            linkBukti: "Link Bukti"
          }
        },
        {
          id: "source_2",
          name: "REPORT ALL SOSMED",
          url: PERMANENT_SHEETS_SOURCE_2,
          spreadsheetId: "",
          gid: "0",
          isConnected: false,
          headers: [],
          rawRows: [],
          lastSyncTime: null,
          rate: sourceId === "source_2" ? newRate : 500,
          mappings: {
            worker: "Worker",
            noOrder: "No Order",
            orderCount: "Jumlah Order",
            tanggal: "Tanggal",
            namaToko: "Nama Toko",
            namaKlien: "Nama Klien",
            noTarget: "No Target",
            spam: "Spam",
            admin: "Admin",
            limit: "Limit",
            linkBukti: "Link Bukti"
          }
        }
      ];
    } else {
      sourcesList = sourcesList.map((s: any) => {
        if (s.id === sourceId) {
          return { ...s, rate: newRate };
        }
        return s;
      });
    }

    localStorage.setItem("google_sheets_multisource_config", JSON.stringify(sourcesList));
    
    // Dynamically update loaded orders in state so calculations update instantly
    setOrders((prev) => {
      const nextArr = prev.map((ord) => {
        if (ord.sourceId === sourceId) {
          return { ...ord, customRate: newRate };
        }
        return ord;
      });
      localStorage.setItem("order_dashboard_data", JSON.stringify(nextArr));
      return nextArr;
    });

    triggerAlert("success", `Tarif ${sourceId === "source_1" ? "Jasa Spam WA" : "REPORT ALL SOSMED"} diupdate ke Rp ${newRate}`);
  };

  // Add Order
  const handleAddOrder = (newOrder: OrderData) => {
    const updated = [newOrder, ...orders];
    setOrders(updated);
    localStorage.setItem("order_dashboard_data", JSON.stringify(updated));
    triggerAlert("success", `Order ${newOrder.noOrder} berhasil dicatat.`);
  };

  // Update Order
  const handleUpdateOrder = (updatedOrder: OrderData) => {
    const updated = orders.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
    setOrders(updated);
    localStorage.setItem("order_dashboard_data", JSON.stringify(updated));
    triggerAlert("success", `Order ${updatedOrder.noOrder} berhasil diperbarui.`);
  };

  // Delete Order
  const handleDeleteOrder = (id: string) => {
    const orderToDelete = orders.find((o) => o.id === id);
    const updated = orders.filter((o) => o.id !== id);
    setOrders(updated);
    localStorage.setItem("order_dashboard_data", JSON.stringify(updated));
    if (orderToDelete) {
      triggerAlert("success", `Order ${orderToDelete.noOrder} di papan kerja dihapus.`);
    }
  };

  // Import parsed Worker data
  const handleImportData = (newData: OrderData[], action: "merge" | "overwrite") => {
    let finalData: OrderData[] = [];
    if (action === "overwrite") {
      finalData = newData;
      triggerAlert("success", `Data ditimpa seutuhnya dengan ${newData.length} baris baru.`);
    } else {
      // Find out if the incoming data contains sheets sources to cleanly overwrite
      // "nimpa, bukan ditambahkan"
      const incomingSourceIds = Array.from(new Set(newData.map(o => o.sourceId).filter(Boolean))) as string[];
      if (incomingSourceIds.length > 0) {
        const untouchedOrders = orders.filter(o => !o.sourceId || !incomingSourceIds.includes(o.sourceId));
        finalData = [...newData, ...untouchedOrders];
        triggerAlert("success", `Data lembar kerja berhasil diperbarui (sumber ditimpa).`);
      } else {
        finalData = [...newData, ...orders];
        triggerAlert("success", `Berhasil menggabungkan ${newData.length} order tambahan.`);
      }
    }
    setOrders(finalData);
    localStorage.setItem("order_dashboard_data", JSON.stringify(finalData));
  };

  // --- SHOPEE LOGIC MUTATORS ---
  const handleAddShopeeTransaction = (newTx: ShopeeTransaction) => {
    const updated = [newTx, ...shopeeTransactions];
    setShopeeTransactions(updated);
    localStorage.setItem("shopee_dashboard_data", JSON.stringify(updated));
    triggerAlert("success", "Transaksi Shopee berhasil ditambahkan.");
  };

  const handleUpdateShopeeTransaction = (updatedTx: ShopeeTransaction) => {
    const updated = shopeeTransactions.map((tx) => (tx.id === updatedTx.id ? updatedTx : tx));
    setShopeeTransactions(updated);
    localStorage.setItem("shopee_dashboard_data", JSON.stringify(updated));
    triggerAlert("success", "Transaksi Shopee diperbarui.");
  };

  const handleDeleteShopeeTransaction = (id: string) => {
    const updated = shopeeTransactions.filter((tx) => tx.id !== id);
    setShopeeTransactions(updated);
    localStorage.setItem("shopee_dashboard_data", JSON.stringify(updated));
    triggerAlert("success", "Transaksi Shopee dihapus.");
  };

  const handleImportShopeeData = (newData: ShopeeTransaction[], action: "merge" | "overwrite") => {
    let finalData: ShopeeTransaction[] = [];
    if (action === "overwrite") {
      finalData = newData;
      triggerAlert("success", `Data Shopee ditimpa seutuhnya dengan ${newData.length} transaksi baru.`);
    } else {
      finalData = [...newData, ...shopeeTransactions];
      triggerAlert("success", `Berhasil menggabungkan ${newData.length} transaksi Shopee tambahan.`);
    }
    setShopeeTransactions(finalData);
    localStorage.setItem("shopee_dashboard_data", JSON.stringify(finalData));
  };

  // Reset/Clear everything
  const handleResetToDefault = () => {
    if (confirm("Apakah Anda yakin ingin mematikan filter & reset seluruh data ke data bawaan contoh?")) {
      const initial = parseCSV(INITIAL_CSV_DATA);
      const initialShopee = parseShopeeCSV(INITIAL_SHOPEE_CSV_DATA);

      setOrders(initial);
      setShopeeTransactions(initialShopee);
      setRate(DEFAULT_RATE);

      localStorage.setItem("order_dashboard_data", JSON.stringify(initial));
      localStorage.setItem("shopee_dashboard_data", JSON.stringify(initialShopee));
      localStorage.setItem("order_tariff_rate", DEFAULT_RATE.toString());

      triggerAlert("info", "Semua data (Worker & Shopee) dikembalikan ke data sampel berkas asal.");
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    try {
      const csvContent = convertToCSV(orders);
      const today = new Date().toISOString().split("T")[0];
      downloadCSV(csvContent, `Laporan_Performa_Order_${today}.csv`);
      triggerAlert("success", "Laporan upah worker berhasil diekspor ke Excel.");
    } catch (e) {
      triggerAlert("error", "Gagal mengekspor laporan.");
    }
  };

  const handleExportShopeeCSV = () => {
    try {
      const csvContent = convertShopeeToCSV(shopeeTransactions);
      const today = new Date().toISOString().split("T")[0];
      downloadCSV(csvContent, `Laporan_Keuangan_Shopee_${today}.csv`);
      triggerAlert("success", "Rekap finansial Shopee berhasil diekspor ke Excel.");
    } catch (e) {
      triggerAlert("error", "Gagal mengekspor laporan finansial Shopee.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col md:flex-row font-sans text-slate-800 antialiased selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Banner alert */}
      {alert && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl border flex items-center gap-2.5 max-w-md animate-fade-in transition-all duration-300 ${
            alert.type === "success"
              ? "bg-emerald-50 border-emerald-100 text-emerald-800"
              : alert.type === "error"
              ? "bg-rose-50 border-rose-100 text-rose-800"
              : "bg-indigo-50 border-indigo-100 text-indigo-800"
          }`}
        >
          <Info className="h-4 w-4 shrink-0" />
          <span className="font-bold text-xs">{alert.message}</span>
        </div>
      )}

      {/* LEFT SIDEBAR: Brand & Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 flex flex-col border-r border-slate-800 shrink-0 text-slate-300">
        <div className="p-5 border-b border-slate-800 flex items-center space-x-3 bg-slate-950/40">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-extrabold shadow-md shadow-indigo-950/50">
            P
          </div>
          <div>
            <h1 className="text-white font-black tracking-tight text-sm">PERFOMA v2.2</h1>
            <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest block">
              Double-Source engine
            </span>
          </div>
        </div>

        {/* Navigation links nested in aside */}
        <nav className="flex-1 p-4 space-y-1 text-xs font-semibold">
          <div className="text-slate-500 px-3 py-2 text-[10px] uppercase tracking-wider font-extrabold">
            Keuangan & Dashboard
          </div>
          
          <button
            onClick={() => setActiveTab("overview")}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all text-left cursor-pointer ${
              activeTab === "overview"
                ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-950/40"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard Profit</span>
          </button>

          <div className="pt-4 text-slate-500 px-3 py-2 text-[10px] uppercase tracking-wider font-extrabold">
            Sumber 1: Pengeluaran
          </div>

          <button
            onClick={() => setActiveTab("table")}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all text-left cursor-pointer ${
              activeTab === "table"
                ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-950/40"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Table className="w-4 h-4" />
            <span className="flex-1 flex items-center justify-between">
              <span>Laporan Kerja Worker</span>
              <span className="px-1.5 py-0.5 bg-slate-800 text-slate-300 text-[9px] rounded font-bold">
                {orders.length}
              </span>
            </span>
          </button>

          <button
            onClick={() => setActiveTab("workers")}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all text-left cursor-pointer ${
              activeTab === "workers"
                ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-950/40"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Kinerja Workers</span>
          </button>

          <div className="pt-4 text-slate-500 px-3 py-2 text-[10px] uppercase tracking-wider font-extrabold">
            Sumber 2: Pendapatan
          </div>

          <button
            onClick={() => setActiveTab("shopee")}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all text-left cursor-pointer ${
              activeTab === "shopee"
                ? "bg-orange-600 text-white font-bold shadow-md shadow-orange-950/40"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-orange-400" />
            <span className="flex-1 flex items-center justify-between">
              <span>Pemasukan Shopee</span>
              <span className="px-1.5 py-0.5 bg-orange-950 text-orange-300 text-[9px] rounded font-bold">
                {shopeeTransactions.length}
              </span>
            </span>
          </button>

          <div className="pt-4 text-slate-500 px-3 py-2 text-[10px] uppercase tracking-wider font-extrabold">
            Integrasi Eksternal
          </div>

          <button
            onClick={() => setActiveTab("import")}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all text-left cursor-pointer ${
              activeTab === "import"
                ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-950/40"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Import Excel / CSV</span>
          </button>

          <div className="pt-6 text-slate-400 px-3 py-2 text-[10px] uppercase tracking-wider font-extrabold flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-slate-400" />
            <span>Pengaturan Tarif</span>
          </div>
          
          <div className="space-y-2.5 px-3">
            {/* Jasa Spam WA Rate */}
            <div className="p-2.5 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block flex items-center justify-between">
                <span>Jasa Spam WA</span>
                <span className="text-[9px] font-medium text-emerald-500 bg-emerald-500/10 px-1 py-0.5 rounded">Default: Rp 220</span>
              </label>
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg p-1">
                <span className="text-[11px] font-bold text-slate-500 pl-1 font-mono">Rp</span>
                <input
                  type="number"
                  value={source1Rate}
                  onChange={(e) => handleSourceRateChange("source_1", Number(e.target.value))}
                  className="w-full bg-transparent border-none text-[12px] font-extrabold text-white focus:ring-0 focus:outline-hidden p-0 font-mono"
                  placeholder="220"
                />
              </div>
            </div>

            {/* REPORT ALL SOSMED Rate */}
            <div className="p-2.5 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block flex items-center justify-between">
                <span>REPORT ALL SOSMED</span>
                <span className="text-[9px] font-medium text-emerald-500 bg-emerald-500/10 px-1 py-0.5 rounded">Default: Rp 500</span>
              </label>
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg p-1">
                <span className="text-[11px] font-bold text-slate-500 pl-1 font-mono">Rp</span>
                <input
                  type="number"
                  value={source2Rate}
                  onChange={(e) => handleSourceRateChange("source_2", Number(e.target.value))}
                  className="w-full bg-transparent border-none text-[12px] font-extrabold text-white focus:ring-0 focus:outline-hidden p-0 font-mono"
                  placeholder="500"
                />
              </div>
            </div>


          </div>
        </nav>

        <div className="p-4 mt-auto border-t border-slate-800 text-slate-500 text-[10px] uppercase tracking-widest text-center italic font-semibold bg-slate-950/10">
          © {new Date().getFullYear()} Perfoma Analytics
        </div>
      </aside>

      {/* RIGHT SIDEBAR PANEL: Header & App Content workspace */}
      <div className="flex-1 flex flex-col overflow-x-hidden min-h-screen">
        {/* Top Header matching High Density style */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sm:px-8 shrink-0 z-10 sticky top-0">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
              <span>Sistem Manajemen Keuangan Order</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            </h2>
            <p className="text-[10px] text-slate-400 font-medium hidden sm:flex items-center gap-2 mt-0.5">
              <span>Kecepatan penghitungan performa upah dengan tarif Rp {rate}/order</span>
              <span>•</span>
              <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100 font-bold font-mono">
                <RefreshCw className={`w-2.5 h-2.5 ${isRealtimeSyncing ? 'animate-spin text-emerald-600' : ''}`} />
                <span>Realtime Live-Sync: {lastSyncTime || "Aktif"}</span>
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={activeTab === "shopee" ? handleExportShopeeCSV : handleExportCSV}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor {activeTab === "shopee" ? "Shopee" : "Worker"}</span>
            </button>

            <button
              onClick={handleResetToDefault}
              className="p-1.5 sm:p-2 border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
              title="Reset ke Data Bawaan"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content Area with Slate gray background */}
        <main className="flex-1 p-4 sm:p-6 space-y-6 bg-[#f1f5f9]">
          
          {/* Quick Tab Selector for small screens ONLY */}
          <div className="flex md:hidden items-center gap-1 border-b border-slate-200 pb-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                activeTab === "overview" ? "bg-white text-indigo-600 shadow-3xs font-extrabold border" : "text-slate-500"
              }`}
            >
              Ringkasan
            </button>
            <button
              onClick={() => setActiveTab("table")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                activeTab === "table" ? "bg-white text-indigo-600 shadow-3xs font-extrabold border" : "text-slate-500"
              }`}
            >
              Worker ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab("shopee")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                activeTab === "shopee" ? "bg-white text-orange-600 shadow-3xs font-extrabold border" : "text-slate-500"
              }`}
            >
              Shopee ({shopeeTransactions.length})
            </button>
            <button
              onClick={() => setActiveTab("workers")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                activeTab === "workers" ? "bg-white text-indigo-600 shadow-3xs font-extrabold border" : "text-slate-500"
              }`}
            >
              Kinerja
            </button>
            <button
              onClick={() => setActiveTab("import")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                activeTab === "import" ? "bg-white text-indigo-600 shadow-3xs font-extrabold border" : "text-slate-500"
              }`}
            >
              Impor
            </button>
          </div>

          {/* Render Active Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Stats metric cards */}
              <DashboardStats orders={orders} shopeeTransactions={shopeeTransactions} rate={rate} />

              {/* Chart & Trend Visualization wrapper */}
              <PerformanceChart orders={orders} shopeeTransactions={shopeeTransactions} rate={rate} />

              {/* Action alert box widget */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-3xs p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-orange-50 text-orange-600 rounded-lg shrink-0 border border-orange-100">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Double-Source Analytics Aktif</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                      Sistem kini membandingkan omzet marketplace shopee dengan payroll upah talent secara otomatis. Impor data terbaru guna melihat kalkulator sisa bersih secara instan.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab("import")}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  Impor Sekarang
                </button>
              </div>
            </div>
          )}

          {activeTab === "table" && (
            <OrderTable
              orders={orders}
              rate={rate}
              onAddOrder={handleAddOrder}
              onUpdateOrder={handleUpdateOrder}
              onDeleteOrder={handleDeleteOrder}
              onExportCSV={handleExportCSV}
            />
          )}

          {activeTab === "shopee" && (
            <ShopeeTable
              shopeeTransactions={shopeeTransactions}
              onAddTransaction={handleAddShopeeTransaction}
              onUpdateTransaction={handleUpdateShopeeTransaction}
              onDeleteTransaction={handleDeleteShopeeTransaction}
              onExportShopeeCSV={handleExportShopeeCSV}
            />
          )}

          {activeTab === "workers" && (
            <WorkerSummary orders={orders} rate={rate} />
          )}

          {activeTab === "import" && (
            <div className="space-y-6">
              <SheetsImporter 
                onImportOrders={handleImportData} 
                ordersCount={orders.length}
              />
              
              <CsvImporter 
                onImportOrders={handleImportData} 
                onImportShopee={handleImportShopeeData} 
                ordersCount={orders.length}
                shopeeCount={shopeeTransactions.length}
              />
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
