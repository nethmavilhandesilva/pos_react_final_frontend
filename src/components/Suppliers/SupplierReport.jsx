import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { flushSync } from 'react-dom';
import api from "../../api";
import { useNavigate } from 'react-router-dom';

// --- CONSTANTS for the background refresh loop ---
// Tuned so clicks / F4 always win the browser connection pool over background work.
const REFRESH_DELAY_MS = 4000;   // keep sidebars close to DB all day
const POLL_TIMEOUT_MS = 7000;    // abort hung polling requests
const CLICK_TIMEOUT_MS = 5000;   // abort hung bill-detail requests so UI never sticks on loading
const PREFETCH_TIMEOUT_MS = 3500;
const DETAILS_REFRESH_EVERY = 4; // refresh open bill every Nth poll (summary still every tick)
const USER_BUSY_MS = 1200;       // pause polling/prefetch after click / print (keeps F4 hot)
const MUTATION_SAFETY_MS = 30000;// auto-clear stuck mutation lock
const CACHE_MAX = 300;           // max cached bills / suppliers (keeps day-long use snappy)
const PREFETCH_MAX_CONCURRENT = 3; // warm several bills so sidebar clicks paint instantly
const PREFETCH_BATCH = 60;       // warm enough of both lists that clicks rarely miss cache
const BILL_HTML_CACHE_MAX = 16;
const MUTATION_TIMEOUT_MS = 10000; // never wait forever on POST/PUT
const PRINT_LOCK_SAFETY_MS = 8000; // auto-clear stuck print lock (never block F4 long)
const PRINT_WAIT_DETAILS_MS = 8000; // F4 right after click: wait for details before giving up

// Module-level print entry — survives remount gaps so F4 never finds a null ref mid-day
let latestSupplierPrintHandler = null;

// GET with abort timeout. Optional external signal aborts when user clicks another bill.
const getWithTimeout = (url, externalSignal = null, timeoutMs = POLL_TIMEOUT_MS) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const onExternalAbort = () => controller.abort();
    if (externalSignal) {
        if (externalSignal.aborted) controller.abort();
        else externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
    return api.get(url, { signal: controller.signal }).finally(() => {
        clearTimeout(timer);
        if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
    });
};

// POST/PUT with abort timeout — prevents day-long hangs when the server stalls
const mutateWithTimeout = (method, url, data, timeoutMs = MUTATION_TIMEOUT_MS) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const req = method === 'put'
        ? api.put(url, data, { signal: controller.signal })
        : api.post(url, data, { signal: controller.signal });
    return req.finally(() => clearTimeout(timer));
};

// --- Instant-paint caches (module scope: survive remounts, shared across the day) ---
const detailsCache = new Map();   // key -> details array
const supplierCache = new Map();  // code -> supplier profile object
const billContentCache = new Map(); // key -> HTML (must be module-scope or cache is useless)
const prefetchInFlight = new Map(); // key -> Promise
const prefetchAbortControllers = new Set(); // abort in-flight warm requests on click/F4
let prefetchActive = 0;
let prefetchPaused = false;
const prefetchQueue = [];

const cachePut = (map, key, value) => {
    if (map.has(key)) map.delete(key);
    map.set(key, value);
    while (map.size > CACHE_MAX) {
        map.delete(map.keys().next().value);
    }
};

// Never poison the cache with empty results (causes slow clicks / failed F4 later)
const cachePutDetails = (key, rows) => {
    if (Array.isArray(rows) && rows.length > 0) cachePut(detailsCache, key, rows);
    else detailsCache.delete(key);
};

const detailsCacheKey = (isUnprinted, supplierCode, billNo) =>
    isUnprinted ? `u:${supplierCode}` : `p:${billNo}`;

const pausePrefetch = () => {
    prefetchPaused = true;
    // Drop pending queue so new clicks get free slots — but do NOT abort in-flight
    // warm jobs: the bill the user just clicked is often the one being prefetched.
    prefetchQueue.length = 0;
};

const resumePrefetchSoon = (delayMs = USER_BUSY_MS) => {
    clearTimeout(resumePrefetchSoon._t);
    resumePrefetchSoon._t = setTimeout(() => {
        prefetchPaused = false;
    }, delayMs);
};

const applySupplierToState = (d, supplierCode, setters) => {
    if (!d) return;
    const { setAdvanceAmount, setProfilePic, setSupplierDocs } = setters;
    setAdvanceAmount(parseFloat(d.advance_amount) || 0);
    setProfilePic(d.profile_pic ?? null);
    setSupplierDocs({
        title: d.name || supplierCode,
        profile: d.profile_pic,
        nic_front: d.nic_front,
        nic_back: d.nic_back,
    });
};

// Fast O(n) equality — never JSON.stringify large lists (that freezes the tab over a long day)
const sameSummaryList = (a, b) => {
    if (a === b) return true;
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i].supplier_code !== b[i].supplier_code) return false;
        if (String(a[i].supplier_bill_no ?? '') !== String(b[i].supplier_bill_no ?? '')) return false;
        // Catch status / amount updates so sidebars never look stale all day
        if (String(a[i].updated_at ?? a[i].timestamp ?? '') !== String(b[i].updated_at ?? b[i].timestamp ?? '')) return false;
        if (String(a[i].total ?? a[i].SupplierTotal ?? '') !== String(b[i].total ?? b[i].SupplierTotal ?? '')) return false;
    }
    return true;
};

const sameDetailsList = (a, b) => {
    if (a === b) return true;
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        const x = a[i], y = b[i];
        if (x.id !== y.id) return false;
        if (x.SupplierPricePerKg !== y.SupplierPricePerKg) return false;
        if (x.SupplierTotal !== y.SupplierTotal) return false;
        if (x.weight !== y.weight) return false;
        if (x.packs !== y.packs) return false;
    }
    return true;
};

const sameDocs = (a, b) =>
    a === b || (!!a && !!b && a.title === b.title && a.profile === b.profile && a.nic_front === b.nic_front && a.nic_back === b.nic_back);

// Create / reset the shared print iframe (reset fixes day-long detached-document failures)
let printIframeUseCount = 0;
const ensurePrintIframe = (forceNew = false) => {
    let iframe = document.getElementById('print-iframe');
    if (forceNew && iframe) {
        try { iframe.remove(); } catch { /* ignore */ }
        iframe = null;
        printIframeUseCount = 0;
    }
    if (iframe) {
        try {
            const win = iframe.contentWindow;
            if (!win || !win.document) {
                iframe.remove();
                iframe = null;
            }
        } catch {
            try { iframe.remove(); } catch { /* ignore */ }
            iframe = null;
        }
    }
    if (iframe) return iframe;
    iframe = document.createElement('iframe');
    iframe.id = 'print-iframe';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.setAttribute('title', 'print');
    Object.assign(iframe.style, {
        position: 'fixed',
        right: '0',
        bottom: '0',
        width: '1px',
        height: '1px',
        border: 'none',
        opacity: '0',
        pointerEvents: 'none',
        zIndex: '-1',
    });
    document.body.appendChild(iframe);
    return iframe;
};

const printViaPopup = (content) => {
    try {
        const w = window.open('', '_blank', 'noopener,noreferrer,width=420,height=640');
        if (!w) return false;
        w.document.open();
        w.document.write(content);
        w.document.close();
        w.focus();
        w.print();
        return true;
    } catch (e) {
        console.error('Print popup failed:', e);
        return false;
    }
};

// SYNCHRONOUS print — always use a fresh iframe (reused iframes often stop showing the dialog after the 1st print).
const printHtml = (content) => {
    if (!content || typeof content !== 'string') return false;
    printIframeUseCount += 1;

    const tryIframePrint = (target) => {
        const win = target.contentWindow;
        if (!win) throw new Error('no contentWindow');
        const doc = win.document;
        doc.open();
        doc.write(content);
        doc.close();
        win.focus();
        win.print();
        return true;
    };

    // Always recreate — day-long / multi-print sessions fail when the old iframe stays attached
    let iframe = ensurePrintIframe(true);
    try {
        const ok = tryIframePrint(iframe);
        try { window.focus(); } catch { /* ignore */ }
        return ok;
    } catch (e) {
        console.error('Print write/print failed, recreating iframe:', e);
        try { iframe.remove(); } catch { /* ignore */ }
        iframe = ensurePrintIframe(true);
        try {
            const ok2 = tryIframePrint(iframe);
            try { window.focus(); } catch { /* ignore */ }
            return ok2;
        } catch (e2) {
            console.error('Print iframe failed, using popup:', e2);
            return printViaPopup(content);
        }
    }
};
// --- Pure helpers (module scope: created once, never re-allocated per render) ---
const formatDecimal = (value, decimals = 2) => (parseFloat(value) || 0).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
});

const getRowStyle = (index) => index % 2 === 0 ? { backgroundColor: '#f8f9fa' } : { backgroundColor: '#ffffff' };

// Scroll positions survive list re-renders (module scope so they also survive remounts)
const scrollPositions = {};

const listButtonBaseStyle = {
    width: '100%',
    display: 'block',
    textAlign: 'left',
    padding: '4px 10px',  // <-- Reduced from 10px 15px to 4px 10px
    borderRadius: '4px',  // <-- Slightly smaller radius
    cursor: 'pointer',
    fontWeight: '600',
    border: 'none',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    fontSize: '0.85rem',  // <-- Reduced from 1rem to 0.85rem
    marginBottom: '2px',  // <-- Reduced from 4px to 2px
    boxSizing: 'border-box',
    lineHeight: '1.4'     // <-- Added for better text spacing
};
const printedButtonStyle = { ...listButtonBaseStyle, backgroundColor: '#1E88E5', color: 'white' };
const unprintedButtonStyle = { ...listButtonBaseStyle, backgroundColor: '#FF7043', color: 'white' };
const billLabelStyle = { display: 'block', textAlign: 'left', fontSize: '15px', fontWeight: '600' };
const evenRowStyle = { backgroundColor: '#f8f9fa', cursor: 'pointer' };
const oddRowStyle = { backgroundColor: '#ffffff', cursor: 'pointer' };
const detailTdStyle = { padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #dee2e6', whiteSpace: 'normal' };

// Stable list button — avoids re-creating handlers/DOM for unchanged rows during rapid clicks
const BillListButton = memo(({ code, id, billNo, label, buttonStyle, onSelect, onPrefetch }) => (
    <button
        type="button"
        onPointerDown={(e) => {
            if (e.button != null && e.button !== 0) return;
            e.preventDefault();
            onSelect(code, billNo);
        }}
        onPointerEnter={() => onPrefetch?.(code, billNo)}
        onMouseEnter={() => onPrefetch?.(code, billNo)}
        onFocus={() => onPrefetch?.(code, billNo)}
        style={buttonStyle}
    >
        <span style={billLabelStyle}>{label}</span>
    </button>
));

const DetailDataRow = memo(({ record, index, billNo, onEdit }) => (
    <tr style={index % 2 === 0 ? evenRowStyle : oddRowStyle} onClick={() => onEdit(record)}>
        <td style={detailTdStyle}>{record.bill_no || billNo}</td>
        <td style={detailTdStyle}>{record.customer_code}</td>
        <td style={detailTdStyle}><strong>{record.item_name}</strong></td>
        <td style={detailTdStyle}>{record.packs}</td>
        <td style={detailTdStyle}>{record.weight}</td>
        <td style={detailTdStyle}>{record.price_per_kg}</td>
        <td style={detailTdStyle}>{record.SupplierPricePerKg}</td>
        <td style={detailTdStyle}>{formatDecimal((record?.total || 0) - (record?.CustomerPackLabour || 0))}</td>
        <td style={detailTdStyle}>{record.SupplierTotal}</td>
        <td style={detailTdStyle}>{record.commission_amount}</td>
    </tr>
));

// --- Supplier code list ---
// Defined OUTSIDE the main component and memoized, so React keeps the same DOM between
// refreshes instead of destroying and rebuilding the whole list every poll.
const SupplierCodeList = memo(({ items, type, searchTerm, onSelect, onPrefetch }) => {
    const containerRef = useRef(null);
    const scrollKey = type;

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const handleScroll = () => { scrollPositions[scrollKey] = container.scrollTop; };
        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, [scrollKey]);

    useEffect(() => {
        const container = containerRef.current;
        if (container && scrollPositions[scrollKey] !== undefined) {
            container.scrollTop = scrollPositions[scrollKey];
        }
    }, [items, scrollKey]);

    const groupedItems = useMemo(() => {
        const groups = {};
        for (const item of items) {
            const { supplier_code, supplier_bill_no } = item;
            if (!supplier_code) continue;
            if (!groups[supplier_code]) groups[supplier_code] = [];
            if (type === 'printed' && supplier_bill_no) {
                groups[supplier_code].push(supplier_bill_no);
            } else if (type === 'unprinted' && groups[supplier_code].length === 0) {
                groups[supplier_code].push(supplier_code);
            }
        }
        if (type === 'printed') {
            for (const code of Object.keys(groups)) {
                groups[code].sort((a, b) => a - b);
            }
        }
        return groups;
    }, [items, type]);

    const supplierCodes = useMemo(() => Object.keys(groupedItems).sort(), [groupedItems]);
    const buttonStyle = type === 'printed' ? printedButtonStyle : unprintedButtonStyle;

    if (items.length === 0) {
        return <p style={{ color: '#6c757d', padding: '10px' }}>
            {searchTerm ? `No results found` : 'මෙම ප්‍රවර්ගයේ සැපයුම්කරු නොමැත'}
        </p>;
    }

    return (
        <div ref={containerRef} style={listContainerStyle}>
            {supplierCodes.map(code => (
                <div key={code}>
                    {groupedItems[code].map(id => {
                        const billNo = type === 'printed' ? id : null;
                        return (
                            <BillListButton
                                key={id}
                                code={code}
                                id={id}
                                billNo={billNo}
                                label={type === 'printed' ? `${code}-${id}` : `${code}`}
                                buttonStyle={buttonStyle}
                                onSelect={onSelect}
                                onPrefetch={onPrefetch}
                            />
                        );
                    })}
                </div>
            ))}
        </div>
    );
});

