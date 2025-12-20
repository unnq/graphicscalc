// js/app.js
const { useMemo, useEffect, useState } = React;

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

const STORAGE_KEY = "cgg_estimator_v2";

function defaultPrintLine() {
  const item = EstimateTool.getItemById("banner_13oz");
  const base = item?.pricePerSqFt ?? 0;
  const defaultMarkup = 40;
  const defaultSell = EstimateTool.round2(base * (1 + defaultMarkup / 100));

  return {
    id: uid("pl"),
    itemId: "banner_13oz",
    desc: "",
    width: 48,
    height: 24,
    unit: "in",
    qty: 1,
    sides: 1,
    sellPricePerSqFt: defaultSell,
    overrideCostPerSqFt: "",
  };
}

function defaultHourlyLine(prefix = "hr") {
  return {
    id: uid(prefix),
    name: "",
    role: "",
    payPerHr: 25,
    billPerHr: 85,
    hours: 1,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function CollapsibleSection({ title, subtitle, collapsed, setCollapsed, right, children }) {
  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 16, background: "rgba(0,0,0,0.10)", overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          padding: "12px 12px",
          background: "rgba(255,255,255,0.02)",
          cursor: "pointer",
          userSelect: "none",
          alignItems: "center",
        }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <div>
          <div style={{ fontWeight: 650 }}>{title}</div>
          {subtitle ? <div className="small" style={{ marginTop: 4 }}>{subtitle}</div> : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {right}
          <span className="badge">{collapsed ? "expand" : "collapse"}</span>
        </div>
      </div>

      {!collapsed ? <div style={{ padding: 12 }}>{children}</div> : null}
    </div>
  );
}

function App() {
  const saved = loadState();

  const [activeTab, setActiveTab] = useState(saved?.activeTab || "estimate");

  const [printLines, setPrintLines] = useState(saved?.printLines?.length ? saved.printLines : [defaultPrintLine()]);
  const [laborLines, setLaborLines] = useState(saved?.laborLines?.length ? saved.laborLines : [defaultHourlyLine("lb")]);
  const [designLines, setDesignLines] = useState(saved?.designLines?.length ? saved.designLines : [defaultHourlyLine("ds")]);

  const [installSqFt, setInstallSqFt] = useState(saved?.installSqFt ?? 0);

  const [collapsed, setCollapsed] = useState(saved?.collapsed || {
    print: false,
    labor: false,
    design: false,
  });

  const [quoteInfo, setQuoteInfo] = useState(saved?.quoteInfo || {
    clientName: "",
    company: "",
    email: "",
    phone: "",
    projectName: "",
    notes: "",
    quoteNumber: "",
    validDays: 14,
  });

  useEffect(() => {
    saveState({ activeTab, printLines, laborLines, designLines, installSqFt, quoteInfo, collapsed });
  }, [activeTab, printLines, laborLines, designLines, installSqFt, quoteInfo, collapsed]);

  const printTotals = useMemo(() => EstimateTool.calcPrintTotals(printLines), [printLines]);
  const laborTotals = useMemo(() => EstimateTool.calcHourlyTotals(laborLines), [laborLines]);
  const designTotals = useMemo(() => EstimateTool.calcHourlyTotals(designLines), [designLines]);

  const grandTotals = useMemo(
    () => EstimateTool.calcGrandTotals(printTotals, laborTotals, designTotals),
    [printTotals, laborTotals, designTotals]
  );

  const laborCostPerSqFt = useMemo(() => {
    const sqft = EstimateTool.toNumber(installSqFt, 0);
    if (sqft <= 0) return 0;
    return EstimateTool.round2(laborTotals.cost / sqft);
  }, [installSqFt, laborTotals.cost]);

  const laborBillPerSqFt = useMemo(() => {
    const sqft = EstimateTool.toNumber(installSqFt, 0);
    if (sqft <= 0) return 0;
    return EstimateTool.round2(laborTotals.price / sqft);
  }, [installSqFt, laborTotals.price]);

  function updatePrintLine(id, patch) {
    setPrintLines((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }
  function addPrintLine() {
    setPrintLines((prev) => [...prev, defaultPrintLine()]);
  }
  function removePrintLine(id) {
    setPrintLines((prev) => prev.filter((x) => x.id !== id));
  }

  function updateHourlyLine(setter, id, patch) {
    setter((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }
  function addHourlyLine(setter, prefix) {
    setter((prev) => [...prev, defaultHourlyLine(prefix)]);
  }
  function removeHourlyLine(setter, id) {
    setter((prev) => prev.filter((x) => x.id !== id));
  }

  function resetAll() {
    setPrintLines([defaultPrintLine()]);
    setLaborLines([defaultHourlyLine("lb")]);
    setDesignLines([defaultHourlyLine("ds")]);
    setInstallSqFt(0);
    setCollapsed({ print: false, labor: false, design: false });
    setQuoteInfo({
      clientName: "",
      company: "",
      email: "",
      phone: "",
      projectName: "",
      notes: "",
      quoteNumber: "",
      validDays: 14,
    });
  }

  function generatePdfQuote() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "letter" });

    const margin = 42;
    const pageWidth = doc.internal.pageSize.getWidth();

    const brand = "Coastal Graphics Group";
    const qNum = (quoteInfo.quoteNumber || "").trim();
    const today = new Date();
    const dateStr = today.toLocaleDateString();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(brand, margin, 54);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("Quote", margin, 74);

    doc.setFontSize(10);
    doc.text(`Date: ${dateStr}`, pageWidth - margin, 54, { align: "right" });
    if (qNum) doc.text(`Quote #: ${qNum}`, pageWidth - margin, 70, { align: "right" });

    doc.setDrawColor(200);
    doc.line(margin, 86, pageWidth - margin, 86);

    // Client block
    const leftY = 110;
    doc.setFont("helvetica", "bold");
    doc.text("Prepared For", margin, leftY);
    doc.setFont("helvetica", "normal");

    const clientLines = [
      quoteInfo.clientName || "",
      quoteInfo.company || "",
      quoteInfo.email || "",
      quoteInfo.phone || "",
      quoteInfo.projectName ? `Project: ${quoteInfo.projectName}` : "",
    ].filter(Boolean);

    let y = leftY + 16;
    clientLines.forEach((ln) => {
      doc.text(ln, margin, y);
      y += 14;
    });

    // Print items table
    const printRows = printLines.map((ln) => {
      const c = EstimateTool.calcPrintLine(ln);
      const itemName = c.item?.name || "Item";
      const dim = `${EstimateTool.round2(EstimateTool.toNumber(ln.width))} x ${EstimateTool.round2(
        EstimateTool.toNumber(ln.height)
      )} ${ln.unit}`;
      const qty = `${ln.qty}`;
      return [
        itemName,
        ln.desc || "",
        qty,
        dim,
        `${EstimateTool.round2(c.sqftTotal)} sqft`,
        EstimateTool.money(c.price),
      ];
    });

    doc.autoTable({
      startY: Math.max(y + 10, 190),
      head: [["Item", "Notes", "Qty", "Dimensions", "Area", "Line Total"]],
      body: printRows,
      styles: { font: "helvetica", fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [245, 245, 245], textColor: 20 },
      margin: { left: margin, right: margin },
      columnStyles: { 5: { halign: "right" } },
    });

    let curY = doc.lastAutoTable.finalY + 16;

    // Add Labor + Design as simple totals (clean customer-facing)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    doc.text(`Labor: ${EstimateTool.money(laborTotals.price)}`, pageWidth - margin, curY, { align: "right" });
    curY += 14;
    doc.text(`Design: ${EstimateTool.money(designTotals.price)}`, pageWidth - margin, curY, { align: "right" });
    curY += 18;

    doc.setFont("helvetica", "bold");
    doc.text(`Total: ${EstimateTool.money(grandTotals.price)}`, pageWidth - margin, curY, { align: "right" });

    doc.setFont("helvetica", "normal");
    const validDays = EstimateTool.toNumber(quoteInfo.validDays, 14);
    doc.setFontSize(9);
    doc.text(`Valid for ${validDays} days.`, margin, curY);

    if ((quoteInfo.notes || "").trim()) {
      doc.setFontSize(9);
      doc.text("Notes:", margin, curY + 22);
      const wrapped = doc.splitTextToSize(quoteInfo.notes.trim(), pageWidth - margin * 2);
      doc.text(wrapped, margin, curY + 38);
    }

    const filename = `Quote${qNum ? `-${qNum}` : ""}-${today.toISOString().slice(0, 10)}.pdf`;

      // Open PDF in a new tab (print preview) instead of downloading
      const pdfBlob = doc.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      const win = window.open(pdfUrl, "_blank", "noopener,noreferrer");
      if (!win) {
        alert("Popup blocked. Please allow popups to preview/print the quote.");
        return;
      }
      
      // Optional: set tab title (some browsers ignore this for PDFs)
      try { win.document.title = filename; } catch {}
      
      // Optional: auto-open print dialog after it loads (works in many browsers, not all)
      setTimeout(() => {
        try { win.focus(); win.print(); } catch {}
      }, 800);
      
      // Cleanup blob URL later
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 60_000);

  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="right-actions">
          <div>
            <div className="card-title">Estimator</div>
            <div className="card-subtitle">
              Print items, Labor, and Design are calculated independently and rolled into Grand Total.
            </div>
          </div>
          <div className="btn-row">
            <button className="btn ghost" onClick={resetAll}>Reset</button>
            <span className="badge">autosaves</span>
          </div>
        </div>
      </div>

      <div className="card-body">
        <div className="tabs">
          <div className={`tab ${activeTab === "estimate" ? "active" : ""}`} onClick={() => setActiveTab("estimate")}>
            Estimate
          </div>
          <div className={`tab ${activeTab === "quote" ? "active" : ""}`} onClick={() => setActiveTab("quote")}>
            Quote
          </div>
        </div>

        <div className="grid-2">
          <div>
            {activeTab === "estimate" ? (
              <>
                <CollapsibleSection
                  title="Print Line Items"
                  collapsed={collapsed.print}
                  setCollapsed={(v) => setCollapsed((p) => ({ ...p, print: v }))}
                  right={<button className="btn primary" onClick={(e) => { e.stopPropagation(); addPrintLine(); }}>Add Line</button>}
                >
                  <SectionPrintLines
                    printLines={printLines}
                    onRemove={removePrintLine}
                    onUpdate={updatePrintLine}
                  />
                </CollapsibleSection>

                <div className="hr"></div>

                <CollapsibleSection
                  title="Labor"
                  collapsed={collapsed.labor}
                  setCollapsed={(v) => setCollapsed((p) => ({ ...p, labor: v }))}
                  right={<button className="btn primary" onClick={(e) => { e.stopPropagation(); addHourlyLine(setLaborLines, "lb"); }}>Add Laborer</button>}
                >
                  <SectionHourly
                    kindLabel="Laborer"
                    lines={laborLines}
                    onRemove={(id) => removeHourlyLine(setLaborLines, id)}
                    onUpdate={(id, patch) => updateHourlyLine(setLaborLines, id, patch)}
                    showInstallSqFt
                    installSqFt={installSqFt}
                    setInstallSqFt={setInstallSqFt}
                    costPerSqFt={laborCostPerSqFt}
                    billPerSqFt={laborBillPerSqFt}
                  />
                </CollapsibleSection>

                <div className="hr"></div>

                <CollapsibleSection
                  title="Design Fee"
                  collapsed={collapsed.design}
                  setCollapsed={(v) => setCollapsed((p) => ({ ...p, design: v }))}
                  right={<button className="btn primary" onClick={(e) => { e.stopPropagation(); addHourlyLine(setDesignLines, "ds"); }}>Add Designer</button>}
                >
                  <SectionHourly
                    kindLabel="Designer"
                    lines={designLines}
                    onRemove={(id) => removeHourlyLine(setDesignLines, id)}
                    onUpdate={(id, patch) => updateHourlyLine(setDesignLines, id, patch)}
                    showInstallSqFt={false}
                  />
                </CollapsibleSection>
              </>
            ) : (
              <SectionQuote quoteInfo={quoteInfo} setQuoteInfo={setQuoteInfo} onGeneratePdf={generatePdfQuote} />
            )}
          </div>

          <div>
            <KPIPanel
              printTotals={printTotals}
              laborTotals={laborTotals}
              designTotals={designTotals}
              grandTotals={grandTotals}
              installSqFt={installSqFt}
              laborCostPerSqFt={laborCostPerSqFt}
              laborBillPerSqFt={laborBillPerSqFt}
            />

            <div className="hr"></div>

            
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionPrintLines({ printLines, onRemove, onUpdate }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th style={{ width: 220 }}>Item</th>
            <th style={{ width: 240 }}>Notes (internal)</th>
            <th style={{ width: 110 }}>W</th>
            <th style={{ width: 110 }}>H</th>
            <th style={{ width: 90 }}>Unit</th>
            <th style={{ width: 90 }}>Qty</th>
            <th style={{ width: 90 }}>Sides</th>
            <th style={{ width: 140 }}>Cost / sqft</th>
            <th style={{ width: 140 }}>Sell $ / sqft</th>
            <th style={{ width: 120 }}>Markup %</th>
            <th style={{ width: 120 }}>Sq Ft</th>
            <th style={{ width: 140 }}>Expense</th>
            <th style={{ width: 140 }}>Revenue</th>
            <th style={{ width: 80 }}></th>
          </tr>
        </thead>
        <tbody>
          {printLines.map((ln) => {
            const c = EstimateTool.calcPrintLine(ln);

            return (
              <tr key={ln.id}>
                <td>
                  <select
                    className="select"
                    value={ln.itemId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      const nextItem = EstimateTool.getItemById(nextId);
                      const base = nextItem?.pricePerSqFt ?? 0;
                      const defaultMarkup = 40;
                      const nextSell = EstimateTool.round2(base * (1 + defaultMarkup / 100));

                      onUpdate(ln.id, {
                        itemId: nextId,
                        overrideCostPerSqFt: "",
                        sellPricePerSqFt: nextSell,
                      });
                    }}
                  >
                    {EstimateTool.CATALOG.categories.map((cat) => (
                      <optgroup key={cat.id} label={cat.name}>
                        {cat.items.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <div className="mini">{c.item?.notes || ""}</div>
                </td>

                <td>
                  <input
                    className="input"
                    placeholder="Optional (grommets, hemming, hardware, etc.)"
                    value={ln.desc}
                    onChange={(e) => onUpdate(ln.id, { desc: e.target.value })}
                  />
                </td>

                <td>
                  <input className="input" type="number" value={ln.width} onChange={(e) => onUpdate(ln.id, { width: e.target.value })} />
                </td>

                <td>
                  <input className="input" type="number" value={ln.height} onChange={(e) => onUpdate(ln.id, { height: e.target.value })} />
                </td>

                <td>
                  <select className="select" value={ln.unit} onChange={(e) => onUpdate(ln.id, { unit: e.target.value })}>
                    <option value="in">in</option>
                    <option value="ft">ft</option>
                  </select>
                </td>

                <td>
                  <input className="input" type="number" value={ln.qty} onChange={(e) => onUpdate(ln.id, { qty: e.target.value })} />
                </td>

                <td>
                  <select className="select" value={ln.sides} onChange={(e) => onUpdate(ln.id, { sides: e.target.value })}>
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                  </select>
                </td>

                <td>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    value={ln.overrideCostPerSqFt}
                    onChange={(e) => onUpdate(ln.id, { overrideCostPerSqFt: e.target.value })}
                    placeholder={String(c.item?.pricePerSqFt ?? 0)}
                  />
                </td>

                <td>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    value={ln.sellPricePerSqFt ?? ""}
                    onChange={(e) => onUpdate(ln.id, { sellPricePerSqFt: e.target.value })}
                  />
                  <div className="mini">Customer rate</div>
                </td>

                <td>
                  <div className="mono">{EstimateTool.pct(c.markupPct)}</div>
                  <div className="mini">Margin: {EstimateTool.pct(c.marginPct)}</div>
                </td>

                <td>
                  <div className="mono">{EstimateTool.round2(c.sqftTotal)} sqft</div>
                  <div className="mini">{EstimateTool.round2(c.sqftEach)} sqft each</div>
                </td>

                <td>
                  <div className="mono">{EstimateTool.money(c.cost)}</div>
                  <div className="mini">Profit: {EstimateTool.money(c.profit)}</div>
                </td>

                <td>
                  <div className="mono">{EstimateTool.money(c.price)}</div>
                </td>

                <td>
                  <button className="btn danger" onClick={() => onRemove(ln.id)} disabled={printLines.length <= 1}>
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SectionHourly({
  kindLabel,
  lines,
  onRemove,
  onUpdate,
  showInstallSqFt,
  installSqFt,
  setInstallSqFt,
  costPerSqFt,
  billPerSqFt,
}) {
  return (
    <div>
      {showInstallSqFt ? (
        <>
          <div className="row" style={{ marginBottom: 12 }}>
            <div className="field" style={{ minWidth: 220, flex: "0 0 260px" }}>
              <div className="label">Install Sq Ft (for $/sqft breakdown)</div>
              <input
                className="input"
                type="number"
                value={installSqFt}
                onChange={(e) => setInstallSqFt(e.target.value)}
                placeholder="e.g., 500"
              />
            </div>

            <div className="field" style={{ minWidth: 220, flex: "0 0 260px" }}>
              <div className="label">Labor Cost / Sq Ft</div>
              <input className="input" value={installSqFt > 0 ? `$${costPerSqFt}/sqft` : "—"} readOnly />
            </div>

            <div className="field" style={{ minWidth: 220, flex: "0 0 260px" }}>
              <div className="label">Labor Bill / Sq Ft</div>
              <input className="input" value={installSqFt > 0 ? `$${billPerSqFt}/sqft` : "—"} readOnly />
            </div>
          </div>
        </>
      ) : null}

      <div className="table-wrap">
        <table style={{ minWidth: 920 }}>
          <thead>
            <tr>
              <th style={{ width: 200 }}>Name</th>
              <th style={{ width: 200 }}>Role</th>
              <th style={{ width: 140 }}>Pay / hr</th>
              <th style={{ width: 140 }}>Bill / hr</th>
              <th style={{ width: 120 }}>Hours</th>
              <th style={{ width: 150 }}>Expense</th>
              <th style={{ width: 150 }}>Revenue</th>
              <th style={{ width: 90 }}></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((ln) => {
              const c = EstimateTool.calcHourlyRow(ln);
              return (
                <tr key={ln.id}>
                  <td><input className="input" value={ln.name} onChange={(e) => onUpdate(ln.id, { name: e.target.value })} /></td>
                  <td><input className="input" value={ln.role} onChange={(e) => onUpdate(ln.id, { role: e.target.value })} /></td>
                  <td><input className="input" type="number" step="0.5" value={ln.payPerHr} onChange={(e) => onUpdate(ln.id, { payPerHr: e.target.value })} /></td>
                  <td><input className="input" type="number" step="0.5" value={ln.billPerHr} onChange={(e) => onUpdate(ln.id, { billPerHr: e.target.value })} /></td>
                  <td><input className="input" type="number" step="0.25" value={ln.hours} onChange={(e) => onUpdate(ln.id, { hours: e.target.value })} /></td>

                  <td>
                    <div className="mono">{EstimateTool.money(c.cost)}</div>
                    <div className="mini">Profit: {EstimateTool.money(c.profit)}</div>
                  </td>

                  <td>
                    <div className="mono">{EstimateTool.money(c.price)}</div>
                    <div className="mini">Margin: {EstimateTool.pct(c.marginPct)}</div>
                  </td>

                  <td>
                    <button className="btn danger" onClick={() => onRemove(ln.id)} disabled={lines.length <= 1}>
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      
    </div>
  );
}

function SectionQuote({ quoteInfo, setQuoteInfo, onGeneratePdf }) {
  function patch(p) {
    setQuoteInfo((prev) => ({ ...prev, ...p }));
  }

  return (
    <div>
      <div className="right-actions">
        <div>
          <div className="card-title">Quote (Customer-Facing)</div>
          <div className="small">Fill customer details, then generate a PDF quote.</div>
        </div>
        <div className="btn-row">
          <button className="btn primary" onClick={onGeneratePdf}>Generate PDF</button>
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div className="row">
        <div className="field">
          <div className="label">Client Name</div>
          <input className="input" value={quoteInfo.clientName} onChange={(e) => patch({ clientName: e.target.value })} />
        </div>
        <div className="field">
          <div className="label">Company</div>
          <input className="input" value={quoteInfo.company} onChange={(e) => patch({ company: e.target.value })} />
        </div>
      </div>

      <div style={{ height: 10 }} />

      <div className="row">
        <div className="field">
          <div className="label">Email</div>
          <input className="input" value={quoteInfo.email} onChange={(e) => patch({ email: e.target.value })} />
        </div>
        <div className="field">
          <div className="label">Phone</div>
          <input className="input" value={quoteInfo.phone} onChange={(e) => patch({ phone: e.target.value })} />
        </div>
      </div>

      <div style={{ height: 10 }} />

      <div className="row">
        <div className="field">
          <div className="label">Project Name</div>
          <input className="input" value={quoteInfo.projectName} onChange={(e) => patch({ projectName: e.target.value })} />
        </div>
        <div className="field">
          <div className="label">Quote #</div>
          <input className="input" value={quoteInfo.quoteNumber} onChange={(e) => patch({ quoteNumber: e.target.value })} />
        </div>
        <div className="field" style={{ minWidth: 140, flex: "0 0 180px" }}>
          <div className="label">Valid (days)</div>
          <input className="input" type="number" value={quoteInfo.validDays} onChange={(e) => patch({ validDays: e.target.value })} />
        </div>
      </div>

      <div style={{ height: 10 }} />

      <div className="field">
        <div className="label">Notes (optional)</div>
        <textarea
          className="textarea"
          value={quoteInfo.notes}
          onChange={(e) => patch({ notes: e.target.value })}
          placeholder="Lead times, exclusions, install constraints, warranty notes, etc."
        />
      </div>
    </div>
  );
}

function KPIPanel({ printTotals, laborTotals, designTotals, grandTotals, installSqFt, laborCostPerSqFt, laborBillPerSqFt }) {
  const profitClass = grandTotals.profit >= 0 ? "good" : "bad";
  const marginClass = grandTotals.marginPct >= 0 ? "good" : "bad";

  return (
    <div className="kpi">
      <div className="kpi-head">Summary</div>
      <div className="kpi-body">
        <div className="kpi-grid">
          <div className="kpi-box">
            <div className="kpi-label">Print — Revenue</div>
            <div className="kpi-value">{EstimateTool.money(printTotals.price)}</div>
            <div className="small">Expense: {EstimateTool.money(printTotals.cost)} • Profit: {EstimateTool.money(printTotals.profit)}</div>
          </div>

          <div className="kpi-box">
            <div className="kpi-label">Print — Area</div>
            <div className="kpi-value">{printTotals.sqftTotal} sqft</div>
            <div className="small">Print margin: {EstimateTool.pct(printTotals.marginPct)}</div>
          </div>

          <div className="kpi-box">
            <div className="kpi-label">Labor — Revenue</div>
            <div className="kpi-value">{EstimateTool.money(laborTotals.price)}</div>
            <div className="small">Expense: {EstimateTool.money(laborTotals.cost)} • Profit: {EstimateTool.money(laborTotals.profit)}</div>
          </div>

          <div className="kpi-box">
            <div className="kpi-label">Labor — $/sqft</div>
            <div className="kpi-value">{installSqFt > 0 ? `$${laborCostPerSqFt}` : "—"}</div>
            <div className="small">{installSqFt > 0 ? `Billed: $${laborBillPerSqFt}/sqft` : "Enter Install Sq Ft to compute."}</div>
          </div>

          <div className="kpi-box">
            <div className="kpi-label">Design — Revenue</div>
            <div className="kpi-value">{EstimateTool.money(designTotals.price)}</div>
            <div className="small">Cost: {EstimateTool.money(designTotals.cost)} • Profit: {EstimateTool.money(designTotals.profit)}</div>
          </div>

          <div className="kpi-box">
            <div className="kpi-label">Design — Hours</div>
            <div className="kpi-value">{designTotals.hours}</div>
            <div className="small">Design margin: {EstimateTool.pct(designTotals.marginPct)}</div>
          </div>

          <div className="kpi-box" style={{ gridColumn: "1 / -1" }}>
            <div className="kpi-label">Grand Total — Revenue</div>
            <div className={`kpi-value ${profitClass}`}>{EstimateTool.money(grandTotals.price)}</div>
            <div className="small">
              Total Expense: {EstimateTool.money(grandTotals.cost)} • Profit:{" "}
              <span className={profitClass}>{EstimateTool.money(grandTotals.profit)}</span> • Margin:{" "}
              <span className={marginClass}>{EstimateTool.pct(grandTotals.marginPct)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
