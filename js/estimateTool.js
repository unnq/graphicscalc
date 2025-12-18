// js/estimateTool.js
// Cost catalog + pure calculation helpers.
// Business logic stays here so app.js stays clean.

const EstimateTool = (() => {
  // ---- 1) YOUR COST BASIS (from your sheet; orange column = what you pay vendor) ----
  // pricePerSqFt = your COST per sq ft (expense)
  // installPricePerSqFt = optional reference rate from your sheet (NOT used automatically yet)
  // sku = your part number
  const CATALOG = {
    categories: [
      {
        id: "pvc_vinyl",
        name: "PVC Vinyl",
        items: [
          { id: "mesh_7030", sku: "MESH7030126", name: "70/30 Mesh", unit: "sqft", pricePerSqFt: 4.25, installPricePerSqFt: 3.0, setupFee: 0, notes: "" },
          { id: "banner_13oz", sku: "MBV13126", name: "13 oz Banner", unit: "sqft", pricePerSqFt: 4.25, installPricePerSqFt: 3.0, setupFee: 0, notes: "" },
          { id: "banner_18oz_double_sided", sku: "BO18OZ126", name: "18oz Double Sided Banner", unit: "sqft", pricePerSqFt: 7.23, installPricePerSqFt: 5.0, setupFee: 0, notes: "" },
        ],
      },
      {
        id: "adhesive_backed_vinyl",
        name: "Adhesive Backed Vinyl",
        items: [
          { id: "standard_decal_matte_lam", sku: "C4ABV60", name: "Standard Decal with Matte Lam", unit: "sqft", pricePerSqFt: 5.10, installPricePerSqFt: 3.0, setupFee: 0, notes: "" },
          { id: "gf_matte_lam", sku: "GFABV54", name: "General Formulations With Matte Lam", unit: "sqft", pricePerSqFt: 5.95, installPricePerSqFt: 3.0, setupFee: 0, notes: "" },
          { id: "window_perf", sku: "WP703054", name: "Window Perf", unit: "sqft", pricePerSqFt: 6.80, installPricePerSqFt: 3.5, setupFee: 0, notes: "" },
          { id: "3m_ij180_8520_lam", sku: "IJ180C", name: "3M-IJ180 with 8520 Lam", unit: "sqft", pricePerSqFt: 7.23, installPricePerSqFt: 3.5, setupFee: 0, notes: "" },
          { id: "multigrip", sku: "MG48", name: "Multigrip", unit: "sqft", pricePerSqFt: 7.65, installPricePerSqFt: 4.0, setupFee: 0, notes: "" },
          { id: "brick_adhesive_with_lam", sku: "SG852454", name: "Brick Adhesive Vinyl with Lam", unit: "sqft", pricePerSqFt: 9.35, installPricePerSqFt: 6.0, setupFee: 0, notes: "" },
          { id: "dusted_crystal", sku: "DC772531448", name: "Dusted Crystal", unit: "sqft", pricePerSqFt: 10.20, installPricePerSqFt: 6.0, setupFee: 0, notes: "" },
          { id: "optically_clear_glass", sku: "GAOPT154", name: "Optically Clear Glass Material", unit: "sqft", pricePerSqFt: 11.90, installPricePerSqFt: 6.0, setupFee: 0, notes: "" },
        ],
      },
      {
        id: "rigid_board",
        name: "Rigid Board",
        items: [
          { id: "coroplast", sku: "CORO4896", name: "Coroplast", unit: "sqft", pricePerSqFt: 5.10, installPricePerSqFt: null, setupFee: 0, notes: "" },
          { id: "styrene_060", sku: "STY0604896", name: ".060 Styrene", unit: "sqft", pricePerSqFt: 5.95, installPricePerSqFt: null, setupFee: 0, notes: "" },
          { id: "pvc_2mm_poster_program", sku: "PVC2MMW", name: '2MM PVC (Poster Program / 22" x 28")', unit: "sqft", pricePerSqFt: 5.95, installPricePerSqFt: null, setupFee: 0, notes: "" },
          { id: "foamcore_3_16", sku: "FC316W4896", name: "3/16 Foamcore", unit: "sqft", pricePerSqFt: 7.65, installPricePerSqFt: null, setupFee: 0, notes: "" },
          { id: "pvc_3mm_white", sku: "3MMWPVC4896", name: "3MM PVC White", unit: "sqft", pricePerSqFt: 8.50, installPricePerSqFt: null, setupFee: 0, notes: "" },
          { id: "pvc_3mm_black", sku: "3MMBPVC4896", name: "3MM PVC Black", unit: "sqft", pricePerSqFt: 9.35, installPricePerSqFt: null, setupFee: 0, notes: "" },
          { id: "gatorboard_3_16_white", sku: "GB316W4896", name: "3/16 Gatorboard White", unit: "sqft", pricePerSqFt: 10.20, installPricePerSqFt: null, setupFee: 0, notes: "" },
          { id: "gatorboard_3_16_black", sku: "GB316B4896", name: "3/16 Gatorboard Black", unit: "sqft", pricePerSqFt: 11.26, installPricePerSqFt: null, setupFee: 0, notes: "" },
          { id: "pvc_6mm_white", sku: "6MMWPVC4896", name: "6MM PVC White", unit: "sqft", pricePerSqFt: 11.90, installPricePerSqFt: null, setupFee: 0, notes: "" },
          { id: "gatorboard_half_black", sku: "GB12W4896", name: "1/2 Gatorboard Black", unit: "sqft", pricePerSqFt: 11.90, installPricePerSqFt: null, setupFee: 0, notes: "" },
          { id: "diabond", sku: "DB3MMW4896", name: "Diabond", unit: "sqft", pricePerSqFt: 12.75, installPricePerSqFt: null, setupFee: 0, notes: "" },
          { id: "pvc_6mm_black", sku: "6MMBPVC4896", name: "6MM PVC Black", unit: "sqft", pricePerSqFt: 13.18, installPricePerSqFt: null, setupFee: 0, notes: "" },
          { id: "gatorboard_half_white", sku: "GB12B4896", name: "1/2 Gatorboard White", unit: "sqft", pricePerSqFt: 13.60, installPricePerSqFt: null, setupFee: 0, notes: "" },
        ],
      },
      {
        id: "backlit_film",
        name: "Backlit Film",
        items: [
          { id: "optilux_backlight_film", sku: "OPTIFLM54", name: "Optilux Backlight Film", unit: "sqft", pricePerSqFt: 6.80, installPricePerSqFt: 3.0, setupFee: 0, notes: "" },
        ],
      },
      {
        id: "dye_sublimated_fabric",
        name: "Dye Sublimated Fabric",
        items: [
          { id: "flag_fabric_ss", sku: "DSFLAGSS126", name: "Flag Fabric (SS Printing)", unit: "sqft", pricePerSqFt: 7.65, installPricePerSqFt: null, setupFee: 0, notes: "" },
          { id: "stretch_4_way", sku: "DS4WAY126", name: "4 Way Stretch", unit: "sqft", pricePerSqFt: 8.50, installPricePerSqFt: 4.0, setupFee: 0, notes: "" },
          { id: "black_back_fabric", sku: "DSBB126", name: "Black Back Fabric", unit: "sqft", pricePerSqFt: 8.50, installPricePerSqFt: 4.0, setupFee: 0, notes: "" },
          { id: "flag_fabric_ds", sku: "DSFLAGDS126", name: "Flag Fabric (DS Printing)", unit: "sqft", pricePerSqFt: 11.90, installPricePerSqFt: null, setupFee: 0, notes: "" },
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