const SupplierReport = () => {
    const navigate = useNavigate();

    // State for all data
    const [summary, setSummary] = useState({ printed: [], unprinted: [] });
    const [isLoading, setIsLoading] = useState(true);

    // Track selected items to preserve selection during refresh
    const selectedStateRef = useRef({
        selectedSupplier: null,
        selectedBillNo: null,
        isUnprintedBill: false
    });

    // Sequence number for detail requests: any response that comes back after the user
    // has clicked something newer is silently discarded (prevents stale data overwrites).
    const detailsSeqRef = useRef(0);
    const detailsAbortRef = useRef(null);
    // Tracks the in-flight click load so F4 can await it instead of failing with "No data"
    const detailsLoadRef = useRef(null); // { key, seq, promise }

    // Counter of in-flight mutations (print/finalize/update). While > 0 the background
    // refresh is paused so it can never clobber data mid-operation.
    const mutationCountRef = useRef(0);
    const mutationSafetyTimerRef = useRef(null);
    
    const beginMutation = () => {
        mutationCountRef.current += 1;
        clearTimeout(mutationSafetyTimerRef.current);
        mutationSafetyTimerRef.current = setTimeout(() => {
            mutationCountRef.current = 0; // never leave the UI permanently locked
        }, MUTATION_SAFETY_MS);
    };
    const endMutation = () => {
        mutationCountRef.current = Math.max(0, mutationCountRef.current - 1);
        if (mutationCountRef.current === 0) clearTimeout(mutationSafetyTimerRef.current);
    };

    // Pause background polling briefly after user actions so clicks/F4 stay snappy all day
    const userBusyRef = useRef(false);
    const userBusyTimerRef = useRef(null);
    const markUserBusy = useCallback(() => {
        userBusyRef.current = true;
        pausePrefetch();
        clearTimeout(userBusyTimerRef.current);
        userBusyTimerRef.current = setTimeout(() => {
            userBusyRef.current = false;
            resumePrefetchSoon(0);
        }, USER_BUSY_MS);
    }, []);

    const printInFlightRef = useRef(false);
    const printLockSafetyTimerRef = useRef(null);
    const handlePrintRef = useRef(null);
    const printGenRef = useRef(0); // newer F4 supersedes an in-flight wait/print
    const pollTickRef = useRef(0);

    const clearPrintLock = useCallback(() => {
        printInFlightRef.current = false;
        clearTimeout(printLockSafetyTimerRef.current);
    }, []);

    const armPrintLock = useCallback(() => {
        printInFlightRef.current = true;
        clearTimeout(printLockSafetyTimerRef.current);
        printLockSafetyTimerRef.current = setTimeout(() => {
            printInFlightRef.current = false;
            resumePrefetchSoon(0);
        }, PRINT_LOCK_SAFETY_MS);
    }, []);

    // Clear middle details panel after a successful print (selection reset).
    const clearCenterPanel = useCallback(() => {
        selectedStateRef.current = {
            selectedSupplier: null,
            selectedBillNo: null,
            isUnprintedBill: false,
        };
        liveBillRef.current = {
            details: [],
            selectedSupplier: null,
            selectedBillNo: null,
            isUnprintedBill: false,
            advanceAmount: 0,
            payingAmount: '',
            billSize: liveBillRef.current.billSize || '3mm',
        };
        detailsLoadRef.current = null;
        flushSync(() => {
            setSelectedSupplier(null);
            setSelectedBillNo(null);
            setIsUnprintedBill(false);
            setSupplierDetails([]);
            setIsDetailsLoading(false);
            setPayingAmount('');
            setAdvanceAmount(0);
            setProfilePic(null);
            setAdvancePayload({ code: '', advance_amount: '' });
            setAdvanceStatus({ type: '', text: '' });
            setEditingRecord(null);
            setNewFarmerCode('');
            setNewCustomerCode('');
        });
    }, []);

    // Always-current bill snapshot for instant F4 (updated sync on click, not only after re-render)
    const liveBillRef = useRef({
        details: [],
        selectedSupplier: null,
        selectedBillNo: null,
        isUnprintedBill: false,
        advanceAmount: 0,
        payingAmount: '',
        billSize: '3mm',
    });

    // 🚀 NEW STATE: Bill size selector (3mm or 4mm)
    const [billSize, setBillSize] = useState('3mm');

    const [printedSearchTerm, setPrintedSearchTerm] = useState('');
    const [unprintedSearchTerm, setUnprintedSearchTerm] = useState('');

    // 🚀 NEW STATE: For loan/paying amount
    const [payingAmount, setPayingAmount] = useState('');
    const [loanStatus, setLoanStatus] = useState(''); // For feedback

    const [profilePic, setProfilePic] = useState(null);
    // Add these with your other state variables
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [supplierDocs, setSupplierDocs] = useState({ title: '', profile: null, nic_front: null, nic_back: null });

    // State for Details Panel
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [selectedBillNo, setSelectedBillNo] = useState(null);
    const [isUnprintedBill, setIsUnprintedBill] = useState(false);
    const [supplierDetails, setSupplierDetails] = useState([]);
    const [isDetailsLoading, setIsDetailsLoading] = useState(false);

    // 🚀 NEW STATE: To hold the advance amount from the suppliers table
    const [advanceAmount, setAdvanceAmount] = useState(0);

    // 🚀 NEW STATE: For the Advance Entry Form Logic
    const [advancePayload, setAdvancePayload] = useState({ code: '', advance_amount: '' });
    const [advanceLoading, setAdvanceLoading] = useState(false);
    const [advanceStatus, setAdvanceStatus] = useState({ type: '', text: '' });

    // 🚀 NEW STATE: For Editing Records
    const [editingRecord, setEditingRecord] = useState(null);
    const [newFarmerCode, setNewFarmerCode] = useState('');
    const [newCustomerCode, setNewCustomerCode] = useState('');

    // --- Silent refresh callback (doesn't show loading, skips render if nothing changed) ---
    const silentFetchSummary = useCallback(async () => {
        try {
            const response = await getWithTimeout('/suppliers/bill-status-summary');
            if (response.data) {
                const next = {
                    printed: response.data.printed || [],
                    unprinted: response.data.unprinted || [],
                };
                setSummary(prev =>
                    (sameSummaryList(prev.printed, next.printed) && sameSummaryList(prev.unprinted, next.unprinted))
                        ? prev
                        : next
                );
            }
        } catch (error) {
            // Silent: a failed background refresh must never disturb the page.
        }
    }, []);

    // --- Function to fetch the summary data with loading indicator (only first time) ---
    const fetchSummary = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/suppliers/bill-status-summary');

            if (response.data) {
                setSummary({
                    printed: response.data.printed || [],
                    unprinted: response.data.unprinted || [],
                });
            } else {
                setSummary({ printed: [], unprinted: [] });
            }

        } catch (error) {
            console.error('❌ Error fetching summary data:', error.message, error.response?.data);
            setSummary({ printed: [], unprinted: [] });
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Prefetch bill + supplier into cache (hover / idle) — never blocks the UI
    const runPrefetchJob = useCallback(async (isUnprinted, supplierCode, billNo) => {
        const key = detailsCacheKey(isUnprinted, supplierCode, billNo);
        if (detailsCache.has(key) && supplierCache.has(supplierCode)) return;
        if (prefetchInFlight.has(key)) return prefetchInFlight.get(key);

        const abortCtrl = new AbortController();
        prefetchAbortControllers.add(abortCtrl);

        const job = (async () => {
            try {
                if (prefetchPaused) return;
                const detailsUrl = isUnprinted
                    ? `/suppliers/${supplierCode}/unprinted-details`
                    : `/suppliers/bill/${billNo}/details`;
                const [detailsRes, supRes] = await Promise.allSettled([
                    detailsCache.has(key) ? Promise.resolve(null) : getWithTimeout(detailsUrl, abortCtrl.signal, PREFETCH_TIMEOUT_MS),
                    supplierCache.has(supplierCode) ? Promise.resolve(null) : getWithTimeout(`/suppliers/search-by-code/${supplierCode}`, abortCtrl.signal, PREFETCH_TIMEOUT_MS),
                ]);
                if (abortCtrl.signal.aborted || prefetchPaused) return;
                if (detailsRes.status === 'fulfilled' && detailsRes.value?.data) {
                    cachePutDetails(key, detailsRes.value.data || []);
                }
                if (supRes.status === 'fulfilled' && supRes.value?.data) {
                    cachePut(supplierCache, supplierCode, supRes.value.data);
                }
            } catch {
                // prefetch failures are ignored
            } finally {
                prefetchAbortControllers.delete(abortCtrl);
                prefetchInFlight.delete(key);
            }
        })();

        prefetchInFlight.set(key, job);
        return job;
    }, []);

    const drainPrefetchQueue = useCallback(() => {
        if (prefetchPaused || userBusyRef.current || printInFlightRef.current) return;
        while (prefetchActive < PREFETCH_MAX_CONCURRENT && prefetchQueue.length > 0) {
            const next = prefetchQueue.shift();
            prefetchActive += 1;
            runPrefetchJob(next.isUnprinted, next.supplierCode, next.billNo)
                .finally(() => {
                    prefetchActive -= 1;
                    drainPrefetchQueue();
                });
        }
    }, [runPrefetchJob]);

    const enqueuePrefetch = useCallback((isUnprinted, supplierCode, billNo) => {
        if (prefetchPaused || userBusyRef.current || printInFlightRef.current) return;
        if (!supplierCode) return;
        if (!isUnprinted && !billNo) return;
        const key = detailsCacheKey(isUnprinted, supplierCode, billNo);
        if (detailsCache.has(key) && supplierCache.has(supplierCode)) return;
        if (prefetchInFlight.has(key)) return;
        if (prefetchQueue.some(j => detailsCacheKey(j.isUnprinted, j.supplierCode, j.billNo) === key)) return;
        prefetchQueue.push({ isUnprinted, supplierCode, billNo });
        drainPrefetchQueue();
    }, [drainPrefetchQueue]);

    const prefetchPrinted = useCallback((supplierCode, billNo) => {
        enqueuePrefetch(false, supplierCode, billNo);
    }, [enqueuePrefetch]);

    const prefetchUnprinted = useCallback((supplierCode) => {
        enqueuePrefetch(true, supplierCode, null);
    }, [enqueuePrefetch]);

    // Warm both sidebars aggressively so clicks paint from cache (instant middle panel)
    const warmSidebarCache = useCallback((printed, unprinted) => {
        if (userBusyRef.current || printInFlightRef.current || mutationCountRef.current > 0 || prefetchPaused) return;
        // Unprinted list is usually smaller — warm all of it
        for (const item of (unprinted || [])) {
            enqueuePrefetch(true, item.supplier_code, null);
        }
        const printedBatch = (printed || []).slice(0, PREFETCH_BATCH);
        for (const item of printedBatch) {
            if (item.supplier_bill_no) enqueuePrefetch(false, item.supplier_code, item.supplier_bill_no);
        }
    }, [enqueuePrefetch]);

    // --- Function to refresh the current details view without changing selection ---
    const refreshCurrentDetails = useCallback(async () => {
        const current = selectedStateRef.current;

        if (!current.selectedSupplier) return;
        if (mutationCountRef.current > 0) return;
        if (userBusyRef.current) return;
        if (printInFlightRef.current) return;

        const seq = detailsSeqRef.current;
        const key = detailsCacheKey(current.isUnprintedBill, current.selectedSupplier, current.selectedBillNo);

        const detailsUrl = current.isUnprintedBill
            ? `/suppliers/${current.selectedSupplier}/unprinted-details`
            : (current.selectedBillNo ? `/suppliers/bill/${current.selectedBillNo}/details` : null);

        const [detailsRes, supRes] = await Promise.allSettled([
            detailsUrl ? getWithTimeout(detailsUrl) : Promise.resolve(null),
            getWithTimeout(`/suppliers/search-by-code/${current.selectedSupplier}`)
        ]);

        if (seq !== detailsSeqRef.current || mutationCountRef.current > 0 || userBusyRef.current) return;

        if (detailsRes.status === 'fulfilled' && detailsRes.value?.data) {
            const data = detailsRes.value.data;
            cachePutDetails(key, data || []);
            setSupplierDetails(prev => sameDetailsList(prev, data) ? prev : data);
        }

        if (supRes.status === 'fulfilled' && supRes.value?.data) {
            const d = supRes.value.data;
            cachePut(supplierCache, current.selectedSupplier, d);
            const adv = parseFloat(d.advance_amount) || 0;
            const pic = d.profile_pic ?? null;

            setAdvanceAmount(prev => prev === adv ? prev : adv);
            setProfilePic(prev => prev === pic ? prev : pic);

            const docs = {
                title: d.name || current.selectedSupplier,
                profile: d.profile_pic,
                nic_front: d.nic_front,
                nic_back: d.nic_back
            };
            setSupplierDocs(prev => sameDocs(prev, docs) ? prev : docs);
        }
    }, []);

    // --- Background refresh loop ---
    // Self-scheduling setTimeout: next tick only after previous finishes. Skips work while
    // the user is clicking/printing so the UI stays responsive all day without a refresh.
    useEffect(() => {
        let cancelled = false;
        let timerId = null;

        const tick = async () => {
            if (cancelled) return;
            pollTickRef.current += 1;
            if (!document.hidden && mutationCountRef.current === 0 && !userBusyRef.current && !printInFlightRef.current) {
                try {
                    const jobs = [silentFetchSummary()];
                    // Details less often than sidebar lists — keeps middle panel smooth
                    if (pollTickRef.current % DETAILS_REFRESH_EVERY === 0) {
                        jobs.push(refreshCurrentDetails());
                    }
                    await Promise.allSettled(jobs);
                } catch {
                    // never let an unexpected error kill the loop
                }
            }
            if (!cancelled) timerId = setTimeout(tick, REFRESH_DELAY_MS);
        };

        timerId = setTimeout(tick, REFRESH_DELAY_MS);

        const onVisibilityChange = () => {
            if (!document.hidden && !cancelled && !userBusyRef.current) {
                silentFetchSummary();
                refreshCurrentDetails();
            }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);
        // Warm print iframe once so first F4 does not pay creation cost
        try { ensurePrintIframe(); } catch { /* ignore */ }

        // Extra sidebar pull on focus — keeps printed/unprinted lists fresh all day
        const onWindowFocus = () => {
            if (!cancelled && !userBusyRef.current && mutationCountRef.current === 0) {
                silentFetchSummary();
            }
        };
        window.addEventListener('focus', onWindowFocus);

        return () => {
            cancelled = true;
            if (timerId) clearTimeout(timerId);
            document.removeEventListener('visibilitychange', onVisibilityChange);
            window.removeEventListener('focus', onWindowFocus);
            clearTimeout(userBusyTimerRef.current);
            clearTimeout(mutationSafetyTimerRef.current);
            clearTimeout(printLockSafetyTimerRef.current);
            if (detailsAbortRef.current) detailsAbortRef.current.abort();
        };
    }, [silentFetchSummary, refreshCurrentDetails]);

    // --- Initial Fetch ---
    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    // After summary lists update, warm cache for the bills operators click next
    useEffect(() => {
        if (isLoading) return;
        warmSidebarCache(summary.printed, summary.unprinted);
    }, [summary.printed, summary.unprinted, isLoading, warmSidebarCache]);

    // Update selected state ref when selection changes
    useEffect(() => {
        selectedStateRef.current = {
            selectedSupplier,
            selectedBillNo,
            isUnprintedBill
        };
    }, [selectedSupplier, selectedBillNo, isUnprintedBill]);

    // 🚀 NEW: Handle Advance Entry Form Submission
    const handleAdvanceSubmit = async (e) => {
        e.preventDefault();
        setAdvanceLoading(true);
        setAdvanceStatus({ type: '', text: '' });
        beginMutation();

        try {
            const response = await mutateWithTimeout('post', '/suppliers/advance', advancePayload);
            setAdvanceStatus({ type: 'success', text: `සාර්ථකයි! අත්තිකාරම් යාවත්කාලීන විය.` });

            // Immediately update the display advance amount
            setAdvanceAmount(parseFloat(response.data.data.advance_amount) || 0);
            setAdvancePayload(prev => ({ ...prev, advance_amount: '' }));
        } catch (error) {
            console.error("Advance Update Error:", error);
            setAdvanceStatus({ type: 'error', text: 'යාවත්කාලීන කිරීම අසාර්ථක විය.' });
        } finally {
            setAdvanceLoading(false);
            endMutation();
        }
    };

    // --- Filtering Logic ---
    const filteredPrintedItems = useMemo(() => {
        const lowerCaseSearch = printedSearchTerm.toLowerCase();
        return summary.printed.filter(item =>
            item.supplier_code.toLowerCase().includes(lowerCaseSearch) ||
            (item.supplier_bill_no && item.supplier_bill_no.toLowerCase().includes(lowerCaseSearch))
        );
    }, [printedSearchTerm, summary.printed]);

    const filteredUnprintedItems = useMemo(() => {
        const lowerCaseSearch = unprintedSearchTerm.toLowerCase();
        return summary.unprinted.filter(item =>
            item.supplier_code.toLowerCase().includes(lowerCaseSearch)
        );
    }, [unprintedSearchTerm, summary.unprinted]);

    // Shared: paint from cache instantly, fetch immediately (last click wins via seq + abort)
    const loadBillIntoPanel = useCallback((supplierCode, billNo, isUnprinted) => {
        const seq = ++detailsSeqRef.current;
        markUserBusy();

        const key = detailsCacheKey(isUnprinted, supplierCode, billNo);
        // Capture in-flight prefetch BEFORE pausing the queue (never abort that warm job)
        const inflightPrefetch = prefetchInFlight.get(key);
        pausePrefetch(); // stop queueing more warm work; keep in-flight prefetches alive

        selectedStateRef.current = {
            selectedSupplier: supplierCode,
            selectedBillNo: billNo,
            isUnprintedBill: isUnprinted,
        };

        if (detailsAbortRef.current) detailsAbortRef.current.abort();
        const controller = new AbortController();
        detailsAbortRef.current = controller;

        const cachedDetails = detailsCache.get(key);
        const cachedSupplier = supplierCache.get(supplierCode);
        const hasCache = Array.isArray(cachedDetails) && cachedDetails.length > 0;

        // Unblock any F4 waiting on a superseded click
        const prevLoad = detailsLoadRef.current;
        if (prevLoad?.settle) prevLoad.settle(prevLoad.rows || []);

        let settled = false;
        let settleLoad;
        const loadPromise = new Promise((resolve) => { settleLoad = resolve; });
        const resolveLoad = (rows) => {
            if (settled) return;
            settled = true;
            const entry = detailsLoadRef.current;
            if (entry && entry.seq === seq) entry.rows = rows || [];
            settleLoad(rows || []);
        };
        detailsLoadRef.current = { key, seq, promise: loadPromise, settle: resolveLoad, rows: hasCache ? cachedDetails : null };

        // Sync selection + live snapshot FIRST so middle panel / F4 are ready this frame
        const nextAdvance = cachedSupplier ? (parseFloat(cachedSupplier.advance_amount) || 0) : 0;
        liveBillRef.current = {
            details: hasCache ? cachedDetails : [],
            selectedSupplier: supplierCode,
            selectedBillNo: billNo,
            isUnprintedBill: isUnprinted,
            advanceAmount: hasCache || cachedSupplier ? nextAdvance : liveBillRef.current.advanceAmount,
            payingAmount: '',
            billSize: liveBillRef.current.billSize,
        };

        // Paint middle panel synchronously this click — never show a loading spinner
        flushSync(() => {
            setSelectedSupplier(supplierCode);
            setSelectedBillNo(billNo);
            setIsUnprintedBill(isUnprinted);
            setPayingAmount('');
            setAdvancePayload({ code: supplierCode, advance_amount: '' });
            setIsDetailsLoading(false);

            if (hasCache) {
                setSupplierDetails(cachedDetails);
            } else {
                // Clear stale rows for the previous bill; fresh rows paint the instant fetch lands
                setSupplierDetails([]);
            }

            if (cachedSupplier) {
                applySupplierToState(cachedSupplier, supplierCode, {
                    setAdvanceAmount, setProfilePic, setSupplierDocs,
                });
            } else if (!hasCache) {
                setAdvanceAmount(0);
                setProfilePic(null);
            }
        });

        if (hasCache) resolveLoad(cachedDetails);

        const detailsUrl = isUnprinted
            ? `/suppliers/${supplierCode}/unprinted-details`
            : `/suppliers/bill/${billNo}/details`;

        const applyDetails = (data) => {
            if (seq !== detailsSeqRef.current) return false;
            const rows = data || [];
            cachePutDetails(key, rows);
            liveBillRef.current = {
                ...liveBillRef.current,
                details: rows,
                selectedSupplier: supplierCode,
                selectedBillNo: billNo,
                isUnprintedBill: isUnprinted,
            };
            // Instant paint when network/prefetch lands
            flushSync(() => {
                setSupplierDetails(prev => sameDetailsList(prev, rows) ? prev : rows);
                setIsDetailsLoading(false);
            });
            resolveLoad(rows);
            return true;
        };

        // If a prefetch is already fetching this bill, paint as soon as it lands
        if (inflightPrefetch && !hasCache) {
            inflightPrefetch.then(() => {
                if (seq !== detailsSeqRef.current) return;
                const data = detailsCache.get(key);
                if (data?.length) applyDetails(data);
            }).catch(() => {});
        }

        // Always fetch immediately — rapid clicks abort older requests via controller + seq
        getWithTimeout(detailsUrl, controller.signal, CLICK_TIMEOUT_MS)
            .then((res) => applyDetails(res.data))
            .catch((err) => {
                if (controller.signal.aborted || seq !== detailsSeqRef.current) return;
                console.error(`❌ Error fetching ${isUnprinted ? 'unprinted' : 'printed'} details:`, err?.message);
                if (!hasCache) {
                    setIsDetailsLoading(false);
                    resolveLoad([]);
                }
            });

        getWithTimeout(`/suppliers/search-by-code/${supplierCode}`, controller.signal, CLICK_TIMEOUT_MS)
            .then((res) => {
                if (seq !== detailsSeqRef.current || !res.data) return;
                cachePut(supplierCache, supplierCode, res.data);
                liveBillRef.current = {
                    ...liveBillRef.current,
                    advanceAmount: parseFloat(res.data.advance_amount) || 0,
                };
                applySupplierToState(res.data, supplierCode, {
                    setAdvanceAmount, setProfilePic, setSupplierDocs,
                });
            })
            .catch(() => { /* profile is secondary — ignore */ });

        return loadPromise;
    }, [markUserBusy]);

    const handlePrintedBillClick = useCallback((supplierCode, billNo) => {
        return loadBillIntoPanel(supplierCode, billNo, false);
    }, [loadBillIntoPanel]);

    const handleUnprintedBillClick = useCallback((supplierCode, billNo) => {
        return loadBillIntoPanel(supplierCode, billNo, true);
    }, [loadBillIntoPanel]);

    const handlePrefetchPrinted = useCallback((supplierCode, billNo) => {
        prefetchPrinted(supplierCode, billNo);
    }, [prefetchPrinted]);

    const handlePrefetchUnprinted = useCallback((supplierCode) => {
        prefetchUnprinted(supplierCode);
    }, [prefetchUnprinted]);
    // --- Update supplier/customer on a line — paint table instantly, sync API in background ---
    const handleUpdateFarmer = async () => {
        if (!editingRecord?.id) return;

        const recordId = editingRecord.id;
        const previousDetails = Array.isArray(supplierDetails) ? supplierDetails.slice() : [];
        const previousLive = { ...liveBillRef.current };
        const previousBillNo = selectedBillNo;
        const previousSelectedState = { ...selectedStateRef.current };

        const finalSupplierCode = String(newFarmerCode || editingRecord.supplier_code || '').trim().toUpperCase();
        const finalCustomerCode = String(newCustomerCode || editingRecord.customer_code || '').trim().toUpperCase();
        const currentSupplier = String(selectedSupplier || '').trim().toUpperCase();
        const supplierMovedAway = !!finalSupplierCode && !!currentSupplier && finalSupplierCode !== currentSupplier;

        const syncDetailsCaches = (rows, billNo = selectedBillNo) => {
            liveBillRef.current = {
                ...liveBillRef.current,
                details: rows,
                selectedSupplier: selectedStateRef.current.selectedSupplier,
                selectedBillNo: billNo,
                isUnprintedBill: selectedStateRef.current.isUnprintedBill,
            };
            const key = detailsCacheKey(
                selectedStateRef.current.isUnprintedBill,
                selectedStateRef.current.selectedSupplier,
                billNo
            );
            if (rows.length > 0) cachePutDetails(key, rows);
            else detailsCache.delete(key);

            // Force F4 to rebuild HTML from the updated rows (never print stale codes)
            const supplierKey = selectedStateRef.current.selectedSupplier;
            for (const cacheKey of [...billContentCache.keys()]) {
                if (supplierKey && cacheKey.startsWith(`${supplierKey}-`)) billContentCache.delete(cacheKey);
                if (billNo && String(cacheKey).includes(String(billNo))) billContentCache.delete(cacheKey);
            }
        };

        // 1) Instant UI: close modal + update/remove the row in the details table now
        let nextRows = previousDetails;
        flushSync(() => {
            setSupplierDetails((prev) => {
                if (supplierMovedAway) {
                    nextRows = prev.filter((r) => String(r.id) !== String(recordId));
                } else {
                    nextRows = prev.map((r) =>
                        String(r.id) === String(recordId)
                            ? {
                                ...r,
                                supplier_code: finalSupplierCode || r.supplier_code,
                                customer_code: finalCustomerCode || r.customer_code,
                            }
                            : r
                    );
                }
                return nextRows;
            });
            setEditingRecord(null);
            setNewFarmerCode('');
            setNewCustomerCode('');
            setIsDetailsLoading(false);
        });
        syncDetailsCaches(nextRows);

        // 2) Persist to DB — do not block the table on a full bill reload
        beginMutation();
        markUserBusy();
        try {
            const response = await mutateWithTimeout('put', `/sales/${recordId}/update-supplier`, {
                supplier_code: finalSupplierCode,
                customer_code: finalCustomerCode,
            });

            if (response.status === 200 || response.status === 201) {
                let nextBillNo = selectedBillNo;
                if (response.data?.bill_updated && response.data?.new_bill_no) {
                    nextBillNo = String(response.data.new_bill_no);
                    setSelectedBillNo(nextBillNo);
                    selectedStateRef.current = {
                        ...selectedStateRef.current,
                        selectedBillNo: nextBillNo,
                    };
                }

                const updatedSale = response.data?.sale || response.data?.data || null;
                if (updatedSale && !supplierMovedAway) {
                    flushSync(() => {
                        setSupplierDetails((prev) => {
                            nextRows = prev.map((r) =>
                                String(r.id) === String(recordId) ? { ...r, ...updatedSale } : r
                            );
                            return nextRows;
                        });
                    });
                    syncDetailsCaches(nextRows, nextBillNo);
                } else {
                    syncDetailsCaches(nextRows, nextBillNo);
                }

                // Sidebars stay fresh without wiping the middle panel
                silentFetchSummary();
            } else {
                throw new Error('Update failed');
            }
        } catch (error) {
            console.error('Update failed:', error);
            // Rollback table to pre-edit snapshot
            flushSync(() => {
                setSupplierDetails(previousDetails);
                setSelectedBillNo(previousBillNo);
            });
            selectedStateRef.current = previousSelectedState;
            liveBillRef.current = previousLive;
            const key = detailsCacheKey(
                previousSelectedState.isUnprintedBill,
                previousSelectedState.selectedSupplier,
                previousSelectedState.selectedBillNo
            );
            if (previousDetails.length > 0) cachePutDetails(key, previousDetails);
            alert('Failed to update records. Please try again.');
        } finally {
            endMutation();
        }
    };

    // --- CALCULATIONS ---
    const {
        totalWeight,
        itemSummaryData,
        totalPacksSum,
        totalsupplierSales,
        totalCusGross,
    } = useMemo(() => {
        let totalWeight = 0, totalsupplierSales = 0, totalCommission = 0, totalPacksSum = 0, totalCusGross = 0;
        const itemSummary = {};

        supplierDetails.forEach(record => {
            const weight = parseFloat(record.weight) || 0;
            const commission = parseFloat(record.commission_amount) || 0;
            const packs = parseInt(record.packs) || 0;
            const SupplierTotal = parseFloat(record.SupplierTotal) || 0;
            const itemName = record.item_name || 'Unknown Item';
            const rowCusGross = (parseFloat(record?.total) || 0) - (parseFloat(record?.CustomerPackLabour) || 0);

            totalWeight += weight;
            totalsupplierSales += SupplierTotal;
            totalCommission += commission;
            totalPacksSum += packs;
            totalCusGross += rowCusGross;

            if (!itemSummary[itemName]) {
                itemSummary[itemName] = { totalWeight: 0, totalPacks: 0 };
            }
            itemSummary[itemName].totalWeight += weight;
            itemSummary[itemName].totalPacks += packs;
        });

        return {
            totalWeight, totalCommission, amountPayable: totalsupplierSales, itemSummaryData: itemSummary,
            totalPacksSum, totalsupplierSales, totalCusGross,
        };
    }, [supplierDetails]);

    // Sync secondary fields into the live snapshot only when selection already matches.
    // Never overwrite a newer click that React state has not caught up to yet (prevents wrong F4).
    useEffect(() => {
        const live = liveBillRef.current;
        if (
            live.selectedSupplier !== selectedSupplier ||
            String(live.selectedBillNo ?? '') !== String(selectedBillNo ?? '') ||
            live.isUnprintedBill !== isUnprintedBill
        ) {
            return;
        }
        live.details = supplierDetails;
        live.advanceAmount = advanceAmount;
        live.payingAmount = payingAmount;
        live.billSize = billSize;
    }, [supplierDetails, selectedSupplier, selectedBillNo, isUnprintedBill, advanceAmount, payingAmount, billSize]);

    // 🚀 NEW: Handle loan amount submission and trigger print
    const handleLoanSubmit = async (e) => {
        if (e.key === 'Enter') {
            if (!selectedSupplier || !payingAmount || parseFloat(payingAmount) <= 0) {
                setLoanStatus('⚠️ Invalid amount');
                setTimeout(() => setLoanStatus(''), 2000);
                return;
            }

            setLoanStatus('Processing...');
            beginMutation();

            try {
                const totalAmount = totalsupplierSales - parseFloat(payingAmount);

                await mutateWithTimeout('post', '/supplier-loan', {
                    code: selectedSupplier,
                    loan_amount: parseFloat(payingAmount),
                    total_amount: totalAmount,
                    bill_no: selectedBillNo || null
                });

                setLoanStatus('✅ Loan saved');
                setPayingAmount('');
                liveBillRef.current = { ...liveBillRef.current, payingAmount: '' };

                // Print immediately after loan save
                if (handlePrintRef.current) handlePrintRef.current();

            } catch (error) {
                console.error("Loan Update Error:", error);

                if (error.response && error.response.status === 422) {
                    setLoanStatus('⚠️ Invalid supplier code');
                } else {
                    setLoanStatus('❌ Error');
                }

                setTimeout(() => setLoanStatus(''), 2000);
            } finally {
                endMutation();
            }
        }
    };
// Add this with your other refs at the top of the component (around line 90-100)
const billVersionRef = useRef(0);

// --- Bill HTML built from live snapshot (module-scope cache — see billContentCache) ---
const getBillContent = useCallback((currentBillNo) => {
    // Always read the live snapshot so click→F4 never prints the previous bill
    const snap = liveBillRef.current;
    const details = snap.details || [];
    const printSupplier = snap.selectedSupplier;
    const printPaying = snap.payingAmount;

    // Include version in cache key to bust cache on updates
    const cacheKey = `${printSupplier}-${currentBillNo}-${snap.isUnprintedBill}-${snap.billSize}-${snap.advanceAmount}-${printPaying}-${details.length}-${billVersionRef.current}`;

    if (billContentCache.has(cacheKey)) {
        return billContentCache.get(cacheKey);
    }

    // Generate content (your existing logic)
    const cachedSupplier = printSupplier ? supplierCache.get(printSupplier) : null;
    const printAdvance = cachedSupplier
        ? (parseFloat(cachedSupplier.advance_amount) || 0)
        : (parseFloat(snap.advanceAmount) || 0);

    let printTotalPacks = 0;
    let printSupplierSales = 0;
    const printItemSummary = {};
    for (const record of details) {
        const weight = parseFloat(record.weight) || 0;
        const packs = parseInt(record.packs) || 0;
        const SupplierTotal = parseFloat(record.SupplierTotal) || 0;
        const itemName = record.item_name || 'Unknown Item';
        printTotalPacks += packs;
        printSupplierSales += SupplierTotal;
        if (!printItemSummary[itemName]) printItemSummary[itemName] = { totalWeight: 0, totalPacks: 0 };
        printItemSummary[itemName].totalWeight += weight;
        printItemSummary[itemName].totalPacks += packs;
    }

    const date = new Date().toLocaleDateString('si-LK');
    const mobile = '0777672838/0714371115';

    const fontSizeBody = '14px';
    const fontSizeHeader = '13px';
    const fontSizeTotal = '18px';

    const paidAmountValue = parseFloat(printPaying) || 0;
    const remainingAfterPayment = printSupplierSales - paidAmountValue;

    const colGroups = `
<colgroup>
    <col style="width:32%;">
    <col style="width:18%;">
    <col style="width:20%;">
    <col style="width:30%;">
</colgroup>`;

    const formatNumber = (value, maxDecimals = 3) => {
        if (typeof value !== 'number' && typeof value !== 'string') return '0';
        const number = parseFloat(value);
        if (isNaN(number)) return '0';
        if (Number.isInteger(number)) return number.toLocaleString('en-US');
        const parts = number.toFixed(maxDecimals).replace(/\.?0+$/, '').split('.');
        const wholePart = parseInt(parts[0]).toLocaleString('en-US');
        return parts[1] ? `${wholePart}.${parts[1]}` : wholePart;
    };

    const getItemNameFontSize = (name) => {
        const length = name.length;
        if (length <= 8) return '18px';
        if (length <= 12) return '16px';
        if (length <= 16) return '14px';
        return '12px';
    };

    const detailedItemsHtml = details.map(record => {
        const weight = parseFloat(record.weight) || 0;
        const packs = parseInt(record.packs) || 0;
        const price = parseFloat(record.SupplierPricePerKg) || 0;
        const total = parseFloat(record.SupplierTotal) || 0;
        const itemName = record.item_name || '';
        const customerCode = record.customer_code?.toUpperCase() || '';

        const nameFontSize = getItemNameFontSize(itemName);

        return `
    <tr style="font-size:${fontSizeBody}; font-weight:bold; vertical-align: middle; line-height:1.3;">
        <td style="text-align:left; padding:3px 3px; word-wrap: break-word; word-break: break-word; max-width: 100%;">
           <div style="font-size:${nameFontSize}; font-weight:bold; line-height:1.2; white-space: nowrap; margin-top: -5px;">
  ${itemName}
</div>
            <div style="font-size:11px; font-weight:normal; margin-top:1px;">${formatNumber(packs)}</div>
        </td>
        <td style="text-align:right; padding:3px 3px; white-space: nowrap; font-size:${fontSizeBody};">${formatNumber(weight.toFixed(2))}</td>
        <td style="text-align:right; padding:3px 3px; white-space: nowrap; font-size:${fontSizeBody};">${formatNumber(price.toFixed(2))}</td>
        <td style="text-align:right; padding:3px 3px; white-space: nowrap;">
            <div style="font-size:14px; font-weight:bold; white-space:nowrap;">${customerCode}</div>
            <div style="font-weight:900; font-size:${fontSizeBody};">${formatNumber(total.toFixed(2))}</div>
        </td>
    </tr>`;
    }).join("");

    const summaryEntries = Object.entries(printItemSummary);
    let itemSummaryHtml = '';
    for (let i = 0; i < summaryEntries.length; i += 2) {
        const [name1, d1] = summaryEntries[i];
        const [name2, d2] = summaryEntries[i + 1] || [null, null];
        const text1 = `${name1}:${formatNumber(d1.totalWeight)}/${formatNumber(d1.totalPacks)}`;
        const text2 = d2 ? `${name2}:${formatNumber(d2.totalWeight)}/${formatNumber(d2.totalPacks)}` : '';
        itemSummaryHtml += `<tr><td style="padding:2px; width:50%; font-weight:bold; white-space:nowrap; font-size:11px;">${text1}</td><td style="padding:2px; width:50%; font-weight:bold; white-space:nowrap; font-size:11px;">${text2}</td></tr>`;
    }

    const netPayable = printSupplierSales - printAdvance - paidAmountValue;

    const content = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Print Bill</title>
    <style>
        /* Reset all margins and set exact 76mm width */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        @page {
            size: 76mm auto;
            margin: 0;
        }
        
        @media print {
            html, body {
                margin: 0;
                padding: 0;
                width: 76mm;
                background: white;
            }
            
            .receipt-content {
                width: 72mm;
                margin: 0 auto;
                padding: 3px 4px;
                font-family: -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                color: #000;
                background: #fff;
                font-size: 13px;
                box-sizing: border-box;
                overflow: hidden;
            }
            
            .receipt-content * {
                max-width: 100%;
                box-sizing: border-box;
            }
            
            .no-break {
                page-break-inside: avoid;
                page-break-after: avoid;
            }
            
            .total-section {
                page-break-inside: avoid;
                page-break-after: avoid;
            }
            
            .header-text {
                font-size: 18px;
                font-weight: 900;
                letter-spacing: 0.5px;
            }
            
            .supplier-code {
                border: 1.5px solid #000;
                padding: 2px 6px;
                font-size: 20px;
                font-weight: bold;
                display: flex;
                align-items: center;
                font-family: 'Iskoola Pota', 'Noto Sans Sinhala', 'Arial Unicode MS', sans-serif;
            }
            
            .bill-number {
                font-weight: bold;
                font-size: 13px;
            }
            
            .divider {
                border: none;
                border-top: 1.5px solid #000;
                margin: 3px 0;
            }
            
            .item-table {
                width: 100%;
                border-collapse: collapse;
                font-size: ${fontSizeBody};
                table-layout: fixed;
            }
            
            .item-table td, .item-table th {
                padding: 2px 2px;
                font-size: ${fontSizeBody};
            }
            
            .item-table th {
                font-size: ${fontSizeHeader};
                padding-bottom: 3px;
                font-weight: 900;
            }
            
            /* ===== CRITICAL FIX: Prevent header from repeating ===== */
            /* This completely prevents the browser from repeating thead */
            .item-table thead {
                display: table-header-group !important;
                /* Override browser default behavior */
            }
            
            /* Force the table to not split across pages with repeating headers */
            .item-table {
                page-break-inside: auto;
            }
            
            /* Explicitly tell browser NOT to repeat headers */
            .item-table thead {
                page-break-after: avoid;
                page-break-inside: avoid;
            }
            
            /* Make tbody work normally */
            tbody {
                display: table-row-group;
                page-break-inside: auto;
            }
            
            /* Additional prevention for header repetition */
            .item-table thead tr {
                page-break-after: avoid;
                page-break-inside: avoid;
            }
            /* ===== END CRITICAL FIX ===== */
            
            .summary-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 10px;
                text-align: center;
                font-weight: bold;
            }
            
            .net-payable {
                color: #000;
                font-size: 22px;
                font-weight: 900;
                border-bottom: 3px double #000;
                border-top: 2px solid #000;
                padding: 3px 6px;
                display: inline-block;
                white-space: nowrap;
                letter-spacing: 0.5px;
            }
            
            table {
                width: 100%;
                border-collapse: collapse;
            }
            
            .cut-marker {
                text-align: center;
                font-size: 8px;
                color: #999;
                margin-top: 3px;
                padding-top: 2px;
                border-top: 1px dotted #ccc;
                letter-spacing: 1px;
            }
            
            .item-table td:first-child {
                word-wrap: break-word;
                word-break: break-word;
                overflow-wrap: break-word;
            }
            
            .receipt-content {
                font-size: 12px;
            }
            
            .header-text {
                font-size: 17px;
            }
            
            .supplier-code {
                font-size: 18px;
                padding: 1px 5px;
            }
            
            /* ===== NEW: Prevent table header from printing on every page ===== */
            /* This is the most reliable method - treat the whole table as a block */
            .receipt-content .no-break table {
                page-break-inside: auto;
            }
            
            /* Force all table rows to stay together within the table */
            .receipt-content .no-break table tbody tr {
                page-break-inside: avoid;
                page-break-after: auto;
            }
            
            /* Ensure the table doesn't cause header repetition */
            table {
                page-break-inside: auto;
                border-collapse: collapse;
            }
            
            thead {
                display: table-header-group;
            }
            
            /* This is the KEY fix - prevents thead from repeating */
            thead {
                page-break-after: avoid;
            }
            
            /* Alternative approach if above doesn't work */
            .item-table thead {
                display: table-row-group !important;
            }
            /* ===== END NEW FIXES ===== */
        }
    </style>
</head>
<body>
    <div class="receipt-content">
        <div class="no-break">
            <div style="text-align:center; font-weight:bold;">
                <div class="header-text">මංජු සහ සහෝදරයෝ</div>
                <div style="display:flex; justify-content:space-between; align-items:stretch; gap:2px; margin:4px 0;">
                    <span class="supplier-code" style="padding:2px 6px; font-size:20px;">N66</span>
                    <div style="display: flex; align-items: center; gap: 6px; padding: 2px 4px; flex: 1;">
                        <span style="font-weight:bold; font-size:14px; text-align: center; flex: 1;">ගොවියා:</span>
                        <span class="supplier-code" style="font-weight:900; font-size:20px; padding:2px 4px; margin-left: -15px;">${printSupplier}</span>
                    </div>
                </div>
                <div style="font-size:11px; white-space: nowrap;">එළවළු තොග වෙළෙන්දෝ බණ්ඩාරවෙල</div>
            </div>
            
            <div style="font-size:13px; margin-top:3px; padding:0 2px;">
                <div style="font-weight: bold;">දුර:${mobile}</div>
                <div style="display:flex; justify-content:space-between; margin-top:2px;">
                    <span class="bill-number">බිල් අං:${currentBillNo}</span>
                    <span class="bill-number">දිනය:${date}</span>
                </div>
            </div>
            
            <hr class="divider">
            
            <!-- WRAP THE TABLE IN A CONTAINER TO PREVENT HEADER REPETITION -->
            <div style="page-break-inside: auto; page-break-after: avoid;">
                <table class="item-table">
                    ${colGroups}
                    <thead style="display: table-header-group; page-break-after: avoid; page-break-inside: avoid;">
                        <tr style="border-bottom:1.5px solid #000; font-weight:bold; page-break-after: avoid; page-break-inside: avoid;">
                            <th style="text-align:left; font-size:${fontSizeHeader};">වර්ගය<br>මලු</th>
                            <th style="text-align:right; font-size:${fontSizeHeader};">කිලෝ</th>
                            <th style="text-align:right; font-size:${fontSizeHeader};">මිල</th>
                            <th style="text-align:right; font-size:${fontSizeHeader};">කේතය<br>අගය</th>
                        </tr>
                    </thead>
                    <tbody style="page-break-inside: auto;">${detailedItemsHtml}</tbody>
                    <tfoot>
                        <tr style="border-top:1.5px solid #000; font-weight:bold;">
                            <td style="padding-top:3px; font-size:${fontSizeTotal};">${formatNumber(printTotalPacks)}</td>
                            <td colspan="3" style="padding-top:3px; font-size:${fontSizeTotal}; text-align:right;">
                                <span style="white-space:nowrap;">${(printSupplierSales.toFixed(2))}</span>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>

        <div class="total-section">
            <table style="width:100%; margin-top:6px; font-weight:bold; font-size:15px; padding:0 2px;">
                <tr>
                    <td style="font-size:11px; white-space:nowrap;">මෙම බිලට මුළු අගය:</td>
                    <td style="text-align:right;">
                        <span style="border-bottom:2px solid #000; font-size:${fontSizeTotal}; padding:2px 4px;">${(printSupplierSales.toFixed(2))}</span>
                    </td>
                </tr>
                
                ${paidAmountValue > 0 ? `
                <tr style="font-size:13px;">
                    <td style="font-size:11px; padding-top:3px;">ගෙවූ මුදල:</td>
                    <td style="text-align:right; padding-top:3px; color:#000;">- ${paidAmountValue.toFixed(2)}</td>
                </tr>
                <tr style="font-size:13px;">
                    <td style="font-size:11px; padding-top:2px;">ඉතිරි මුදල:</td>
                    <td style="text-align:right; padding-top:2px; color:#000;">${remainingAfterPayment.toFixed(2)}</td>
                </tr>
                <tr><td colspan="2" style="border-top:1px dashed #000; padding: 2px 0;"></td></tr>
                ` : ''}

                <tr style="font-size:13px;">
                    <td style="font-size:11px; padding-top:2px;">අත්තිකාරම්</td>
                    <td style="text-align:right; padding-top:2px; color:#000;">- ${printAdvance.toFixed(2)}</td>
                </tr>

                <tr style="font-weight:900;">
                    <td style="font-size:13px; padding-top:3px;">ශුද්ධ ඉතිරි ශේෂය:</td>
                    <td style="text-align:right; padding-top:3px;">
                        <span class="net-payable">${netPayable.toFixed(2)}</span>
                    </td>
                </tr>
            </table>

            <div style="margin-top:8px; border-top:1px dashed #000; padding-top:3px;">
                <table class="summary-table">${itemSummaryHtml}</table>
            </div>
            
            <div class="cut-marker">- - - - - - - - - - - - - - - - - - - - - -</div>
        </div>
    </div>
</body>
</html>`;

    // Cache the content
    billContentCache.set(cacheKey, content);
    while (billContentCache.size > BILL_HTML_CACHE_MAX) {
        billContentCache.delete(billContentCache.keys().next().value);
    }

    return content;
}, []);

// --- Print: F4 always gets rows — never depend only on the click request (can be aborted) ---
const ensureRowsForPrint = async (snap) => {
    if (!snap.selectedSupplier) return [];

    const key = detailsCacheKey(snap.isUnprintedBill, snap.selectedSupplier, snap.selectedBillNo);

    const readRows = () => {
        if (Array.isArray(snap.details) && snap.details.length > 0) return snap.details;
        const cached = detailsCache.get(key);
        if (cached?.length) return cached;
        const live = liveBillRef.current || {};
        if (
            live.selectedSupplier === snap.selectedSupplier
            && String(live.selectedBillNo ?? '') === String(snap.selectedBillNo ?? '')
            && live.isUnprintedBill === snap.isUnprintedBill
            && Array.isArray(live.details)
            && live.details.length > 0
        ) {
            return live.details;
        }
        const pending = detailsLoadRef.current;
        if (pending && pending.key === key && pending.rows?.length) return pending.rows;
        return null;
    };

    const immediate = readRows();
    if (immediate) return immediate;

    const forceFetch = async () => {
        try {
            const detailsUrl = snap.isUnprintedBill
                ? `/suppliers/${snap.selectedSupplier}/unprinted-details`
                : (snap.selectedBillNo ? `/suppliers/bill/${snap.selectedBillNo}/details` : null);
            if (!detailsUrl) return [];
            pausePrefetch();
            const res = await getWithTimeout(detailsUrl, null, CLICK_TIMEOUT_MS);
            const fetched = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.details || []);
            if (fetched.length) {
                cachePutDetails(key, fetched);
                const live = liveBillRef.current || {};
                if (
                    live.selectedSupplier === snap.selectedSupplier
                    && String(live.selectedBillNo ?? '') === String(snap.selectedBillNo ?? '')
                    && live.isUnprintedBill === snap.isUnprintedBill
                ) {
                    liveBillRef.current = { ...live, details: fetched };
                }
            }
            return fetched;
        } catch {
            return detailsCache.get(key) || [];
        }
    };

    // Start force-fetch immediately so F4 never stalls if the click request was aborted/settled empty
    const fetchPromise = forceFetch();

    const pending = detailsLoadRef.current;
    const pendingPromise = (pending && pending.key === key && pending.promise)
        ? pending.promise.then(() => readRows() || []).catch(() => readRows() || [])
        : Promise.resolve(readRows() || []);

    const rows = await new Promise((resolve) => {
        let settled = false;
        const finish = (value) => {
            if (settled) return;
            settled = true;
            resolve(value);
        };
        const tryFinish = (value) => {
            if (Array.isArray(value) && value.length > 0) finish(value);
        };

        pendingPromise.then(tryFinish);
        fetchPromise.then(tryFinish);

        Promise.all([pendingPromise, fetchPromise]).then(([a, b]) => {
            if (settled) return;
            finish((a?.length && a) || (b?.length && b) || readRows() || []);
        });

        setTimeout(() => {
            if (settled) return;
            finish(readRows() || []);
        }, PRINT_WAIT_DETAILS_MS);
    });

    if (rows?.length) return rows;
    // Final attempt if both paths raced to empty (rare network glitch)
    const last = await forceFetch();
    return last?.length ? last : (readRows() || []);
};

const handlePrint = useCallback(async () => {
    // Only supersede an older wait if another F4 starts while this one is still loading.
    // Do NOT bump generation on every call from duplicate key events — that cancels a valid print.
    const myGen = printGenRef.current + 1;
    printGenRef.current = myGen;
    const stillMine = () => myGen === printGenRef.current;

    // Prefer live snapshot; fall back to React selection so F4 never misses a selected bill
    const live = liveBillRef.current || {};
    const sel = selectedStateRef.current || {};
    const snap = {
        details: live.details || [],
        selectedSupplier: live.selectedSupplier || sel.selectedSupplier || selectedSupplier || null,
        selectedBillNo: live.selectedBillNo ?? sel.selectedBillNo ?? selectedBillNo ?? null,
        isUnprintedBill: live.isUnprintedBill ?? sel.isUnprintedBill ?? isUnprintedBill ?? false,
        advanceAmount: live.advanceAmount ?? advanceAmount ?? 0,
        payingAmount: live.payingAmount ?? payingAmount ?? '',
        billSize: live.billSize || billSize || '3mm',
    };

    if (!snap.details.length && Array.isArray(supplierDetails) && supplierDetails.length
        && String(selectedSupplier || '') === String(snap.selectedSupplier || '')) {
        snap.details = supplierDetails;
    }
    if (!snap.details.length && snap.selectedSupplier) {
        const key = detailsCacheKey(!!snap.isUnprintedBill, snap.selectedSupplier, snap.selectedBillNo);
        const cached = detailsCache.get(key);
        if (cached?.length) snap.details = cached;
    }

    if (!snap.selectedSupplier) {
        alert('Select a bill first!');
        return;
    }

    // If a print dialog path is already running for this same selection, ignore duplicate F4
    if (printInFlightRef.current) {
        const cur = liveBillRef.current || {};
        if (
            String(cur.selectedSupplier || '') === String(snap.selectedSupplier || '')
            && String(cur.selectedBillNo ?? '') === String(snap.selectedBillNo ?? '')
            && !!cur.isUnprintedBill === !!snap.isUnprintedBill
        ) {
            return;
        }
    }

    markUserBusy();
    pausePrefetch();
    armPrintLock();

    const openPrintAndClear = (billNo) => {
        // Always print once we have content — do not drop the dialog because a duplicate F4 bumped gen
        liveBillRef.current = {
            ...liveBillRef.current,
            details: snap.details || liveBillRef.current.details || [],
            selectedSupplier: snap.selectedSupplier,
            selectedBillNo: billNo,
            isUnprintedBill: false,
            advanceAmount: snap.advanceAmount,
            payingAmount: snap.payingAmount,
            billSize: snap.billSize,
        };
        const billContent = getBillContent(billNo);
        let ok = false;
        try {
            ok = !!printHtml(billContent);
        } catch (e) {
            console.error('Print error:', e);
            ok = false;
        }
        if (!ok) ok = printViaPopup(billContent);
        if (!ok) {
            alert('Print dialog could not open. Allow popups for this site and press F4 again.');
            clearPrintLock();
            return false;
        }
        clearPrintLock();
        clearCenterPanel();
        silentFetchSummary();
        setTimeout(() => silentFetchSummary(), 800);
        return true;
    };

    try {
        // ⚡ Instant reprint: rows already in memory — open dialog immediately (keeps user-gesture for print)
        if (!snap.isUnprintedBill && snap.selectedBillNo && Array.isArray(snap.details) && snap.details.length > 0) {
            openPrintAndClear(snap.selectedBillNo);
            return;
        }

        let rows = [];
        try {
            rows = await ensureRowsForPrint(snap);
        } catch (e) {
            console.error('Print wait failed:', e);
            rows = [];
        }

        // A newer F4 for a *different* bill superseded this wait
        if (!stillMine()) {
            clearPrintLock();
            return;
        }

        if (!rows || rows.length === 0) {
            clearPrintLock();
            alert('No data to print! Select the bill again, then press F4.');
            return;
        }

        liveBillRef.current = {
            ...liveBillRef.current,
            details: rows,
            selectedSupplier: snap.selectedSupplier,
            selectedBillNo: snap.selectedBillNo,
            isUnprintedBill: snap.isUnprintedBill,
            advanceAmount: snap.advanceAmount,
            payingAmount: snap.payingAmount,
            billSize: snap.billSize,
        };
        snap.details = rows;

        if (
            selectedStateRef.current.selectedSupplier === snap.selectedSupplier
            && String(selectedStateRef.current.selectedBillNo ?? '') === String(snap.selectedBillNo ?? '')
            && selectedStateRef.current.isUnprintedBill === snap.isUnprintedBill
        ) {
            setSupplierDetails(prev => sameDetailsList(prev, rows) ? prev : rows);
            setIsDetailsLoading(false);
        }

        if (!snap.isUnprintedBill && snap.selectedBillNo) {
            openPrintAndClear(snap.selectedBillNo);
            return;
        }

        if (snap.isUnprintedBill) {
            const hasInvalidSupplierPrice = rows.some(record => {
                const supplierPrice = parseFloat(record.SupplierPricePerKg) || 0;
                return supplierPrice === 0 || supplierPrice === 1;
            });

            if (hasInvalidSupplierPrice) {
                clearPrintLock();
                alert('⚠️ මුද්‍රණය කළ නොහැක! සැපයුම් මිල තීරුවේ 0 හෝ 1 අගයන් අඩංගු වේ.\n\nCannot print! The "සැපයුම් මිල" column contains values 0 or 1.');
                return;
            }
        }

        const advanceForPrint = parseFloat(snap.advanceAmount) || 0;
        const supplierForPrint = snap.selectedSupplier;
        const wasUnprinted = snap.isUnprintedBill;
        let printBillNo = snap.selectedBillNo;

        if (wasUnprinted) {
            beginMutation();
            try {
                const response = await mutateWithTimeout('post', '/suppliers/mark-as-printed', {
                    transaction_ids: rows.map(r => r.id),
                    advance_amount: advanceForPrint,
                    supplier_code: supplierForPrint
                });

                if (!stillMine()) {
                    endMutation();
                    clearPrintLock();
                    return;
                }

                printBillNo = response.data.new_bill_no;
                if (!printBillNo) {
                    throw new Error('Server did not return a bill number');
                }

                detailsCache.delete(detailsCacheKey(true, supplierForPrint, null));
                cachePutDetails(detailsCacheKey(false, supplierForPrint, printBillNo), rows);

                for (const cacheKey of [...billContentCache.keys()]) {
                    if (cacheKey.startsWith(`${supplierForPrint}-`)) billContentCache.delete(cacheKey);
                }

                liveBillRef.current = {
                    ...liveBillRef.current,
                    selectedSupplier: supplierForPrint,
                    selectedBillNo: printBillNo,
                    isUnprintedBill: false,
                    details: rows,
                    advanceAmount: advanceForPrint,
                    payingAmount: snap.payingAmount,
                    billSize: snap.billSize,
                };
            } catch (err) {
                console.error('Finalize Error:', err);
                const timedOut = err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError' || err?.name === 'AbortError';
                alert(timedOut
                    ? '❌ Finalize timed out. Check network and try F4 again.'
                    : ('❌ Failed to finalize bill: ' + (err.response?.data?.error || err.message)));
                clearPrintLock();
                endMutation();
                return;
            }
            endMutation();
        }

        if (!stillMine()) {
            clearPrintLock();
            return;
        }

        if (!printBillNo) {
            clearPrintLock();
            alert('❌ No bill number available to print.');
            return;
        }

        openPrintAndClear(printBillNo);
    } catch (error) {
        console.error('Print error:', error);
        clearPrintLock();
        alert('An error occurred while printing. Please try again.');
    }
}, [getBillContent, markUserBusy, silentFetchSummary, armPrintLock, clearPrintLock, clearCenterPanel, selectedSupplier, selectedBillNo, isUnprintedBill, supplierDetails, advanceAmount, payingAmount, billSize]);
const handleForcePrint = useCallback(async () => {
    // Only supersede an older wait if another F4 starts while this one is still loading.
    const myGen = printGenRef.current + 1;
    printGenRef.current = myGen;
    const stillMine = () => myGen === printGenRef.current;

    // Prefer live snapshot; fall back to React selection
    const live = liveBillRef.current || {};
    const sel = selectedStateRef.current || {};
    const snap = {
        details: live.details || [],
        selectedSupplier: live.selectedSupplier || sel.selectedSupplier || selectedSupplier || null,
        selectedBillNo: live.selectedBillNo ?? sel.selectedBillNo ?? selectedBillNo ?? null,
        isUnprintedBill: live.isUnprintedBill ?? sel.isUnprintedBill ?? isUnprintedBill ?? false,
        advanceAmount: live.advanceAmount ?? advanceAmount ?? 0,
        payingAmount: live.payingAmount ?? payingAmount ?? '',
        billSize: live.billSize || billSize || '3mm',
    };

    if (!snap.details.length && Array.isArray(supplierDetails) && supplierDetails.length
        && String(selectedSupplier || '') === String(snap.selectedSupplier || '')) {
        snap.details = supplierDetails;
    }
    if (!snap.details.length && snap.selectedSupplier) {
        const key = detailsCacheKey(!!snap.isUnprintedBill, snap.selectedSupplier, snap.selectedBillNo);
        const cached = detailsCache.get(key);
        if (cached?.length) snap.details = cached;
    }

    if (!snap.selectedSupplier) {
        return;
    }

    // If a print dialog path is already running for this same selection, ignore duplicate
    if (printInFlightRef.current) {
        const cur = liveBillRef.current || {};
        if (
            String(cur.selectedSupplier || '') === String(snap.selectedSupplier || '')
            && String(cur.selectedBillNo ?? '') === String(snap.selectedBillNo ?? '')
            && !!cur.isUnprintedBill === !!snap.isUnprintedBill
        ) {
            return;
        }
    }

    markUserBusy();
    pausePrefetch();
    armPrintLock();

    const openPrintAndClear = (billNo) => {
        liveBillRef.current = {
            ...liveBillRef.current,
            details: snap.details || liveBillRef.current.details || [],
            selectedSupplier: snap.selectedSupplier,
            selectedBillNo: billNo,
            isUnprintedBill: false,
            advanceAmount: snap.advanceAmount,
            payingAmount: snap.payingAmount,
            billSize: snap.billSize,
        };
        const billContent = getBillContent(billNo);
        let ok = false;
        try {
            ok = !!printHtml(billContent);
        } catch (e) {
            console.error('Print error:', e);
            ok = false;
        }
        if (!ok) ok = printViaPopup(billContent);
        if (!ok) {
            clearPrintLock();
            return false;
        }
        clearPrintLock();
        clearCenterPanel();
        silentFetchSummary();
        setTimeout(() => silentFetchSummary(), 800);
        return true;
    };

    try {
        let rows = [];
        try {
            rows = await ensureRowsForPrint(snap);
        } catch (e) {
            console.error('Print wait failed:', e);
            rows = [];
        }

        if (!stillMine()) {
            clearPrintLock();
            return;
        }

        if (!rows || rows.length === 0) {
            if (snap.details && snap.details.length > 0) {
                rows = snap.details;
            } else {
                clearPrintLock();
                return;
            }
        }

        liveBillRef.current = {
            ...liveBillRef.current,
            details: rows,
            selectedSupplier: snap.selectedSupplier,
            selectedBillNo: snap.selectedBillNo,
            isUnprintedBill: snap.isUnprintedBill,
            advanceAmount: snap.advanceAmount,
            payingAmount: snap.payingAmount,
            billSize: snap.billSize,
        };
        snap.details = rows;

        if (
            selectedStateRef.current.selectedSupplier === snap.selectedSupplier
            && String(selectedStateRef.current.selectedBillNo ?? '') === String(snap.selectedBillNo ?? '')
            && selectedStateRef.current.isUnprintedBill === snap.isUnprintedBill
        ) {
            setSupplierDetails(prev => sameDetailsList(prev, rows) ? prev : rows);
            setIsDetailsLoading(false);
        }

        if (!snap.isUnprintedBill && snap.selectedBillNo) {
            openPrintAndClear(snap.selectedBillNo);
            return;
        }

        if (snap.isUnprintedBill) {
            const hasInvalidSupplierPrice = rows.some(record => {
                const supplierPrice = parseFloat(record.SupplierPricePerKg) || 0;
                return supplierPrice === 0 || supplierPrice === 1;
            });

            if (hasInvalidSupplierPrice) {
                clearPrintLock();
                return;
            }
        }

        const advanceForPrint = parseFloat(snap.advanceAmount) || 0;
        const supplierForPrint = snap.selectedSupplier;
        const wasUnprinted = snap.isUnprintedBill;
        let printBillNo = snap.selectedBillNo;

        if (wasUnprinted) {
            beginMutation();
            try {
                const response = await mutateWithTimeout('post', '/suppliers/mark-as-printed', {
                    transaction_ids: rows.map(r => r.id),
                    advance_amount: advanceForPrint,
                    supplier_code: supplierForPrint
                });

                if (!stillMine()) {
                    endMutation();
                    clearPrintLock();
                    return;
                }

                printBillNo = response.data.new_bill_no;
                if (!printBillNo) {
                    endMutation();
                    clearPrintLock();
                    return;
                }

                detailsCache.delete(detailsCacheKey(true, supplierForPrint, null));
                cachePutDetails(detailsCacheKey(false, supplierForPrint, printBillNo), rows);

                for (const cacheKey of [...billContentCache.keys()]) {
                    if (cacheKey.startsWith(`${supplierForPrint}-`)) billContentCache.delete(cacheKey);
                }

                liveBillRef.current = {
                    ...liveBillRef.current,
                    selectedSupplier: supplierForPrint,
                    selectedBillNo: printBillNo,
                    isUnprintedBill: false,
                    details: rows,
                    advanceAmount: advanceForPrint,
                    payingAmount: snap.payingAmount,
                    billSize: snap.billSize,
                };
            } catch (err) {
                console.error('Finalize Error (Force Print):', err);
                endMutation();
                clearPrintLock();
                return;
            }
            endMutation();
        }

        if (!stillMine()) {
            clearPrintLock();
            return;
        }

        if (!printBillNo) {
            clearPrintLock();
            return;
        }

        openPrintAndClear(printBillNo);
    } catch (error) {
        console.error('Print error:', error);
        clearPrintLock();
    }
}, [getBillContent, markUserBusy, silentFetchSummary, armPrintLock, clearPrintLock, clearCenterPanel, selectedSupplier, selectedBillNo, isUnprintedBill, supplierDetails, advanceAmount, payingAmount, billSize]);

    // Keep BOTH ref + module handler fresh every render — F4 must never find null mid-day
    handlePrintRef.current = handlePrint;
    latestSupplierPrintHandler = handlePrint;

   // --- F4 must always call handlePrint (window + document; keydown only) ---
useEffect(() => {
    const isF4 = (event) =>
        event.key === 'F4'
        || event.code === 'F4'
        || event.keyCode === 115
        || event.which === 115;

    const isF1 = (event) =>
        event.key === 'F1'
        || event.code === 'F1'
        || event.keyCode === 112
        || event.which === 112;

    let lastF4At = 0;

    const invokePrint = () => {
        const now = Date.now();
        // Dedup window+document listeners for the same physical press
        if (now - lastF4At < 250) return;
        lastF4At = now;

        const printFn = handlePrintRef.current || latestSupplierPrintHandler;
        if (typeof printFn === 'function') {
            try {
                void printFn();
            } catch (err) {
                console.error('F4 handlePrint threw:', err);
                alert('Print failed to start. Try F4 again.');
            }
        } else {
            alert('Print is not ready yet. Select a bill and try F4 again.');
        }
    };

    const onKeyDown = (event) => {
        if (isF1(event)) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        if (!isF4(event)) return;
        try {
            event.preventDefault();
            event.stopPropagation();
            if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
        } catch { /* ignore */ }
        // Ignore OS key-repeat only — do NOT gate on a "held" flag.
        // win.print() is modal: F4 keyup is often lost, which used to require a double-press.
        if (event.repeat) return;
        invokePrint();
    };

    const onKeyUp = (event) => {
        if (!isF4(event)) return;
        try { event.preventDefault(); } catch { /* ignore */ }
        // keyup must not print (that cancelled in-flight work) and must not require a held-flag reset
    };

    const opts = { capture: true, passive: false };
    window.addEventListener('keydown', onKeyDown, opts);
    document.addEventListener('keydown', onKeyDown, opts);
    window.addEventListener('keyup', onKeyUp, opts);
    document.addEventListener('keyup', onKeyUp, opts);

    // After print dialog closes, focus often stays on the iframe — restore so the next F4 is heard
    const onAfterPrint = () => {
        try { window.focus(); } catch { /* ignore */ }
        printInFlightRef.current = false;
        lastF4At = 0;
    };
    window.addEventListener('afterprint', onAfterPrint);

    const onVisible = () => {
        if (document.visibilityState === 'visible') {
            handlePrintRef.current = latestSupplierPrintHandler;
            printInFlightRef.current = false;
            lastF4At = 0;
            try { window.focus(); } catch { /* ignore */ }
        }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
        window.removeEventListener('keydown', onKeyDown, opts);
        document.removeEventListener('keydown', onKeyDown, opts);
        window.removeEventListener('keyup', onKeyUp, opts);
        document.removeEventListener('keyup', onKeyUp, opts);
        window.removeEventListener('afterprint', onAfterPrint);
        document.removeEventListener('visibilitychange', onVisible);
        if (latestSupplierPrintHandler === handlePrintRef.current) {
            latestSupplierPrintHandler = null;
        }
    };
}, []);

    //new profile pic view modal
    const renderImageModal = () => {
        if (!isImageModalOpen) return null;

        const formatUrl = (path) => {
            if (!path) return null;
            return path.startsWith('http') ? path : `https://goviraju.lk/sms_new_backend_50500/application/public/storage/${path}`;
        };

        const onClose = () => setIsImageModalOpen(false);

        return (
            <div
                style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}
                onClick={onClose}
            >
                <div
                    style={{ backgroundColor: '#1f2937', borderRadius: '20px', width: '95%', maxWidth: '1000px', maxHeight: '95vh', padding: '25px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)', border: '1px solid #4b5563', display: 'flex', flexDirection: 'column' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #374151', paddingBottom: '15px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', margin: 0 }}>
                            {supplierDocs.title} - ලේඛන පරීක්ෂාව
                        </h2>
                        <button
                            onClick={onClose}
                            style={{ background: '#374151', border: 'none', color: 'white', width: '35px', height: '35px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}
                        > ✕ </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.5fr', gap: '20px', overflowY: 'auto', padding: '5px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ color: '#60a5fa', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>ප්‍රධාන රූපය</span>
                            <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', border: '2px solid #3b82f6', backgroundColor: '#111827', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                                <img src={formatUrl(supplierDocs.profile)} style={{ width: '100%', height: 'auto', display: 'block' }} alt="Profile" />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>NIC ඉදිරිපස</span>
                            <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', border: '2px solid #4b5563', backgroundColor: '#111827', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                                {supplierDocs.nic_front ? (
                                    <img src={formatUrl(supplierDocs.nic_front)} style={{ width: '100%', height: 'auto', maxHeight: '500px', display: 'block', objectFit: 'contain' }} alt="NIC Front" />
                                ) : (
                                    <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>ඡායාරූපයක් නොමැත</div>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>NIC පසුපස</span>
                            <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', border: '2px solid #4b5563', backgroundColor: '#111827', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                                {supplierDocs.nic_back ? (
                                    <img src={formatUrl(supplierDocs.nic_back)} style={{ width: '100%', height: 'auto', maxHeight: '500px', display: 'block', objectFit: 'contain' }} alt="NIC Back" />
                                ) : (
                                    <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>ඡායාරූපයක් නොමැත</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #374151', paddingTop: '15px' }}>
                        <button
                            onClick={onClose}
                            style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '10px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
                        >Close </button>
                    </div>
                </div>
            </div>
        );
    };

   const renderEditModal = () => {
    if (!editingRecord) return null;
    
    const handleSubmit = (e) => {
        e.preventDefault(); // Prevent page refresh
        handleUpdateFarmer(); // Call your existing update function
    };
    
    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
            <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', width: '400px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                <h3 style={{ marginTop: 0, color: '#091d3d', borderBottom: '2px solid #007bff', paddingBottom: '10px' }}>ගනුදෙනුව වෙනස් කරන්න</h3>

                <div style={{ margin: '15px 0', fontSize: '0.9rem', color: '#666', backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px' }}>
                    <p style={{ margin: '2px 0' }}><strong>බිල් අං:</strong> {editingRecord.bill_no || selectedBillNo}</p>
                    <p style={{ margin: '2px 0' }}><strong>අයිතමය:</strong> {editingRecord.item_name} | {editingRecord.weight} kg</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginTop: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' }}>නව ගොවි කේතය (Supplier - Optional):</label>
                        <input
                            type="text"
                            placeholder={editingRecord.supplier_code}
                            value={newFarmerCode}
                            onChange={(e) => setNewFarmerCode(e.target.value.toUpperCase())}
                            style={{ width: '100%', padding: '10px', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                            autoFocus
                        />
                    </div>

                    <div style={{ marginTop: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' }}>නව ගැනුම්කරු (Customer - Optional):</label>
                        <input
                            type="text"
                            placeholder={editingRecord.customer_code}
                            value={newCustomerCode}
                            onChange={(e) => setNewCustomerCode(e.target.value.toUpperCase())}
                            style={{ width: '100%', padding: '10px', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                        <button type="submit" style={{ flex: 1, padding: '12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>OK</button>
                        <button type="button" onClick={() => { setEditingRecord(null); setNewFarmerCode(''); setNewCustomerCode(''); }} style={{ flex: 1, padding: '12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

    // --- ALWAYS DISPLAYED DETAILS PANEL ---
    const renderDetailsPanel = () => {
        const panelContainerStyle = { backgroundColor: '#091d3d', padding: '30px', borderRadius: '12px', maxWidth: '100%', maxHeight: 'calc(100vh - 60px)', overflowY: 'auto', position: 'relative', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)', fontFamily: 'Roboto, Arial, sans-serif', marginTop: '-10px', width: '850px', minHeight: '550px', marginLeft: '0' };
        const headerStyle = { color: '#007bff', borderBottom: '2px solid #e9ecef', paddingBottom: '10px', marginTop: '0', marginBottom: '20px', fontSize: '1.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
        const thStyle = { backgroundColor: '#007bff', color: 'white', fontWeight: '600', padding: '6px 8px', textAlign: 'left', position: 'sticky', top: '0', zIndex: 10, fontSize: '0.8rem', whiteSpace: 'nowrap' };

        const renderDataRows = () => (
            <tbody>
                {supplierDetails.map((record, index) => (
                    <DetailDataRow
                        key={record.id || index}
                        record={record}
                        index={index}
                        billNo={selectedBillNo}
                        onEdit={setEditingRecord}
                    />
                ))}
                <tr style={{ ...(supplierDetails.length % 2 === 0 ? evenRowStyle : oddRowStyle), fontWeight: 'bold', borderTop: '2px solid #000', cursor: 'default' }}>
                    <td style={detailTdStyle} colSpan="3"><strong>TOTALS</strong></td>
                    <td style={detailTdStyle}>{totalPacksSum}</td>
                    <td style={detailTdStyle}>{totalWeight.toFixed(3)}</td>
                    <td style={detailTdStyle}>-</td>
                    <td style={detailTdStyle}>-</td>
                    <td style={detailTdStyle}>{totalCusGross.toFixed(2)}</td>
                    <td style={detailTdStyle}>{totalsupplierSales.toFixed(2)}</td>
                    <td style={detailTdStyle}>-</td>
                </tr>
            </tbody>
        );

        return (
            <div style={panelContainerStyle}>
                <div style={headerStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <h2 style={{ fontSize: "1.5rem", color: "white", margin: 0 }}>
                            ගනුදෙනු විස්තර (බිල් අංකය: <strong>{selectedBillNo || 'N/A'}</strong>)
                        </h2>

                        {selectedSupplier && loanStatus && (
                            <span style={{ fontSize: '0.9rem', color: '#ffc107', fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px' }}>
                                {loanStatus}
                            </span>
                        )}
                    </div>

                    {profilePic && (
                        <div style={{ marginLeft: '20px' }}>
                            <img
                                src={profilePic.startsWith('http') ? profilePic : `https://goviraju.lk/sms_new_backend_50500/application/public/storage/${profilePic}`}
                                alt="Supplier"
                                onClick={() => setIsImageModalOpen(true)}
                                style={{
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '50%',
                                    border: '2px solid white',
                                    objectFit: 'cover',
                                    backgroundColor: '#ccc',
                                    cursor: 'pointer'
                                }}
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                        </div>
                    )}
                </div>

                <div style={{ marginTop: '20px', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '250px', fontSize: '0.9rem', marginBottom: '30px' }}>
                        <thead>
                            <tr>
                                <th style={thStyle}>බිල් අං:</th>
                                <th style={thStyle}>ගනුදෙ</th>
                                <th style={thStyle}>අයිත</th>
                                <th style={thStyle}>අසුරුම්</th>
                                <th style={thStyle}>බර</th>
                                <th style={thStyle}>ගනුදෙ මිල</th>
                                <th style={thStyle}>සැපයුම් මිල</th>
                                <th style={thStyle}>ගනුදෙ එක</th>
                                <th style={thStyle}>සැපයුම් එක</th>
                                <th style={thStyle}>කොමි</th>
                            </tr>
                        </thead>
                        {selectedSupplier && supplierDetails.length > 0 ? renderDataRows() : <tbody><tr><td colSpan="11" style={{ textAlign: 'center', color: '#6c757d', fontStyle: 'italic', padding: '50px 0' }}>Select a bill to view details</td></tr></tbody>}
                    </table>
                </div>

                {selectedSupplier && Object.keys(itemSummaryData).length > 0 && (
                    <>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0px' }}>
                            <thead>
                                <tr>
                                    <th style={{ ...thStyle, backgroundColor: '#6c757d' }}>අයිතමය නම</th>
                                    <th style={{ ...thStyle, backgroundColor: '#6c757d' }}>සම්පූර්ණ බර</th>
                                    <th style={{ ...thStyle, backgroundColor: '#6c757d' }}>මුළු අසුරුම්</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.keys(itemSummaryData).map((name, i) => (
                                    <tr key={name} style={i % 2 === 0 ? evenRowStyle : oddRowStyle}>
                                        <td style={detailTdStyle}>{name}</td>
                                        <td style={detailTdStyle}>{formatDecimal(itemSummaryData[name].totalWeight, 3)}</td>
                                        <td style={detailTdStyle}>{itemSummaryData[name].totalPacks}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div style={{ marginTop: '30px', padding: '20px', border: '1px solid #ffffff33', borderRadius: '8px', backgroundColor: '#ffffff11' }}>
                            <h3 style={{ color: '#ffc107', marginTop: 0, fontSize: '1.2rem' }}>අත්තිකාරම් ඇතුලත් කරන්න (Advance Entry)</h3>
                            <form onSubmit={handleAdvanceSubmit} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.8rem', color: '#eee', display: 'block', marginBottom: '5px' }}>Supplier Code</label>
                                    <input
                                        type="text"
                                        value={advancePayload.code}
                                        readOnly
                                        style={{ width: '100%', padding: '10px', borderRadius: '4px', border: 'none', backgroundColor: '#eee', color: '#000' }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.8rem', color: '#eee', display: 'block', marginBottom: '5px' }}>Amount (රු:)</label>
                                    <input
                                        type="number"
                                        name="advance_amount"
                                        value={advancePayload.advance_amount}
                                        onChange={(e) => setAdvancePayload(prev => ({ ...prev, advance_amount: e.target.value }))}
                                        style={{ width: '100%', padding: '10px', borderRadius: '4px', border: 'none', color: '#000' }}
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={advanceLoading || !selectedSupplier}
                                    style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', height: '40px' }}
                                >
                                    {advanceLoading ? 'Saving...' : 'Update Advance'}
                                </button>
                            </form>
                            {advanceStatus.text && (
                                <p style={{ color: advanceStatus.type === 'success' ? '#28a745' : '#ff4444', marginTop: '10px', fontWeight: 'bold' }}>
                                    {advanceStatus.text}
                                </p>
                            )}
                        </div>
                    </>
                )}
                <div style={{ textAlign: 'center' }}>
    <button 
        style={{ 
            padding: '10px 20px', 
            fontSize: '1.1rem', 
            fontWeight: 'bold', 
            backgroundColor: '#ffc107', 
            color: '#343a40', 
            border: 'none', 
            borderRadius: '6px', 
            cursor: selectedSupplier ? 'pointer' : 'not-allowed', 
            marginTop: '20px', 
            opacity: selectedSupplier ? 1 : 0.5 
        }} 
        onClick={async () => {
            if (!selectedSupplier) return;
            
            // For unprinted bills, offer a choice
            if (isUnprintedBill) {
                const shouldForce = window.confirm(
                    '⚠️ This is an unprinted bill.\n\n' +
                    'Press OK to FORCE PRINT (bypass API) - use if F4 is failing.\n' +
                    'Press Cancel to try normal print (with finalization).'
                );
                if (shouldForce) {
                    await handleForcePrint();
                } else {
                    await handlePrint();
                }
            } else {
                // For printed bills, just print normally
                await handlePrint();
            }
        }} 
        disabled={!selectedSupplier}
    >
        🖨️ {selectedSupplier ? (isUnprintedBill ? `Print & Finalize Bill (F4)` : `Print Copy (F4)`) : 'Select a Bill First'}
    </button>
</div>
            </div>
        );
    };

    const navBarStyle = { backgroundColor: '#343a40', padding: '15px 50px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' };
    const reportContainerStyle = { minHeight: '100vh', padding: '90px 50px 50px 50px', fontFamily: 'Roboto, Arial, sans-serif', boxSizing: 'border-box', backgroundColor: '#1ec139ff' };

    // Only show full loading screen on initial load, not on refresh
    if (isLoading) return <div style={loadingStyle}>Loading Supplier Report...</div>;

    return (
        <>
            <nav style={navBarStyle}>
                <h1 style={{ color: 'white', fontSize: '1.5rem', margin: 0 }}>සැපයුම්කරු වාර්තාව</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <button style={{ padding: '8px 15px', fontSize: '1rem', fontWeight: 'bold', backgroundColor: '#e83e8c', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }} onClick={() => navigate('/sales')}>මුල් පිටුව</button>
                     <button style={{ padding: '8px 15px', fontSize: '1rem', fontWeight: 'bold', backgroundColor: '#e83e8c', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }} onClick={() => navigate('/advance-report')}>Advance Report</button>
                </div>
            </nav>

            <div style={reportContainerStyle}>
                <div style={sectionsContainerStyle}>
                    <div style={printedContainerStyle}>
                        <div style={printedSectionStyle}>
                            <h2 style={{ ...printedHeaderStyle, padding: '0 25px 10px 25px', marginBottom: '15px' }}> මුද්‍රණය කළ </h2>
                            <input type="text" placeholder="🔍 මුද්‍රිත සෙවීම..." value={printedSearchTerm} onChange={(e) => setPrintedSearchTerm(e.target.value)} style={{ ...searchBarStyle, marginBottom: '20px', height: '22px', padding: '12px 25px' }} />
                            <SupplierCodeList items={filteredPrintedItems} type="printed" searchTerm={printedSearchTerm} onSelect={handlePrintedBillClick} onPrefetch={handlePrefetchPrinted} />
                        </div>
                    </div>
                    <div style={centerPanelContainerStyle}>{renderDetailsPanel()}</div>
                    <div style={unprintedContainerStyle}>
                        <div style={unprintedSectionStyle}>
                            <h2 style={{ ...unprintedHeaderStyle, padding: '0 25px 10px 25px', marginBottom: '15px', whiteSpace: 'nowrap' }}>මුද්‍රණය නොකළ</h2>
                            <input type="text" placeholder="🔍 මුද්‍රණ නොකළ සෙවීම..." value={unprintedSearchTerm} onChange={(e) => setUnprintedSearchTerm(e.target.value)} style={{ ...searchBarStyle, marginBottom: '20px', height: '22px', padding: '12px 25px' }} />
                            <SupplierCodeList items={filteredUnprintedItems} type="unprinted" searchTerm={unprintedSearchTerm} onSelect={handleUnprintedBillClick} onPrefetch={handlePrefetchUnprinted} />
                        </div>
                    </div>
                </div>
            </div>
            {renderImageModal()}
            {renderEditModal()}
        </>
    );
};

// --- STYLES ---
const searchBarStyle = { width: '100%', fontSize: '1rem', borderRadius: '6px', border: '1px solid #E0E0E0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', boxSizing: 'border-box', backgroundColor: 'white' };
const sectionsContainerStyle = { display: 'flex', justifyContent: 'space-between', gap: '20px' };
const printedContainerStyle = { width: '200px', flexShrink: 0, marginLeft: '-45px', marginTop: '-10px', border: '2px solid black' };
const unprintedContainerStyle = { width: '180px', flexShrink: 0, marginRight: '-45px', marginTop: '-10px', marginLeft: '0', border: '2px solid black' };
const centerPanelContainerStyle = { flex: '3', minWidth: '700px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' };
const baseSectionStyle = { padding: '25px 0 25px 0', borderRadius: '12px', boxShadow: '0 6px 15px rgba(0, 0, 0, 0.08)', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 210px)' };
const printedSectionStyle = { ...baseSectionStyle, backgroundColor: '#1ec139ff', borderLeft: '5px solid #FFFFFF', minHeight: '550px' };
const unprintedSectionStyle = { ...baseSectionStyle, backgroundColor: '#1ec139ff', borderLeft: '5px solid #FFFFFF', minHeight: '550px' };
const printedHeaderStyle = { color: '#07090ae6', borderBottom: '2px solid #1E88E530', flexShrink: 0, fontSize: '1.3rem' };
const unprintedHeaderStyle = { color: '#07090ae6', borderBottom: '2px solid #FF704330', flexShrink: 0, fontSize: '1.3rem' };
const listContainerStyle = { display: 'flex', flexDirection: 'column', gap: '0px', marginTop: '5px', overflowY: 'auto', padding: '0 5px 0 5px', flexGrow: 1, height: '900px' };
const loadingStyle = { textAlign: 'center', padding: '50px', fontSize: '1.5rem', color: '#1E88E5', backgroundColor: '#1ec139ff' };

export default SupplierReport;
