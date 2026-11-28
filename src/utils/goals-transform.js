// ── Shared Transformation: Labor Goals Targets to Venue View Data ─────────

export const MONTH_FULL_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function isAnnualPeriodKey(periodKey, year) {
  if (!periodKey) return false;
  const norm = String(periodKey).trim().toLowerCase();
  const yearStr = String(year);
  return norm === yearStr ||
         norm === `${yearStr}-fy` ||
         norm === 'full year' ||
         norm === 'annual' ||
         norm === 'fy';
}

export function transformTargetsToVenuesData(dbTargets = [], selectedYear = 2027) {
  if (!dbTargets || dbTargets.length === 0) {
    return [];
  }

  // Group rows by venueId
  const venueMap = new Map();
  for (const t of dbTargets) {
    if (!venueMap.has(t.venueId)) {
      const rawRegion = t.region ? String(t.region).trim() : '';
      const cleanRegion = rawRegion && rawRegion.toLowerCase() !== 'ungrouped' ? rawRegion : 'Ungrouped';
      venueMap.set(t.venueId, {
        id: t.venueId,
        name: t.venueName || t.venueId,
        region: cleanRegion,
        venueNumber: t.venueNumber || '',
        rows: []
      });
    }
    venueMap.get(t.venueId).rows.push(t);
  }

  return Array.from(venueMap.values()).map(v => {
    v.rows.sort((a, b) => a.periodKey.localeCompare(b.periodKey));

    // 1. Separate annual rows first so they never leak into monthly mapping
    const annualRow = v.rows.find(r => isAnnualPeriodKey(r.periodKey, selectedYear));
    const annualFOHTarget = annualRow?.fohTarget != null ? annualRow.fohTarget : null;
    const annualBOHTarget = annualRow?.bohTarget != null ? annualRow.bohTarget : null;

    // 2. Only accept valid monthly periods in monthly mapping (exact YYYY-MM matching selectedYear, months 01..12)
    const targetByMonth = {}; // monthNum (1..12) → row
    for (const t of v.rows) {
      if (isAnnualPeriodKey(t.periodKey, selectedYear)) {
        continue;
      }
      const match = String(t.periodKey || '').trim().match(/^(\d{4})-(0[1-9]|1[0-2])$/);
      if (match) {
        const rowYear = parseInt(match[1], 10);
        const monthNum = parseInt(match[2], 10);
        if (rowYear === selectedYear) {
          targetByMonth[monthNum] = t;
        }
      }
    }

    // ── Finance target rows (Table 2 — the annual plan) ─────────────────
    const monthlyFinanceRows = [];
    for (let m = 1; m <= 12; m++) {
      const t = targetByMonth[m];
      const foh = t?.fohTarget != null ? t.fohTarget : null;
      const boh = t?.bohTarget != null ? t.bohTarget : null;

      monthlyFinanceRows.push({
        monthNum: m,
        monthName: MONTH_FULL_NAMES[m - 1],
        shortName: `${MONTH_SHORT[m - 1]} ${selectedYear}`,
        periodKey: t?.periodKey || `${selectedYear}-${String(m).padStart(2, '0')}`,
        foh: foh,
        boh: boh
      });
    }

    // ── Period details rows (Table 1 — RESULT vs TARGET vs GAP) ─────────
    let latestActualMonth = null;
    let latestForecastMonth = null;

    const periodDetailsRows = [];
    for (let m = 1; m <= 12; m++) {
      const targetRow = targetByMonth[m];

      const isActual = false;
      const isForecast = false;

      // Actual performance results remain unavailable until actual data (guests ÷ hours) exists
      const fohResult = null;
      const bohResult = null;

      // Display monthly targets exactly as supplied (null if blank/not provided; no average fallback)
      const fohTarget = targetRow?.fohTarget != null ? targetRow.fohTarget : null;
      const bohTarget = targetRow?.bohTarget != null ? targetRow.bohTarget : null;

      // Only calculate performance gap when both actual and target values exist
      const fohGap = (fohResult != null && fohTarget != null) ? (fohResult - fohTarget) : null;
      const bohGap = (bohResult != null && bohTarget != null) ? (bohResult - bohTarget) : null;

      const shortName = `${MONTH_SHORT[m - 1]} ${selectedYear}`;
      periodDetailsRows.push({
        period: shortName,
        monthNum: m,
        isActual,
        isForecast,
        isEstimate: isActual && m <= 2,
        fohResult,
        fohTarget,
        fohGap,
        bohResult,
        bohTarget,
        bohGap,
      });

      if (isActual) latestActualMonth = shortName;
      if (isForecast && !latestForecastMonth) latestForecastMonth = shortName;
    }

    // Chart points — val is null when actuals are unavailable; target is exactly as supplied
    const fohChartPoints = periodDetailsRows.map((row, idx) => ({
      idx,
      label: row.period,
      val: row.fohResult,
      target: row.fohTarget,
      isForecast: row.isForecast,
      isActual: row.isActual,
    }));

    const bohChartPoints = periodDetailsRows.map((row, idx) => ({
      idx,
      label: row.period,
      val: row.bohResult,
      target: row.bohTarget,
      isForecast: row.isForecast,
      isActual: row.isActual,
    }));

    // Headline numbers: last Actual and last Forecast months
    const latestActualRow = [...periodDetailsRows].reverse().find(r => r.isActual);
    const latestForecastRow = [...periodDetailsRows].reverse().find(r => r.isForecast);

    // Keep actual and forecast results 'Not available' until real data exists
    const fohActualVal = latestActualRow?.fohResult != null
      ? latestActualRow.fohResult.toFixed(2)
      : 'Not available';
    const fohForecastVal = latestForecastRow?.fohResult != null
      ? latestForecastRow.fohResult.toFixed(2)
      : 'Not available';
    const bohActualVal = latestActualRow?.bohResult != null
      ? latestActualRow.bohResult.toFixed(2)
      : 'Not available';
    const bohForecastVal = latestForecastRow?.bohResult != null
      ? latestForecastRow.bohResult.toFixed(2)
      : 'Not available';

    return {
      id: v.id,
      name: v.name,
      region: v.region,
      venueNumber: v.venueNumber,
      hasResultData: false,
      fohActualStr: fohActualVal,
      fohForecastStr: fohForecastVal,
      bohActualStr: bohActualVal,
      bohForecastStr: bohForecastVal,
      latestActualMonth: latestActualRow ? latestActualRow.period : '—',
      latestForecastMonth: latestForecastRow ? latestForecastRow.period : '—',
      fohTargetAvg: annualFOHTarget,
      bohTargetAvg: annualBOHTarget,
      annualFOHTarget,
      annualBOHTarget,
      fohChartPoints,
      bohChartPoints,
      periodDetailsRows,
      monthlyFinanceRows,
    };
  });
}
