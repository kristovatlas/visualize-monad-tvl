'use strict';

/* global uPlot */
var partialDay = require('./partial-day');
var bandsModule = require('./bands');
var dom = require('../view/dom');

// Format USD values for axis labels
function usdAxisValue(self, rawValue) {
  if (rawValue >= 1e9) return '$' + (rawValue / 1e9).toFixed(1) + 'B';
  if (rawValue >= 1e6) return '$' + (rawValue / 1e6).toFixed(1) + 'M';
  if (rawValue >= 1e3) return '$' + (rawValue / 1e3).toFixed(0) + 'K';
  return '$' + rawValue.toFixed(0);
}

// Format timestamps for axis labels
function dateAxisValue(self, rawValue) {
  var d = new Date(rawValue * 1000);
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[d.getUTCMonth()] + ' ' + d.getUTCDate();
}

// Create a TVL chart with volatility bands and partial-day indicator
// container: DOM element to mount chart into
// series: [{date, tvl}, ...] sorted ascending
// title: string
// options: { width, height } (optional)
function createTvlChart(container, series, title, options) {
  if (!series || series.length === 0) {
    var msg = dom.el('p', { 'class': 'chart-empty' }, ['No data available']);
    container.appendChild(msg);
    return null;
  }

  var width = (options && options.width) || container.offsetWidth || 800;
  var height = (options && options.height) || 300;

  var bandData = bandsModule.computeBands(series);
  var partialIdx = partialDay.findPartialDayIndex(series);

  var hooks = {};
  if (partialIdx >= 0) {
    hooks.draw = [partialDay.createPartialDayHook(partialIdx)];
  }

  // Create outlier draw hook
  var outliers = bandsModule.findOutliers(bandData.tvlValues, bandData.upper, bandData.lower);
  if (outliers.length > 0) {
    if (!hooks.draw) hooks.draw = [];
    hooks.draw.push(function (u) {
      var ctx = u.ctx;
      ctx.save();
      ctx.fillStyle = '#ef4444';
      for (var i = 0; i < outliers.length; i++) {
        var idx = outliers[i];
        var cx = u.valToPos(u.data[0][idx], 'x', true);
        var cy = u.valToPos(u.data[1][idx], 'y', true);
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  var opts = {
    title: title,
    width: width,
    height: height,
    hooks: hooks,
    cursor: {
      drag: { x: false, y: false }
    },
    scales: {
      x: { time: true },
      y: { auto: true, range: function (u, min, max) { return [Math.max(0, min * 0.95), max * 1.05]; } }
    },
    axes: [
      {
        values: function (self, ticks) {
          return ticks.map(function (v) { return dateAxisValue(self, v); });
        }
      },
      {
        values: function (self, ticks) {
          return ticks.map(function (v) { return usdAxisValue(self, v); });
        },
        size: 70
      }
    ],
    series: [
      {}, // x-axis
      {
        label: 'TVL',
        stroke: '#2563eb',
        width: 2,
        fill: 'rgba(37, 99, 235, 0.05)'
      },
      {
        label: 'Upper Band',
        stroke: 'rgba(37, 99, 235, 0.2)',
        width: 1,
        dash: [4, 4]
      },
      {
        label: 'Lower Band',
        stroke: 'rgba(37, 99, 235, 0.2)',
        width: 1,
        dash: [4, 4],
        fill: 'rgba(37, 99, 235, 0.06)'
      }
    ],
    bands: [
      {
        series: [2, 3],
        fill: 'rgba(37, 99, 235, 0.06)'
      }
    ]
  };

  var data = [
    bandData.timestamps,
    bandData.tvlValues,
    bandData.upper,
    bandData.lower
  ];

  var chart = new uPlot(opts, data, container);
  return chart;
}

// Create a small sparkline chart for inline display
// container: DOM element
// changePcts: array of percentage change values (last 7 days)
function createSparkline(container, changePcts) {
  if (!changePcts || changePcts.length < 2) return null;

  var timestamps = [];
  var values = [];
  for (var i = 0; i < changePcts.length; i++) {
    timestamps.push(i);
    values.push(changePcts[i] !== null ? changePcts[i] : 0);
  }

  var opts = {
    width: 80,
    height: 30,
    cursor: { show: false },
    select: { show: false },
    legend: { show: false },
    axes: [{ show: false }, { show: false }],
    scales: {
      x: { time: false },
      y: { auto: true }
    },
    series: [
      {},
      {
        stroke: '#6b7280',
        width: 1,
        fill: undefined
      }
    ]
  };

  return new uPlot(opts, [timestamps, values], container);
}

module.exports = {
  createTvlChart: createTvlChart,
  createSparkline: createSparkline
};
