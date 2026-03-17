'use strict';

// Detect and visually handle partial (incomplete) day data

// Check if a unix timestamp falls within the current UTC day
function isPartialDay(unixTimestamp) {
  if (typeof unixTimestamp !== 'number' || !Number.isFinite(unixTimestamp)) {
    return false;
  }
  var now = new Date();
  var todayStartUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000;
  return unixTimestamp >= todayStartUTC;
}

// Find the index where partial day data begins in a sorted time series
// Returns -1 if no partial day data found
function findPartialDayIndex(series) {
  if (!Array.isArray(series) || series.length === 0) return -1;

  // Check from the end since partial day will be the last entry(ies)
  for (var i = series.length - 1; i >= 0; i--) {
    if (!isPartialDay(series[i].date)) {
      // The entry after this is where partial data starts
      return i + 1 < series.length ? i + 1 : -1;
    }
  }
  // All entries are partial (shouldn't happen in practice)
  return 0;
}

// Create a uPlot draw hook that renders the partial day indicator
// partialIndex: the index in the data where partial day starts
function createPartialDayHook(partialIndex) {
  return function (u) {
    if (partialIndex < 0 || partialIndex >= u.data[0].length) return;

    var ctx = u.ctx;
    var x = u.valToPos(u.data[0][partialIndex], 'x', true);
    var yMin = u.bbox.top;
    var yMax = u.bbox.top + u.bbox.height;

    // Draw vertical dashed line at partial day boundary
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.6)';
    ctx.lineWidth = 1;
    ctx.moveTo(x, yMin);
    ctx.lineTo(x, yMax);
    ctx.stroke();

    // Draw "partial day" label
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(150, 150, 150, 0.8)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('partial day', x, yMin + 12);
    ctx.restore();
  };
}

module.exports = {
  isPartialDay: isPartialDay,
  findPartialDayIndex: findPartialDayIndex,
  createPartialDayHook: createPartialDayHook
};
