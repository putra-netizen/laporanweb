import React, { useState, useEffect } from "react";
import { OrderData } from "../types";
import { getGoogleSheetsCsvUrl, parseCsvLine, formatRupiah, generateId, DEFAULT_RATE, fetchSpreadsheetText, PERMANENT_SHEETS_SOURCE_1, PERMANENT_SHEETS_SOURCE_2 } from "../utils";
import {
  FileSpreadsheet,
  Link2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Database,
  Check,
  ChevronDown,
  Info,
  Calendar,
  Users,
  ShoppingBag,
  ListFilter,
  CheckSquare,
  Sparkles,
  Layers,
  Settings,
  Activity,
  ArrowRight
} from "lucide-react";

interface SheetsImporterProps {
  onImportOrders: (newData: OrderData[], action: "merge" | "overwrite") => void;
  ordersCount: number;
}

export interface SheetSource {
  id: "source_1" | "source_2";
  name: string;
  url: string;
  spreadsheetId: string;
  gid: string;
  isConnected: boolean;
  headers: string[];
  rawRows: string[][];
  lastSyncTime: string | null;
  errorMsg: string;
  successMsg: string;
  rate?: number; // custom rate / tariff per order
  mappings: {
    tanggal: string;
    noOrder: string;
    namaToko: string;
    namaKlien: string;
    noTarget: string;
    spam: string;
    orderCount: string;
    worker: string;
    admin: string;
    limit: string;
    linkBukti: string;
  };
}

const DEFAULT_MAPPINGS = {
  tanggal: "Tanggal",
  noOrder: "No Order",
  namaToko: "Nama Toko",
  namaKlien: "Nama Klien",
  noTarget: "No Target",
  spam: "SPAM",
  orderCount: "Order",
  worker: "Worker",
  admin: "Admin",
  limit: "LIMIT",
  linkBukti: "Link Bukti",
};

