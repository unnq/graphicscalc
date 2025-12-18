// js/estimateTool.js
// Cost catalog + pure calculation helpers.
// Keep business logic here so app.js stays clean.

const EstimateTool = (() => {
  // ---- 1) YOUR COST BASIS (edit this) ------------------------------------
  // pricePerSqFt = your COST per sq ft (expense)
  // setupFee = flat cost per line item (optional)
  // notes can explain constraints to reps
  const CATALOG = {
    categories: [
      {
        id: "banners",
        name: "Banners",
        items: [
          { id: "banner_13oz", name: "13oz Banner", unit: "sqft", pricePerSqFt: 2.15, setupFee: 5, notes: "Standard banner stock" },
          { id: "banner_mesh_7030", name: "70/30 Mesh Banner", unit: "sqft", pricePerSqFt: 2.65, setupFee: 6, notes: "Wind-permeable mesh" },
          { id: "banner_double_sided", name: "Double-Sided Banner", unit: "sqft", pricePerSqFt: 4.35, setupFee: 10, notes: "Blockout + double print" },
        ],
      },
      {
        id: "vinyl",
        name: "Vinyl (Window/Wall)",
        items: [
          { id: "vinyl_calendered", name: "Calendered Vinyl", unit: "sqft", pricePerSqFt: 1.85, setupFee: 8, notes: "Shorter-term" },
          { id: "vinyl_cast", name: "Cast Vinyl", unit: "sqft", pricePerSqFt: 2.95, setupFee: 10, notes: "Premium / longer-term" },
          { id: "laminate_addon", name: "Laminate Add-On", unit: "sqft", pricePerSqFt: 0.90, setupFee: 0, notes: "Add laminate cost if used" },
        ],
      },
      {
        id: "flags",
        name: "Flags",
        items: [
          { id: "flag_single_sided", name: "Flag (Single-Sided)", unit: "sqft", pricePerSqFt: 3.25, setupFee: 8, notes: "Includes hemming baseline" },
          { id: "flag_double_sided", name: "Flag (Double-Sided)", unit: "sqft", pricePerSqFt: 5.95, setupFee: 12, notes: "Heavier labor/material" },
        ],
      },
      {
        id: "misc",
        name: "Misc",
        items: [
          { id: "coroplast", name: "Coroplast Signs", unit: "sqft", pricePerSqFt: 2.40, setupFee: 6, notes: "Does not include stakes/hardware" },
          { id: "aluminum", name: "Aluminum Composite Panel", unit: "sqft", pricePerSqFt: 6.75, setupFee: 15, notes: "ACP / Dibond style" },
        ],
      },
    ],
  };

  function flattenCatalog(catalog) {
    const out = [];
    for (const cat of catalog.categories) {
      for (const it of cat.items) out.push({ ...it, categoryId: cat.id, categoryName: cat.name });
    }
    return out;
  }

  const FLAT_ITEMS = flattenCatalog(CATALOG);

  function getItemById(itemId) {
    return FLAT_ITEMS.find((x) => x.id === itemId) || null;
  }

  // ---- 2) UTILITIES -------------------------------------------------------
  function toNumber(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  function money(n) {
    const v = toNumber(n, 0);
    return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
  }

  function pct(n) {
    const v = toNumber(n, 0);
    return `${round2(v)}%`;
  }

  // Convert width/height to square feet.
  // unit: "in" | "ft"
  function calcSqFt(width, height, unit) {
    const w = toNumber(width, 0);
    const h = toNumber(height, 0);
    if (w <= 0 || h <= 0) return 0;

    if (unit === "in") {
      // (in * in) / 144 = sqft
      return (w * h) / 144;
    }
    // feet
    return w * h;
  }

  // ---- 3) PRINT LINE CALCS ------------------------------------------------
  // line shape:
  // { itemId, desc, width, height, unit, qty, sides, markupPct, overrideCostPerSqFt? }
  function calcPrintLine(line) {
    const item = getItemById(line.itemId);
    const qty = clamp(toNumber(line.qty, 1), 0, 999999);
    const sides = clamp(toNumber(line.sides, 1), 1, 2);
    const markupPct = toNumber(line.markupPct, 0);

    const sqftEach = calcSqFt(line.width, line.height, line.unit);
    const sqftTotal = sqftEach * qty * sides;

    const baseCostPerSqFt =
      line.overrideCostPerSqFt !== undefined && line.overrideCostPerSqFt !== "" && line.overrideCostPerSqFt !== null
        ? toNumber(line.overrideCostPerSqFt, 0)
        : (item?.pricePerSqFt ?? 0);

    const setupFee = item?.setupFee ?? 0;

    const cost = (sqftTotal * baseCostPerSqFt) + setupFee;
    const price = cost * (1 + markupPct / 100);
    const profit = price - cost;
    const marginPct = price > 0 ? (profit / price) * 100 : 0;

    return {
      item,
      sqftEach,
      sqftTotal,
      baseCostPerSqFt,
      setupFee,
      cost: round2(cost),
      price: round2(price),
      profit: round2(profit),
      marginPct: round2(marginPct),
    };
  }

  function calcPrintTotals(lines) {
    let sqftTotal = 0;
    let cost = 0;
    let price = 0;

    for (const ln of lines) {
      const c = calcPrintLine(ln);
      sqftTotal += c.sqftTotal;
      cost += c.cost;
      price += c.price;
    }

    const profit = price - cost;
    const marginPct = price > 0 ? (profit / price) * 100 : 0;

    return {
      sqftTotal: round2(sqftTotal),
      cost: round2(cost),
      price: round2(price),
      profit: round2(profit),
      marginPct: round2(marginPct),
    };
  }

  // ---- 4) LABOR CALCS -----------------------------------------------------
  // labor line:
  // { name, role, payPerHr, billPerHr, hours }
  function calcLaborLine(line) {
    const pay = toNumber(line.payPerHr, 0);
    const bill = toNumber(line.billPerHr, 0);
    const hours = clamp(toNumber(line.hours, 0), 0, 999999);

    const cost = pay * hours;
    const price = bill * hours;
    const profit = price - cost;
    const marginPct = price > 0 ? (profit / price) * 100 : 0;

    return {
      cost: round2(cost),
      price: round2(price),
      profit: round2(profit),
      marginPct: round2(marginPct),
      hours: round2(hours),
    };
  }

  function calcLaborTotals(lines) {
    let cost = 0;
    let price = 0;
    let hours = 0;

    for (const ln of lines) {
      const c = calcLaborLine(ln);
      cost += c.cost;
      price += c.price;
      hours += c.hours;
    }

    const profit = price - cost;
    const marginPct = price > 0 ? (profit / price) * 100 : 0;

    return {
      cost: round2(cost),
      price: round2(price),
      profit: round2(profit),
      marginPct: round2(marginPct),
      hours: round2(hours),
    };
  }

  // ---- 5) GRAND TOTALS ----------------------------------------------------
  function calcGrandTotals(printTotals, laborTotals) {
    const cost = toNumber(printTotals.cost) + toNumber(laborTotals.cost);
    const price = toNumber(printTotals.price) + toNumber(laborTotals.price);
    const profit = price - cost;
    const marginPct = price > 0 ? (profit / price) * 100 : 0;

    return {
      cost: round2(cost),
      price: round2(price),
      profit: round2(profit),
      marginPct: round2(marginPct),
    };
  }

  return {
    CATALOG,
    FLAT_ITEMS,
    getItemById,

    toNumber,
    round2,
    money,
    pct,

    calcSqFt,
    calcPrintLine,
    calcPrintTotals,

    calcLaborLine,
    calcLaborTotals,

    calcGrandTotals,
  };
})();
