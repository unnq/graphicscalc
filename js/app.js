// js/app.js
const { useMemo, useEffect, useState } = React;

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

const STORAGE_KEY = "cgg_estimator_v1";

function defaultPrintLine() {
  return {
    id: uid("pl"),
    itemId: "banner_13oz",
    desc: "",
    width: 48,
    height: 24,
    unit: "in",     // "in" | "ft"
    qty: 1,
    sides: 1,       // 1 or 2
    markupPct: 40,  // default markup
    overrideCostPerSqFt: "", // optional override
  };
}

function defaultLaborLine() {
  return {
    id: uid("lb"),
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
  } catch {
    // ignore
  }
}

function App() {
  const saved = loadState();

  const [activeTab, setActiveTab] = useState(saved?.activeTab || "estimate");

  const [printLines, setPrintLines] = useState(saved?.printLines?.length ? saved.printLines : [defaultPrintLine()]);
  const [laborLines, setLaborLines] = useState(saved?.laborLines?.length ? saved.laborLines : [defaultLaborLine()]);

  const [installSqFt, setInstallSqFt] = useState(saved?.installSqFt ?? 0);

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

  // persist
  useEffect(() => {
    saveState({ activeTab, printLines, laborLines, installSqFt, quoteInfo });
  }, [activeTab, printLines, laborLines, installSqFt, quoteInfo]);

  const printTotals = useMemo(() => EstimateTool.calcPrintTotals(printLines), [printLines]);
  const laborTotals = useMemo(() => EstimateTool.calcLaborTotals(laborLines), [laborLines]);
  const grandTotals = useMemo(() => EstimateTool.calcGrandTotals(printTotals, laborTotals), [printTotals, laborTotals]);

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

  function updateLaborLine(id, patch) {
    setLaborLines((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  function addLaborLine() {
    setLaborLines((prev) => [...prev, defaultLaborLine()]);
  }

  function removeLaborLine(id) {
    setLaborLines((prev) => prev.filter((x) => x.id !== id));
  }

  function resetAll() {
    setPrintLines([defaultPrintLine()]);
    setLaborLines([defaultLaborLine()]);
    setInstallSqFt(0);
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

    const title = "Quote";
    const brand = "Coastal Graphics Group";

    const qNum = (quoteInfo.quoteNumber || "").trim();
    const today = new Date();
    const dateStr = today.toLocaleDateString();

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(brand, margin, 54);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(title, margin, 74);

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

    // Line items table (customer-facing: show qty, dimensions, sqft, price)
    const rows = printLines.map((ln) => {
      const c = EstimateTool.calcPrintLine(ln);
      const itemName = c.item?.name || "Item";
      const dim = `${EstimateTool.round2(EstimateTool.toNumber(ln.width))} x ${EstimateTool.round2(
        EstimateTool.toNumber(ln.height)
      )} ${ln.unit}`;
      const qty = `${ln.qty} (x${ln.sides} side)`;
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
      body: rows,
      styles: { font: "helvetica", fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [245, 245, 245], textColor: 20 },
      margin: { left: margin, right: margin },
      columnStyles: {
        5: { halign: "right" },
      },
    });

    // Totals
    const afterTableY = doc.lastAutoTable.finalY + 16;

    const subtotal = printTotals.price;
    const labor = laborTotals.price;
    const grand = grandTotals.price;

    doc.setFont("helvetica", "bold");
    doc.text("Totals", pageWidth - margin, afterTableY, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.text(`Print Subtotal: ${EstimateTool.money(subtotal)}`, pageWidth - margin, afterTableY + 16, { align: "right" });
    doc.text(`Labor: ${EstimateTool.money(labor)}`, pageWidth - margin, afterTableY + 32, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.text(`Total: ${EstimateTool.money(grand)}`, pageWidth - margin, afterTableY + 52, { align: "right" });

    doc.setFont("helvetica", "normal");
    const validDays = EstimateTool.toNumber(quoteInfo.validDays, 14);
    doc.setFontSize(9);
    doc.text(`Valid for ${validDays} days.`, margin, afterTableY + 52);

    if ((quoteInfo.notes || "").trim()) {
      doc.setFontSize(9);
      doc.text("Notes:", margin, afterTableY + 76);
      doc.setFont("helvetica", "normal");
      const wrapped = doc.splitTextToSize(quoteInfo.notes.trim(), pageWidth - margin * 2);
      doc.text(wrapped, margin, afterTableY + 92);
    }

    const filename = `Quote${qNum ? `-${qNum}` : ""}-${today.toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="right-actions">
          <div>
            <div className="card-title">Estimator</div>
            <div className="card-subtitle">
              Add print line items + labor. Markup is applied per line. Quote tab generates a presentable PDF.
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
                <SectionPrintLines
                  printLines={printLines}
                  onAdd={addPrintLine}
                  onRemove={removePrintLine}
                  onUpdate={updatePrintLine}
                />

                <div className="hr"></div>

                <SectionLabor
                  laborLines={laborLines}
                  onAdd={addLaborLine}
                  onRemove={removeLaborLine}
                  onUpdate={updateLaborLine}
                  installSqFt={installSqFt}
                  setInstallSqFt={setInstallSqFt}
                  laborCostPerSqFt={laborCostPerSqFt}
                  laborBillPerSqFt={laborBillPerSqFt}
                />
              </>
            ) : (
              <SectionQuote
                quoteInfo={quoteInfo}
                setQuoteInfo={setQuoteInfo}
                onGeneratePdf={generatePdfQuote}
              />
            )}
          </div>

          <div>
            <KPIPanel
              printTotals={printTotals}
              laborTotals={laborTotals}
              grandTotals={grandTotals}
              installSqFt={installSqFt}
              laborCostPerSqFt={laborCostPerSqFt}
              laborBillPerSqFt={laborBillPerSqFt}
            />

            <div className="hr"></div>

            <div className="note">
              Edit your cost basis in <span className="badge">js/estimateTool.js</span> under <span className="badge">CATALOG</span>.
              <br />
              This version is intentionally “simple and extendable” so you can add: shipping, tax, design fees, minimums, vendor margin rules, etc.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionPrintLines({ printLines, onAdd, onRemove, onUpdate }) {
  return (
    <div>
      <div className="right-actions">
        <div>
          <div className="card-title">Print Line Items</div>
          <div className="small">Dimensions → sqft → cost basis → markup → customer price.</div>
        </div>
        <div className="btn-row">
          <button className="btn primary" onClick={onAdd}>Add Line</button>
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 220 }}>Item</th>
              <th style={{ width: 220 }}>Notes (internal)</th>
              <th style={{ width: 110 }}>W</th>
              <th style={{ width: 110 }}>H</th>
              <th style={{ width: 90 }}>Unit</th>
              <th style={{ width: 90 }}>Qty</th>
              <th style={{ width: 90 }}>Sides</th>
              <th style={{ width: 130 }}>Cost / sqft</th>
              <th style={{ width: 110 }}>Markup %</th>
              <th style={{ width: 120 }}>Sq Ft</th>
              <th style={{ width: 140 }}>Your Cost</th>
              <th style={{ width: 140 }}>Customer</th>
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
                      onChange={(e) =>
                        onUpdate(ln.id, {
                          itemId: e.target.value,
                          overrideCostPerSqFt: "", // clear override so base reflects the selected item
                        })
                      }
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
                      placeholder="Optional (e.g., grommets, hemming, hardware...)"
                      value={ln.desc}
                      onChange={(e) => onUpdate(ln.id, { desc: e.target.value })}
                    />
                    {c.setupFee > 0 ? <div className="mini">Includes setup: {EstimateTool.money(c.setupFee)}</div> : <div className="mini"> </div>}
                  </td>

                  <td>
                    <input
                      className="input"
                      type="number"
                      value={ln.width}
                      onChange={(e) => onUpdate(ln.id, { width: e.target.value })}
                    />
                  </td>

                  <td>
                    <input
                      className="input"
                      type="number"
                      value={ln.height}
                      onChange={(e) => onUpdate(ln.id, { height: e.target.value })}
                    />
                  </td>

                  <td>
                    <select
                      className="select"
                      value={ln.unit}
                      onChange={(e) => onUpdate(ln.id, { unit: e.target.value })}
                    >
                      <option value="in">in</option>
                      <option value="ft">ft</option>
                    </select>
                  </td>

                  <td>
                    <input
                      className="input"
                      type="number"
                      value={ln.qty}
                      onChange={(e) => onUpdate(ln.id, { qty: e.target.value })}
                    />
                  </td>

                  <td>
                    <select
                      className="select"
                      value={ln.sides}
                      onChange={(e) => onUpdate(ln.id, { sides: e.target.value })}
                    >
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                    </select>
                  </td>

                  <td>
                    <input
                      className="input"
                      type="number"
                      step="0.01"
                      placeholder={String(c.baseCostPerSqFt)}
                      value={ln.overrideCostPerSqFt}
                      onChange={(e) => onUpdate(ln.id, { overrideCostPerSqFt: e.target.value })}
                    />
                    <div className="mini">
                      Base: {EstimateTool.money(c.item?.pricePerSqFt ?? 0)}/sqft
                    </div>

                  </td>

                  <td>
                    <input
                      className="input"
                      type="number"
                      step="0.1"
                      value={ln.markupPct}
                      onChange={(e) => onUpdate(ln.id, { markupPct: e.target.value })}
                    />
                  </td>

                  <td>
                    <div className="mono">{EstimateTool.round2(c.sqftTotal)}</div>
                    <div className="mini">{EstimateTool.round2(c.sqftEach)} per</div>
                  </td>

                  <td>
                    <div className="mono">{EstimateTool.money(c.cost)}</div>
                    <div className="mini">Profit: {EstimateTool.money(c.profit)}</div>
                  </td>

                  <td>
                    <div className="mono">{EstimateTool.money(c.price)}</div>
                    <div className="mini">Margin: {EstimateTool.pct(c.marginPct)}</div>
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
    </div>
  );
}

function SectionLabor({
  laborLines,
  onAdd,
  onRemove,
  onUpdate,
  installSqFt,
  setInstallSqFt,
  laborCostPerSqFt,
  laborBillPerSqFt,
}) {
  return (
    <div>
      <div className="right-actions">
        <div>
          <div className="card-title">Labor</div>
          <div className="small">Track pay vs bill rates per laborer, and quantify labor $/sqft.</div>
        </div>
        <div className="btn-row">
          <button className="btn primary" onClick={onAdd}>Add Laborer</button>
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div className="row">
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
          <input className="input" value={installSqFt > 0 ? `$${laborCostPerSqFt}/sqft` : "—"} readOnly />
        </div>

        <div className="field" style={{ minWidth: 220, flex: "0 0 260px" }}>
          <div className="label">Labor Bill / Sq Ft</div>
          <input className="input" value={installSqFt > 0 ? `$${laborBillPerSqFt}/sqft` : "—"} readOnly />
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div className="table-wrap">
        <table style={{ minWidth: 920 }}>
          <thead>
            <tr>
              <th style={{ width: 200 }}>Name</th>
              <th style={{ width: 200 }}>Role</th>
              <th style={{ width: 140 }}>Pay / hr</th>
              <th style={{ width: 140 }}>Bill / hr</th>
              <th style={{ width: 120 }}>Hours</th>
              <th style={{ width: 150 }}>Your Cost</th>
              <th style={{ width: 150 }}>Customer</th>
              <th style={{ width: 90 }}></th>
            </tr>
          </thead>
          <tbody>
            {laborLines.map((ln) => {
              const c = EstimateTool.calcLaborLine(ln);
              return (
                <tr key={ln.id}>
                  <td>
                    <input className="input" value={ln.name} onChange={(e) => onUpdate(ln.id, { name: e.target.value })} />
                  </td>
                  <td>
                    <input className="input" value={ln.role} onChange={(e) => onUpdate(ln.id, { role: e.target.value })} />
                  </td>
                  <td>
                    <input
                      className="input"
                      type="number"
                      step="0.5"
                      value={ln.payPerHr}
                      onChange={(e) => onUpdate(ln.id, { payPerHr: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="input"
                      type="number"
                      step="0.5"
                      value={ln.billPerHr}
                      onChange={(e) => onUpdate(ln.id, { billPerHr: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="input"
                      type="number"
                      step="0.25"
                      value={ln.hours}
                      onChange={(e) => onUpdate(ln.id, { hours: e.target.value })}
                    />
                  </td>
                  <td>
                    <div className="mono">{EstimateTool.money(c.cost)}</div>
                    <div className="mini">Profit: {EstimateTool.money(c.profit)}</div>
                  </td>
                  <td>
                    <div className="mono">{EstimateTool.money(c.price)}</div>
                    <div className="mini">Margin: {EstimateTool.pct(c.marginPct)}</div>
                  </td>
                  <td>
                    <button className="btn danger" onClick={() => onRemove(ln.id)} disabled={laborLines.length <= 1}>
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
          <div className="small">Fill customer details, then generate a PDF quote from the same line items + labor.</div>
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
          <input
            className="input"
            type="number"
            value={quoteInfo.validDays}
            onChange={(e) => patch({ validDays: e.target.value })}
          />
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

      <div className="hr"></div>

      <div className="note">
        The PDF includes: customer block, line item table, totals (print + labor), and notes.
      </div>
    </div>
  );
}

function KPIPanel({ printTotals, laborTotals, grandTotals, installSqFt, laborCostPerSqFt, laborBillPerSqFt }) {
  const profitClass = grandTotals.profit >= 0 ? "good" : "bad";
  const marginClass = grandTotals.marginPct >= 0 ? "good" : "bad";

  return (
    <div className="kpi">
      <div className="kpi-head">Summary</div>
      <div className="kpi-body">
        <div className="kpi-grid">
          <div className="kpi-box">
            <div className="kpi-label">Print — Customer</div>
            <div className="kpi-value">{EstimateTool.money(printTotals.price)}</div>
            <div className="small">Cost: {EstimateTool.money(printTotals.cost)} • Profit: {EstimateTool.money(printTotals.profit)}</div>
          </div>
          <div className="kpi-box">
            <div className="kpi-label">Print — Area</div>
            <div className="kpi-value">{printTotals.sqftTotal} sqft</div>
            <div className="small">Print margin: {EstimateTool.pct(printTotals.marginPct)}</div>
          </div>

          <div className="kpi-box">
            <div className="kpi-label">Labor — Customer</div>
            <div className="kpi-value">{EstimateTool.money(laborTotals.price)}</div>
            <div className="small">Cost: {EstimateTool.money(laborTotals.cost)} • Profit: {EstimateTool.money(laborTotals.profit)}</div>
          </div>
          <div className="kpi-box">
            <div className="kpi-label">Labor — $/sqft</div>
            <div className="kpi-value">{installSqFt > 0 ? `$${laborCostPerSqFt}` : "—"}</div>
            <div className="small">{installSqFt > 0 ? `Billed: $${laborBillPerSqFt}/sqft` : "Enter Install Sq Ft to compute."}</div>
          </div>

          <div className="kpi-box" style={{ gridColumn: "1 / -1" }}>
            <div className="kpi-label">Grand Total — Customer</div>
            <div className={`kpi-value ${profitClass}`}>{EstimateTool.money(grandTotals.price)}</div>
            <div className="small">
              Total Cost: {EstimateTool.money(grandTotals.cost)} • Profit:{" "}
              <span className={profitClass}>{EstimateTool.money(grandTotals.profit)}</span> • Margin:{" "}
              <span className={marginClass}>{EstimateTool.pct(grandTotals.marginPct)}</span>
            </div>
          </div>
        </div>

        <div className="hr"></div>
        <div className="note">
          Recommendation: if you end up billing install “per sqft”, set labor bill rates to align with your target install $/sqft.
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