export default function SheetsImporter({ onImportOrders, ordersCount }: SheetsImporterProps) {
  const [activeTab, setActiveTab] = useState<"source_1" | "source_2">("source_1");
  const [globalAutoSync, setGlobalAutoSync] = useState(true);
  const [globalImportAction, setGlobalImportAction] = useState<"merge" | "overwrite">("merge");
  
  // Overall state for both Google Sheets sources, pre-seeded with PERMANENT URLs when available
  const [sources, setSources] = useState<SheetSource[]>([
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
      errorMsg: "",
      successMsg: "",
      rate: 220,
      mappings: { ...DEFAULT_MAPPINGS }
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
      errorMsg: "",
      successMsg: "",
      rate: 500,
      mappings: { ...DEFAULT_MAPPINGS }
    }
  ]);

  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Load multisource configuration on mount and run silent background auto-connect if needed
  useEffect(() => {
    const savedConfig = localStorage.getItem("google_sheets_multisource_config");
    const savedGlobalAutoSync = localStorage.getItem("google_sheets_global_autosync");
    const savedGlobalImportAction = localStorage.getItem("google_sheets_global_importaction");

    if (savedGlobalAutoSync !== null) {
      setGlobalAutoSync(savedGlobalAutoSync === "true");
    }
    if (savedGlobalImportAction !== null) {
      setGlobalImportAction(savedGlobalImportAction as "merge" | "overwrite");
    }

    let initialSources: SheetSource[] = [
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
        errorMsg: "",
        successMsg: "",
        rate: 220,
        mappings: { ...DEFAULT_MAPPINGS }
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
        errorMsg: "",
        successMsg: "",
        rate: 500,
        mappings: { ...DEFAULT_MAPPINGS }
      }
    ];

    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        if (Array.isArray(parsed) && parsed.length === 2) {
          initialSources = parsed.map((item, idx) => {
            const defaultUrl = idx === 0 ? PERMANENT_SHEETS_SOURCE_1 : PERMANENT_SHEETS_SOURCE_2;
            const defaultName = idx === 0 ? "Jasa Spam WA" : "REPORT ALL SOSMED";
            const defaultRate = idx === 0 ? 220 : 500;

            const isGenericName = !item.name || item.name.startsWith("Sumber Laporan");
            const finalName = isGenericName ? defaultName : item.name;

            let finalRate = item.rate;
            if (finalRate === undefined) {
              finalRate = defaultRate;
            } else if (idx === 0 && finalRate === 500) {
              finalRate = 220; // Upgrade old default to 220
            }

            return {
              ...item,
              id: idx === 0 ? "source_1" : "source_2",
              name: finalName,
              url: defaultUrl, // Force permanent URL to stay active and completely unchangeable
              mappings: item.mappings || { ...DEFAULT_MAPPINGS },
              headers: item.headers || [],
              rawRows: item.rawRows || [],
              rate: finalRate,
              errorMsg: "",
              successMsg: ""
            };
          });
        }
      } catch (e) {
        console.error("Gagal memuat konfigurasi Google Sheets Multi-source:", e);
      }
    }

    setSources(initialSources);

    // Auto-connect disconnected permanent channels on startup silently in the background
    const autoConnect = async (sourcesToConnect: SheetSource[]) => {
      let changed = false;
      const connectedResult = await Promise.all(
        sourcesToConnect.map(async (src) => {
          if (src.url && src.url.trim() && !src.isConnected) {
            const parseResult = getGoogleSheetsCsvUrl(src.url);
            if (parseResult) {
              try {
                const text = await fetchSpreadsheetText(parseResult.csvUrl, src.name);
                const lines = text.split(/\r?\n/).filter(line => line.trim());
                if (lines.length > 0) {
                  const detectedHeaders = parseCsvLine(lines[0]);
                  const sampleRows: string[][] = [];
                  for (let i = 1; i < Math.min(lines.length, 11); i++) {
                    sampleRows.push(parseCsvLine(lines[i]));
                  }

                  // Auto-align mappings
                  const newMappings = { ...src.mappings };
                  const findBestHeaderMatch = (keywords: string[], fieldKey: keyof typeof newMappings, excludeKeywords?: string[]) => {
                    let found = detectedHeaders.find(header => {
                      const lHeader = header.toLowerCase().trim();
                      return keywords.some(keyword => lHeader === keyword.toLowerCase().trim());
                    });
                    if (!found) {
                      found = detectedHeaders.find(header => {
                        const lHeader = header.toLowerCase().trim();
                        if (excludeKeywords && excludeKeywords.some(ex => lHeader.includes(ex.toLowerCase().trim()))) {
                          return false;
                        }
                        return keywords.some(keyword => lHeader.includes(keyword.toLowerCase().trim()));
                      });
                    }
                    if (!found) {
                      found = detectedHeaders.find(header => {
                        const lHeader = header.toLowerCase().trim();
                        return keywords.some(keyword => lHeader.includes(keyword.toLowerCase().trim()));
                      });
                    }
                    if (found) {
                      newMappings[fieldKey] = found;
                    }
                  };

                  findBestHeaderMatch(["tanggal", "date", "hari"], "tanggal");
                  findBestHeaderMatch(["no order", "order id", "kode order", "order_id", "no.order", "no_order"], "noOrder");
                  findBestHeaderMatch(["nama toko", "toko", "store", "shop"], "namaToko");
                  findBestHeaderMatch(["nama klien", "nama_klien", "klien", "client"], "namaKlien");
                  findBestHeaderMatch(["no target", "no_target", "target"], "noTarget");
                  findBestHeaderMatch(["spam"], "spam");
                  findBestHeaderMatch(["order", "order count", "jumlah", "qty", "pcs"], "orderCount", ["no order", "no.order", "no_order", "kode", "id", "no"]);
                  findBestHeaderMatch(["worker", "talent", "nama worker", "name", "nama"], "worker", ["klien", "client", "toko", "store", "shop", "admin", "no", "kode"]);
                  findBestHeaderMatch(["admin"], "admin");
                  findBestHeaderMatch(["limit"], "limit");
                  findBestHeaderMatch(["link bukti", "link_bukti", "bukti", "screenshot"], "linkBukti");

                  changed = true;
                  return {
                    ...src,
                    spreadsheetId: parseResult.spreadsheetId,
                    gid: parseResult.gid,
                    isConnected: true,
                    headers: detectedHeaders,
                    rawRows: sampleRows,
                    mappings: newMappings,
                    successMsg: "Koneksi otomatis latar belakang berhasil!"
                  };
                }
              } catch (e) {
                console.warn(`[Auto-connect] Gagal menghubungkan ${src.name}:`, e);
              }
            }
          }
          return src;
        })
      );

      if (changed) {
        setSources(connectedResult);
        // Save the updated configuration with parsed metadata back to localStorage
        const persistenceData = connectedResult.map(s => ({
          id: s.id,
          name: s.name,
          url: s.url,
          spreadsheetId: s.spreadsheetId,
          gid: s.gid,
          isConnected: s.isConnected,
          mappings: s.mappings,
          headers: s.headers,
          rawRows: s.rawRows,
          lastSyncTime: s.lastSyncTime,
          rate: s.rate !== undefined ? s.rate : 500
        }));
        localStorage.setItem("google_sheets_multisource_config", JSON.stringify(persistenceData));
      }
    };

    // Run autoConnect slightly after setting state to keep UI snappy
    const timer = setTimeout(() => {
      autoConnect(initialSources);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  // Save the overall configuration state to localStorage
  const saveMultisourceConfig = (newSources: SheetSource[], updatedAutoSync = globalAutoSync, updatedImportAction = globalImportAction) => {
    // Save only persistent settings to avoid writing huge log strings unnecessarily, but preserve structural data
    const persistenceData = newSources.map(s => ({
      id: s.id,
      name: s.name,
      url: s.url,
      spreadsheetId: s.spreadsheetId,
      gid: s.gid,
      isConnected: s.isConnected,
      mappings: s.mappings,
      headers: s.headers,
      rawRows: s.rawRows,
      lastSyncTime: s.lastSyncTime,
      rate: s.rate !== undefined ? s.rate : 500
    }));
    
    localStorage.setItem("google_sheets_multisource_config", JSON.stringify(persistenceData));
    localStorage.setItem("google_sheets_global_autosync", updatedAutoSync.toString());
    localStorage.setItem("google_sheets_global_importaction", updatedImportAction);
  };

  const updateSourceState = (id: "source_1" | "source_2", updates: Partial<SheetSource>) => {
    setSources(prev => {
      const next = prev.map(s => s.id === id ? { ...s, ...updates } : s) as SheetSource[];
      saveMultisourceConfig(next);
      return next;
    });
  };

  // Test connection to a specific Google Sheet and retrieve sample data for mapping
  const handleConnectSheet = async (id: "source_1" | "source_2", e: React.FormEvent) => {
    e.preventDefault();
    const source = sources.find(s => s.id === id);
    if (!source || !source.url.trim()) {
      updateSourceState(id, { errorMsg: "Harap masukkan tautan / URL Google Sheets terlebih dahulu." });
      return;
    }

    const parseResult = getGoogleSheetsCsvUrl(source.url);
    if (!parseResult) {
      updateSourceState(id, { 
        errorMsg: "Tautan tidak valid. Silakan salin URL lengkap browser Google Spreadsheet Anda.",
        isConnected: false
      });
      return;
    }

    setIsConnecting(true);
    updateSourceState(id, { errorMsg: "", successMsg: "" });

    try {
      const text = await fetchSpreadsheetText(parseResult.csvUrl, source.name);
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      
      if (lines.length === 0) {
        throw new Error("Spreadsheet kosong atau tidak memiliki data.");
      }

      const detectedHeaders = parseCsvLine(lines[0]);
      const sampleRows: string[][] = [];
      for (let i = 1; i < Math.min(lines.length, 11); i++) {
        sampleRows.push(parseCsvLine(lines[i]));
      }

      // Automatically pair mappings with smart labels
      const newMappings = { ...source.mappings };
      const findBestHeaderMatch = (keywords: string[], fieldKey: keyof typeof newMappings, excludeKeywords?: string[]) => {
        // 1. Try exact matches first
        let found = detectedHeaders.find(header => {
          const lHeader = header.toLowerCase().trim();
          return keywords.some(keyword => lHeader === keyword.toLowerCase().trim());
        });

        // 2. Try partial match without excluded keywords
        if (!found) {
          found = detectedHeaders.find(header => {
            const lHeader = header.toLowerCase().trim();
            if (excludeKeywords && excludeKeywords.some(ex => lHeader.includes(ex.toLowerCase().trim()))) {
              return false;
            }
            return keywords.some(keyword => lHeader.includes(keyword.toLowerCase().trim()));
          });
        }

        // 3. Fallback to any inclusion match
        if (!found) {
          found = detectedHeaders.find(header => {
            const lHeader = header.toLowerCase().trim();
            return keywords.some(keyword => lHeader.includes(keyword.toLowerCase().trim()));
          });
        }

        if (found) {
          newMappings[fieldKey] = found;
        }
      };

      findBestHeaderMatch(["tanggal", "date", "hari"], "tanggal");
      findBestHeaderMatch(["no order", "order id", "kode order", "order_id", "no.order", "no_order"], "noOrder");
      findBestHeaderMatch(["nama toko", "toko", "store", "shop"], "namaToko");
      findBestHeaderMatch(["nama klien", "nama_klien", "klien", "client"], "namaKlien");
      findBestHeaderMatch(["no target", "no_target", "target"], "noTarget");
      findBestHeaderMatch(["spam"], "spam");
      findBestHeaderMatch(["order", "order count", "jumlah", "qty", "pcs"], "orderCount", ["no order", "no.order", "no_order", "kode", "id", "no"]);
      findBestHeaderMatch(["worker", "talent", "nama worker", "name", "nama"], "worker", ["klien", "client", "toko", "store", "shop", "admin", "no", "kode"]);
      findBestHeaderMatch(["admin"], "admin");
      findBestHeaderMatch(["limit"], "limit");
      findBestHeaderMatch(["link bukti", "link_bukti", "bukti", "screenshot"], "linkBukti");

      setSources(prev => {
        const next = prev.map(s => {
          if (s.id === id) {
            return {
              ...s,
              spreadsheetId: parseResult.spreadsheetId,
              gid: parseResult.gid,
              isConnected: true,
              headers: detectedHeaders,
              rawRows: sampleRows,
              mappings: newMappings,
              successMsg: `Berhasil tersambung! Terdeteksi ${detectedHeaders.length} kolom.`
            };
          }
          return s;
        });
        saveMultisourceConfig(next);
        return next;
      });

    } catch (err: any) {
      updateSourceState(id, {
        errorMsg: err.message || "Gagal menghubungkan. Silakan periksa kembali tautan Anda.",
        isConnected: false
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = (id: "source_1" | "source_2") => {
    const defaultUrl = id === "source_1" ? PERMANENT_SHEETS_SOURCE_1 : PERMANENT_SHEETS_SOURCE_2;
    if (confirm(`Apakah Anda ingin memasang ulang dan memuat ulang koneksi untuk ${sources.find(s => s.id === id)?.name}?`)) {
      updateSourceState(id, {
        url: defaultUrl,
        spreadsheetId: "",
        gid: "0",
        isConnected: false,
        headers: [],
        rawRows: [],
        errorMsg: "",
        successMsg: "",
        lastSyncTime: null,
        mappings: { ...DEFAULT_MAPPINGS }
      });
    }
  };

  const handleMappingChange = (id: "source_1" | "source_2", field: keyof SheetSource["mappings"], value: string) => {
    setSources(prev => {
      const next = prev.map(s => {
        if (s.id === id) {
          return {
            ...s,
            mappings: {
              ...s.mappings,
              [field]: value
            }
          };
        }
        return s;
      });
      saveMultisourceConfig(next);
      return next;
    });
  };

  // Build helper to fetch and parse a SINGLE source
  const fetchAndParseSingleSource = async (source: SheetSource, indexSuffix: number): Promise<OrderData[]> => {
    if (!source.isConnected || !source.url.trim()) {
      return [];
    }

    const parseResult = getGoogleSheetsCsvUrl(source.url);
    if (!parseResult) {
      throw new Error(`[${source.name}] Tautan tidak valid.`);
    }

    const text = await fetchSpreadsheetText(parseResult.csvUrl, source.name);
    const lines = text.split(/\r?\n/).filter(line => line.trim());

    if (lines.length <= 1) {
      return [];
    }

    const fileHeaders = parseCsvLine(lines[0]);
    const mappings = source.mappings;

    let noOrderIdx = fileHeaders.indexOf(mappings.noOrder);
    let orderCountIdx = fileHeaders.indexOf(mappings.orderCount);

    // Dynamic resolution if both point to the same column or orderCount contains identifier keywords
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

    // Double check: if there is a column called exactly "order" and another standard "no order", pair them correctly
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
      throw new Error(`[${source.name}] Kolom minimal Tanggal, No Order, Worker & Qty tidak dipetakan ke kolom fisik.`);
    }

    const parsedList: OrderData[] = [];
    for (let i = 1; i < lines.length; i++) {
      const columns = parseCsvLine(lines[i]);
      if (columns.length === 0) continue;

      const valOf = (idx: number) => (idx !== -1 && idx < columns.length ? columns[idx] : "");
      
      const dateVal = valOf(indexMap.tanggal).trim();
      const orderId = valOf(indexMap.noOrder).trim();
      const workerName = valOf(indexMap.worker).trim();
      
      // 1. Skip completely empty rows
      if (!dateVal && !orderId && !workerName) {
        continue;
      }
      
      // 2. Skip total / count / summary rows (very common in manual spreadsheets)
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

      // 3. Skip headers duplicated inside the cells
      if (
        workerName.toLowerCase() === "worker" || 
        orderId.toLowerCase() === "no order" || 
        dateVal.toLowerCase() === "tanggal"
      ) {
        continue;
      }

      const rawOrderCount = valOf(indexMap.orderCount);
      // Fallback empty quantity column to 1 if order details are valid, otherwise parse safe int
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
        customRate: source.rate !== undefined ? source.rate : DEFAULT_RATE,
        sourceId: source.id,
        sourceName: source.name,
      });
    }

    return parsedList;
  };

  // Sync a SINGLE source specifically
  const handleSyncSingle = async (id: "source_1" | "source_2") => {
    const source = sources.find(s => s.id === id);
    if (!source || !source.isConnected) {
      updateSourceState(id, { errorMsg: "Sheet belum terhubung." });
      return;
    }

    setIsConnecting(true);
    updateSourceState(id, { errorMsg: "", successMsg: "" });

    try {
      const parsedOrders = await fetchAndParseSingleSource(source, 1);
      
      if (parsedOrders.length === 0) {
        throw new Error("Tidak ada baris transaksi valid ditemukan.");
      }

      onImportOrders(parsedOrders, globalImportAction);

      const now = new Date();
      const localTimeString = now.toLocaleDateString("id-ID") + " " + now.toLocaleTimeString("id-ID");
      
      setSources(prev => {
        const next = prev.map(s => {
          if (s.id === id) {
            return {
              ...s,
              lastSyncTime: localTimeString,
              successMsg: `Sinkronisasi lokal berhasil! Diimpor ${parsedOrders.length} order dari sheet ini.`
            };
          }
          return s;
        });
        saveMultisourceConfig(next);
        return next;
      });

    } catch (err: any) {
      updateSourceState(id, { errorMsg: err.message || "Gagal sinkronisasi data dari spreadsheet." });
    } finally {
      setIsConnecting(false);
    }
  };

  // Sync BOTH sources at once
  const handleSyncAllSources = async () => {
    const connectedSources = sources.filter(s => s.isConnected && s.url.trim());
    
    if (connectedSources.length === 0) {
      alert("Belum ada Google Sheet yang tersambung. Hubungkan minimal 1 sumber untuk melakukan inkronisasi.");
      return;
    }

    setIsSyncingAll(true);
    let cumulativeOrders: OrderData[] = [];
    let logs: string[] = [];
    let errorLogs: string[] = [];

    const now = new Date();
    const localTimeString = now.toLocaleDateString("id-ID") + " " + now.toLocaleTimeString("id-ID");

    const updatedSources = [...sources];

    for (let s of updatedSources) {
      if (s.isConnected && s.url.trim()) {
        try {
          const fetched = await fetchAndParseSingleSource(s, s.id === "source_1" ? 1 : 2);
          cumulativeOrders = [...cumulativeOrders, ...fetched];
          s.lastSyncTime = localTimeString;
          s.successMsg = `Berhasil mengimpor ${fetched.length} baris.`;
          s.errorMsg = "";
          logs.push(`${s.name}: ${fetched.length} order`);
        } catch (err: any) {
          s.errorMsg = err.message || "Gagal mengimpor data.";
          s.successMsg = "";
          errorLogs.push(`${s.name} gagal (${err.message})`);
        }
      }
    }

    setSources(updatedSources);
    saveMultisourceConfig(updatedSources);

    if (cumulativeOrders.length > 0) {
      onImportOrders(cumulativeOrders, globalImportAction);
      
      const successFeedback = `Sinkronisasi Multi-sheet berhasil! Total ${cumulativeOrders.length} order dimuat dari ${logs.length} sumber sheets. (${logs.join(", ")})`;
      alert(successFeedback);
    }

    if (errorLogs.length > 0) {
      alert(`Peringatan beberapa sumber gagal disinkronkan:\n${errorLogs.join("\n")}`);
    }

    setIsSyncingAll(false);
  };

  const activeSource = sources.find(s => s.id === activeTab) || sources[0];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6" id="google-sheets-exporter-wrapper">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600">
            <FileSpreadsheet className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-800 flex items-center gap-2">
              <span>Google Sheets Multi-Source Integrator</span>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] rounded-full font-black uppercase tracking-wider">
                Multi-Spreadsheet Active
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Mendukung sinkronisasi 2 berkas Google Sheets terpisah yang menampung laporan worker/talent Anda secara bersamaan.
            </p>
          </div>
        </div>

        {/* Global Action Trigger is extremely convenient */}
        <button
          type="button"
          onClick={handleSyncAllSources}
          disabled={isSyncingAll || sources.filter(s => s.isConnected).length === 0}
          className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white disabled:from-slate-100 disabled:to-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs shrink-0"
        >
          <Layers className={`w-3.5 h-3.5 ${isSyncingAll ? "animate-spin" : ""}`} />
          <span>⚡ Sinkronkan Semua Sumber (1 & 2)</span>
        </button>
      </div>

      {/* Multiple source tabs navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-1.5 rounded-xl gap-2">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {sources.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveTab(s.id)}
              className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === s.id
                  ? "bg-white text-emerald-700 shadow-xs border border-emerald-150"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${s.isConnected ? "bg-emerald-500 animate-ping" : "bg-slate-300"}`} />
              <input
                type="text"
                value={s.name}
                onClick={(e) => e.stopPropagation()} // Prevent switching tabs on click input
                onChange={(e) => {
                  const updatedName = e.target.value;
                  setSources(prev => {
                    const next = prev.map(item => item.id === s.id ? { ...item, name: updatedName } : item) as SheetSource[];
                    saveMultisourceConfig(next);
                    return next;
                  });
                }}
                className="bg-transparent border-none max-w-[120px] focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded px-1.5 py-0.5 text-xs text-inherit font-bold"
                placeholder="Ubah Label..."
              />
            </button>
          ))}
        </div>

        {activeSource.isConnected && activeSource.lastSyncTime && (
          <div className="px-3 py-1 bg-white/70 rounded-lg text-right hidden sm:block">
            <span className="text-[9px] text-slate-400 font-bold block">SINKRONISASI {activeSource.name.toUpperCase()}</span>
            <span className="text-[10px] font-mono font-bold text-slate-600 block">{activeSource.lastSyncTime}</span>
          </div>
        )}
      </div>

      {/* Main Container tailored for the ACTIVE source */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/20 p-5 border border-slate-200/60 rounded-2xl">
        
        {/* Left Side: Input config, guide actions for active tab */}
        <div className="lg:col-span-6 space-y-4">
          <form onSubmit={(e) => handleConnectSheet(activeSource.id, e)} className="space-y-3">
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <span>Alamat Tautan (URL) Google Sheet - {activeSource.name}</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    🔒 PERMANEN
                  </span>
                </span>
                <span className={`font-black text-[10px] uppercase ${activeSource.isConnected ? "text-emerald-600" : "text-amber-500"}`}>
                  {activeSource.isConnected ? "✓ Tersambung" : "● Belum Konek"}
                </span>
              </label>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Link2 className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={activeSource.url}
                    readOnly={true}
                    placeholder="Belum ada URL terpasang"
                    className="w-full text-xs py-2.5 pl-10 pr-4 bg-slate-100/80 border border-slate-200 rounded-xl cursor-not-allowed select-none text-slate-500 font-mono"
                    title="Tautan ini telah dipermanenkan di backend dan tidak dapat diubah dari UI."
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={isConnecting || !activeSource.url.trim()}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  {isConnecting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : activeSource.isConnected ? (
                    <span>Refresh Koneksi</span>
                  ) : (
                    <span>Hubungkan</span>
                  )}
                </button>
              </div>
              <p className="text-[9px] text-slate-400 font-medium leading-normal mt-1.5">
                * Tautan Google Sheet ini sudah dikunci secara permanen di server/backend kami agar selalu otomatis sinkron tanpa perlu diinput lagi. Anda dapat mengubah tautan ini langsung melalui berkas file konfigurasi <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-slate-600">src/utils.ts</code> atau <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-slate-600">.env</code>.
              </p>
            </div>

            {activeSource.url && !activeSource.url.includes("/d/e/") && (
              <div className="text-[11px] bg-amber-50 border border-amber-200 text-amber-950 p-3.5 rounded-xl space-y-1.5 shadow-3xs">
                <span className="font-black flex items-center gap-1.5 text-amber-800">
                  <span className="text-sm">💡</span> Tips Bebas Limit & CORS Vercel (Rekomendasi Utama):
                </span>
                <p className="leading-relaxed">
                  Tautan yang Anda gunakan saat ini adalah tautan berbagi editor biasa. Pada server publik (Vercel), Google sering membatasi tautan jenis ini atau meminta login.
                </p>
                <div className="text-[10px] bg-amber-100/40 p-2.5 rounded-lg text-amber-950 font-normal space-y-1">
                  <p className="font-bold text-amber-900">Cara mempublikasikan ke publik agar sinkronisasi 100% instan, tanpa limit & stabil:</p>
                  <ol className="list-decimal pl-4 space-y-1 leading-normal text-slate-700">
                    <li>Buka file Google Sheets Anda.</li>
                    <li>Di pojok kiri atas, klik menu <b>File</b> → <b>Bagikan (Share)</b> → <b>Publikasikan ke web (Publish to web)</b>.</li>
                    <li>Ubah pilihan dropdown "Halaman Web" menjadi <b>"Nilai yang dipisahkan koma (.csv)"</b>.</li>
                    <li>Klik tombol hijau <b>Publikasikan (Publish)</b> kemudian klik OK.</li>
                    <li>Ganti URL di berkas <code className="bg-amber-100 px-1 py-0.5 rounded text-[9px] font-mono font-bold text-amber-900">src/utils.ts</code> dengan URL hasil publikasi berakhiran <code className="bg-amber-100 px-1 py-0.5 rounded text-[9px] font-mono font-bold text-amber-900">/pub?output=csv</code> tersebut agar koneksi internet super cepat dan tanpa hambatan!</li>
                  </ol>
                </div>
              </div>
            )}

            {/* Custom Rate Block for specific Source */}
            <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-3.5 space-y-2">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                💰 Tarif per Order ({activeSource.name})
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="100"
                  max="5000"
                  step="50"
                  value={activeSource.rate !== undefined ? activeSource.rate : 500}
                  onChange={(e) => {
                    const r = parseInt(e.target.value) || 500;
                    updateSourceState(activeSource.id, { rate: r });
                  }}
                  className="flex-1 accent-emerald-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-bold">Rp</span>
                  <input
                    type="number"
                    value={activeSource.rate !== undefined ? activeSource.rate : 500}
                    onChange={(e) => {
                      const r = parseInt(e.target.value) || 0;
                      updateSourceState(activeSource.id, { rate: r });
                    }}
                    className="w-16 text-center font-bold font-mono text-xs py-1 border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <p className="text-[9px] text-slate-400 font-normal leading-normal">
                Setiap transaksi dari sumber <b>{activeSource.name}</b> akan dihitung dengan harga khusus <b>Rp {activeSource.rate !== undefined ? activeSource.rate : 500}</b> per order.
              </p>
            </div>
          </form>

          {/* Guide boxes */}
          <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              <span>Cara Menghubungkan Google Sheet Anda:</span>
            </h4>
            <ol className="text-[10px] text-slate-600 list-decimal pl-4 space-y-1 leading-relaxed">
              <li>Buka file laporan kerja/kontribusi Anda di Google Sheets.</li>
              <li>Klik <b className="text-emerald-700">Bagikan (Share)</b> kemudian ubah Akses Umum menjadi <b className="text-emerald-700">"Siapa saja yang memiliki link dapat melihat"</b>.</li>
              <li>Salin alamat baris URL browser Anda lalu masukkan di kolom input di atas.</li>
              <li>Sesuaikan penamaan pemetaan kolom di sebelah kanan jika header Anda berbeda.</li>
            </ol>
          </div>

          {/* Sync status logs */}
          {activeSource.isConnected && (
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-3xs">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block">Aksi Sumber {activeSource.name}</span>
              
              <div className="flex items-center justify-between py-1 text-xs">
                <div>
                  <span className="font-bold text-slate-800 block">Ketersediaan Kolom</span>
                  <span className="text-[9px] text-slate-400">Total kolom yang terbaca dari baris teratas Spreadsheet.</span>
                </div>
                <div className="px-2.5 py-1 bg-slate-100 text-slate-700 font-mono font-bold rounded-md">
                  {activeSource.headers.length} Kolom
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleDisconnect(activeSource.id)}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                >
                  Reset & Reload Tautan
                </button>

                <button
                  type="button"
                  onClick={() => handleSyncSingle(activeSource.id)}
                  disabled={isConnecting}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs"
                >
                  <RefreshCw className={`w-3 h-3 ${isConnecting ? "animate-spin" : ""}`} />
                  <span>Sync Sheet Ini</span>
                </button>
              </div>
            </div>
          )}

          {/* Logs & toasts */}
          {activeSource.errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
              <div>
                <span className="font-bold">Eror Koneksi ({activeSource.name})</span>
                <p className="text-[10px] text-rose-600 mt-0.5">{activeSource.errorMsg}</p>
              </div>
            </div>
          )}

          {activeSource.successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
              <div>
                <span className="font-bold">Berhasil</span>
                <p className="text-[10px] text-emerald-600 mt-0.5">{activeSource.successMsg}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Column Mappings & Raw Preview data for active tab */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
          {!activeSource.isConnected ? (
            <div className="h-full border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-slate-50/50 min-h-[250px]">
              <FileSpreadsheet className="w-8 h-8 text-slate-350 mb-2" />
              <h5 className="text-xs font-bold text-slate-650">Koneksi Belum Terjalin</h5>
              <p className="text-[10px] text-slate-400 max-w-xs mt-1 leading-relaxed">
                Silakan tempel URL Google Sheet untuk <span className="font-semibold text-emerald-600">{activeSource.name}</span> di sebelah kiri, kemudian klik Hubungkan untuk dapat melakukan auto-mapping kolom serta melihat contoh baris data.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl p-5 bg-white flex-1 flex flex-col justify-between space-y-4 shadow-3xs">
              
              {/* Dynamic Selectors Mappings */}
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">
                    Pemetaan Kolom ({activeSource.name})
                  </span>
                  <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">Auto Detected</span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs max-h-[180px] overflow-y-auto pr-1">
                  {/* Date mapping */}
                  <div>
                    <label className="text-[9px] text-slate-400 font-semibold uppercase block mb-1">
                      1. Kolom Tanggal <span className="text-rose-600 font-bold">*</span>
                    </label>
                    <select
                      value={activeSource.mappings.tanggal}
                      onChange={(e) => handleMappingChange(activeSource.id, "tanggal", e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-hidden text-[11px] font-medium"
                    >
                      {activeSource.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* Order ID Mapping */}
                  <div>
                    <label className="text-[9px] text-slate-400 font-semibold uppercase block mb-1">
                      2. No Order ID <span className="text-rose-600 font-bold">*</span>
                    </label>
                    <select
                      value={activeSource.mappings.noOrder}
                      onChange={(e) => handleMappingChange(activeSource.id, "noOrder", e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-hidden text-[11px] font-medium"
                    >
                      {activeSource.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* Worker Name Mapping */}
                  <div>
                    <label className="text-[9px] text-slate-400 font-semibold uppercase block mb-1">
                      3. Nama Worker/Talent <span className="text-rose-600 font-bold">*</span>
                    </label>
                    <select
                      value={activeSource.mappings.worker}
                      onChange={(e) => handleMappingChange(activeSource.id, "worker", e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-hidden text-[11px] font-medium"
                    >
                      {activeSource.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* Qty Mapping */}
                  <div>
                    <label className="text-[9px] text-slate-400 font-semibold uppercase block mb-1">
                      4. Jumlah Order/Qty <span className="text-rose-600 font-bold">*</span>
                    </label>
                    <select
                      value={activeSource.mappings.orderCount}
                      onChange={(e) => handleMappingChange(activeSource.id, "orderCount", e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-hidden text-[11px] font-medium"
                    >
                      {activeSource.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* Store Name Mapping */}
                  <div>
                    <label className="text-[9px] text-slate-400 font-semibold uppercase block mb-1">
                      Nama Toko (Opsional)
                    </label>
                    <select
                      value={activeSource.mappings.namaToko}
                      onChange={(e) => handleMappingChange(activeSource.id, "namaToko", e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-hidden text-[11px]"
                    >
                      <option value="">Jangan Impor</option>
                      {activeSource.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* Client Name Mapping */}
                  <div>
                    <label className="text-[9px] text-slate-400 font-semibold uppercase block mb-1">
                      Nama Klien (Opsional)
                    </label>
                    <select
                      value={activeSource.mappings.namaKlien}
                      onChange={(e) => handleMappingChange(activeSource.id, "namaKlien", e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-hidden text-[11px]"
                    >
                      <option value="">Jangan Impor</option>
                      {activeSource.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* No Target Mapping */}
                  <div>
                    <label className="text-[9px] text-slate-400 font-semibold uppercase block mb-1">
                      No Target (Opsional)
                    </label>
                    <select
                      value={activeSource.mappings.noTarget}
                      onChange={(e) => handleMappingChange(activeSource.id, "noTarget", e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-hidden text-[11px]"
                    >
                      <option value="">Jangan Impor</option>
                      {activeSource.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* SPAM Mapping */}
                  <div>
                    <label className="text-[9px] text-slate-400 font-semibold uppercase block mb-1">
                      Kategori SPAM (Opsional)
                    </label>
                    <select
                      value={activeSource.mappings.spam}
                      onChange={(e) => handleMappingChange(activeSource.id, "spam", e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-hidden text-[11px]"
                    >
                      <option value="">Jangan Impor</option>
                      {activeSource.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Data Sample Preview Widget */}
              {activeSource.rawRows.length > 0 && (
                <div>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block mb-1.5">
                    Contoh Baris Terbaca ({activeSource.name})
                  </span>
                  <div className="bg-slate-50 border border-slate-250/60 rounded-xl overflow-hidden text-[10px] font-medium text-slate-600">
                    <div className="bg-slate-100 grid grid-cols-4 px-3 py-1.5 border-b border-slate-200 text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                      <span>Tanggal</span>
                      <span>Worker</span>
                      <span>No Order</span>
                      <span className="text-right">Estimasi</span>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-[100px] overflow-y-auto">
                      {activeSource.rawRows.slice(0, 3).map((row, idx) => {
                        const valOf = (fieldName: string) => {
                          const index = activeSource.headers.indexOf(fieldName);
                          return index !== -1 && index < row.length ? row[index] : "-";
                        };
                        const orderCountVal = parseInt(valOf(activeSource.mappings.orderCount).replace(/[^0-9-]/g, "")) || 0;
                        const individualRate = activeSource.rate !== undefined ? activeSource.rate : DEFAULT_RATE;
                        return (
                          <div key={idx} className="grid grid-cols-4 px-3 py-2 bg-white hover:bg-slate-50/40">
                            <span className="truncate">{valOf(activeSource.mappings.tanggal)}</span>
                            <span className="font-bold text-slate-800 truncate">{valOf(activeSource.mappings.worker)}</span>
                            <span className="font-mono text-emerald-700 truncate">{valOf(activeSource.mappings.noOrder)}</span>
                            <span className="font-mono font-bold text-slate-850 text-right">{formatRupiah(orderCountVal * individualRate)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleSyncSingle(activeSource.id)}
                disabled={isConnecting}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isConnecting ? "animate-spin" : ""}`} />
                <span>Ubah & Tarik Data Ke Database Sekarang</span>
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Global settings section for integrations */}
      <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold text-slate-700 items-center">
        
        {/* Auto Sync Toggle */}
        <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-150">
          <div>
            <span className="text-slate-800 block text-[11px] font-black">Sync Otomatis Latar belakang</span>
            <span className="text-[9px] text-slate-400 block font-normal">Tarik data 2 sheets saat halaman pertamakali dimuat.</span>
          </div>
          
          <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
            <input
              type="checkbox"
              checked={globalAutoSync}
              onChange={(e) => {
                const checked = e.target.checked;
                setGlobalAutoSync(checked);
                saveMultisourceConfig(sources, checked, globalImportAction);
              }}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        {/* Global Import Action Method */}
        <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-150">
          <div>
            <span className="text-slate-800 block text-[11px] font-black">Metode Integrasi Database</span>
            <span className="text-[9px] text-slate-400 block font-normal">Atur apakah impor menimpa atau menumpuk laporan.</span>
          </div>

          <select
            value={globalImportAction}
            onChange={(e) => {
              const val = e.target.value as "merge" | "overwrite";
              setGlobalImportAction(val);
              saveMultisourceConfig(sources, globalAutoSync, val);
            }}
            className="bg-slate-50 border border-slate-200 text-[10px] font-extrabold px-1.5 py-1 rounded-md focus:ring-1 focus:ring-emerald-500 text-slate-800"
          >
            <option value="merge">Gabungkan (Merge)</option>
            <option value="overwrite">Timpa Semua (Overwrite)</option>
          </select>
        </div>

        {/* Sync Summary Indicators */}
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl px-4 py-2 text-[11px] text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600" />
            <div>
              <span className="font-extrabold block text-slate-800">Status Integrator</span>
              <span className="text-[9px] text-emerald-700 block font-normal">
                {sources.filter(s => s.isConnected).length} dari 2 Lembar terhubung
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 bg-emerald-100 rounded text-[9px] font-bold text-emerald-800">Ready</span>
        </div>

      </div>

    </div>
  );
}
