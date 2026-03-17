'use strict';

var config = require('./config');
var endpoints = require('./api/endpoints');
var protocols = require('./model/protocols');
var stats = require('./model/stats');
var chartFactory = require('./chart/factory');
var dashboard = require('./view/dashboard');
var alerts = require('./view/alerts');
var dom = require('./view/dom');

// State
var state = {
  chainTvl: null,
  monadProtocols: null,
  protocolHistories: {},
  charts: [],
  refreshTimer: null
};

// DOM references (set on init)
var elements = {};

function init() {
  elements.status = document.getElementById('status');
  elements.lastUpdated = document.getElementById('last-updated');
  elements.chainChart = document.getElementById('chain-chart');
  elements.dashboard = document.getElementById('dashboard');
  elements.protocolCharts = document.getElementById('protocol-charts');

  if (!elements.status || !elements.chainChart || !elements.dashboard || !elements.protocolCharts) {
    return;
  }

  loadData();
}

function loadData() {
  alerts.renderStatus(elements.status, 'Loading TVL data...', 'loading');

  // Fetch chain TVL and protocol list in parallel
  Promise.all([
    endpoints.fetchChainTvl(),
    endpoints.fetchMonadProtocols()
  ]).then(function (results) {
    var chainResult = results[0];
    var protocolResult = results[1];

    if (!chainResult.ok) {
      alerts.renderStatus(elements.status, 'Failed to load chain TVL: ' + chainResult.error, 'error');
      return;
    }

    state.chainTvl = chainResult.data;

    // Render chain-wide TVL chart
    dom.clearChildren(elements.chainChart);
    destroyCharts();
    var chart = chartFactory.createTvlChart(elements.chainChart, state.chainTvl, 'Monad Chain TVL');
    if (chart) state.charts.push(chart);

    // Process protocols
    if (protocolResult.ok) {
      state.monadProtocols = protocols.filterAndSort(protocolResult.data);
    } else {
      state.monadProtocols = protocols.filterAndSort([]);
    }

    // Render dashboard with summary data
    dashboard.renderDashboard(elements.dashboard, state.monadProtocols, state.protocolHistories);

    // Fetch detailed histories for top protocols (sequentially)
    var slugs = [];
    for (var i = 0; i < Math.min(state.monadProtocols.length, 10); i++) {
      slugs.push(state.monadProtocols[i].slug);
    }

    return endpoints.fetchProtocolDetails(slugs).then(function (histories) {
      state.protocolHistories = histories;

      // Re-render dashboard with history data (for anomaly scores)
      dashboard.renderDashboard(elements.dashboard, state.monadProtocols, state.protocolHistories);

      // Render per-protocol charts
      renderProtocolCharts();

      // Mount sparklines into dashboard rows
      mountSparklines();

      alerts.renderStatus(elements.status, '', '');
      if (elements.lastUpdated) {
        alerts.renderLastUpdated(elements.lastUpdated, new Date());
      }

      // Schedule refresh
      scheduleRefresh();
    });
  }).catch(function (err) {
    alerts.renderStatus(elements.status, 'Unexpected error: ' + err.message, 'error');
    scheduleRefresh();
  });
}

function renderProtocolCharts() {
  dom.clearChildren(elements.protocolCharts);

  var slugs = Object.keys(state.protocolHistories);
  for (var i = 0; i < slugs.length; i++) {
    var slug = slugs[i];
    var history = state.protocolHistories[slug];
    if (!history || history.length === 0) continue;

    // Find protocol name
    var name = slug;
    for (var j = 0; j < state.monadProtocols.length; j++) {
      if (state.monadProtocols[j].slug === slug) {
        name = state.monadProtocols[j].name;
        break;
      }
    }

    var chartContainer = dom.el('div', { 'class': 'protocol-chart' });
    elements.protocolCharts.appendChild(chartContainer);

    var chart = chartFactory.createTvlChart(chartContainer, history, name + ' TVL');
    if (chart) state.charts.push(chart);
  }
}

function mountSparklines() {
  var cells = document.querySelectorAll('.col-sparkline');
  for (var i = 0; i < cells.length; i++) {
    var row = cells[i].parentElement;
    if (!row) continue;
    var slug = row.getAttribute('data-slug');
    if (!slug || !state.protocolHistories[slug]) continue;

    var history = state.protocolHistories[slug];
    var changes = stats.dailyChanges(history);

    // Last 7 entries
    var recent = changes.slice(-7);
    var pcts = [];
    for (var j = 0; j < recent.length; j++) {
      pcts.push(recent[j].changePct);
    }

    chartFactory.createSparkline(cells[i], pcts);
  }
}

function destroyCharts() {
  for (var i = 0; i < state.charts.length; i++) {
    if (state.charts[i] && typeof state.charts[i].destroy === 'function') {
      state.charts[i].destroy();
    }
  }
  state.charts = [];
}

function scheduleRefresh() {
  if (state.refreshTimer) {
    clearTimeout(state.refreshTimer);
  }
  state.refreshTimer = setTimeout(function () {
    loadData();
  }, config.REFRESH_INTERVAL_MS);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
