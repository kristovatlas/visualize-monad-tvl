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
  refreshTimer: null,
  countdownTimer: null,
  secondsUntilRefresh: 0,
  isLoading: false,
  // Track previous values for change detection
  prevProtocolTvls: {}
};

// DOM references (set on init)
var elements = {};

function init() {
  elements.status = document.getElementById('status');
  elements.lastUpdated = document.getElementById('last-updated');
  elements.countdown = document.getElementById('countdown');
  elements.liveIndicator = document.getElementById('live-indicator');
  elements.chainChart = document.getElementById('chain-chart');
  elements.dashboard = document.getElementById('dashboard');
  elements.protocolCharts = document.getElementById('protocol-charts');

  if (!elements.status || !elements.chainChart || !elements.dashboard || !elements.protocolCharts) {
    return;
  }

  loadData();
}

function loadData() {
  if (state.isLoading) return;
  state.isLoading = true;

  // Pulse the live indicator during fetch
  if (elements.liveIndicator) {
    elements.liveIndicator.setAttribute('class', 'live-dot live-dot-fetching');
  }

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
      state.isLoading = false;
      scheduleRefresh();
      return;
    }

    // Check if chain data actually changed
    var chainChanged = !state.chainTvl || state.chainTvl.length !== chainResult.data.length ||
      (state.chainTvl.length > 0 && chainResult.data.length > 0 &&
        state.chainTvl[state.chainTvl.length - 1].tvl !== chainResult.data[chainResult.data.length - 1].tvl);

    state.chainTvl = chainResult.data;

    // Only re-render chain chart if data changed
    if (chainChanged) {
      dom.clearChildren(elements.chainChart);
      destroyCharts();
      var chart = chartFactory.createTvlChart(elements.chainChart, state.chainTvl, 'Monad Chain TVL');
      if (chart) state.charts.push(chart);
    }

    // Process protocols
    var prevProtocols = state.monadProtocols;
    if (protocolResult.ok) {
      state.monadProtocols = protocols.filterAndSort(protocolResult.data);
    } else {
      state.monadProtocols = protocols.filterAndSort([]);
    }

    // Snapshot current TVLs for change detection on next refresh
    var newTvls = {};
    for (var i = 0; i < state.monadProtocols.length; i++) {
      var p = state.monadProtocols[i];
      newTvls[p.slug] = p.tvl;
    }

    // Detect which protocols changed
    var changedSlugs = {};
    for (var slug in newTvls) {
      if (state.prevProtocolTvls[slug] !== undefined && state.prevProtocolTvls[slug] !== newTvls[slug]) {
        changedSlugs[slug] = true;
      }
    }
    state.prevProtocolTvls = newTvls;

    // Render dashboard with summary data
    dashboard.renderDashboard(elements.dashboard, state.monadProtocols, state.protocolHistories);

    // Flash changed rows
    highlightChangedRows(changedSlugs);

    // Fetch detailed histories for top protocols (sequentially)
    var slugs = [];
    for (var j = 0; j < Math.min(state.monadProtocols.length, 10); j++) {
      slugs.push(state.monadProtocols[j].slug);
    }

    return endpoints.fetchProtocolDetails(slugs).then(function (histories) {
      state.protocolHistories = histories;

      // Re-render dashboard with history data (for anomaly scores)
      dashboard.renderDashboard(elements.dashboard, state.monadProtocols, state.protocolHistories);

      // Flash changed rows again after re-render
      highlightChangedRows(changedSlugs);

      // Only re-render protocol charts if this is first load or data changed
      if (!prevProtocols || chainChanged) {
        renderProtocolCharts();
      }

      // Mount sparklines into dashboard rows
      mountSparklines();

      alerts.renderStatus(elements.status, '', '');
      if (elements.lastUpdated) {
        alerts.renderLastUpdated(elements.lastUpdated, new Date());
      }

      state.isLoading = false;

      // Restore live indicator to normal pulse
      if (elements.liveIndicator) {
        elements.liveIndicator.setAttribute('class', 'live-dot live-dot-active');
      }

      // Schedule refresh
      scheduleRefresh();
    });
  }).catch(function (err) {
    alerts.renderStatus(elements.status, 'Unexpected error: ' + err.message, 'error');
    state.isLoading = false;
    if (elements.liveIndicator) {
      elements.liveIndicator.setAttribute('class', 'live-dot live-dot-error');
    }
    scheduleRefresh();
  });
}

function highlightChangedRows(changedSlugs) {
  if (!changedSlugs || Object.keys(changedSlugs).length === 0) return;
  var rows = document.querySelectorAll('.dashboard-table tbody tr');
  for (var i = 0; i < rows.length; i++) {
    var slug = rows[i].getAttribute('data-slug');
    if (slug && changedSlugs[slug]) {
      rows[i].setAttribute('class', (rows[i].getAttribute('class') || '') + ' row-flash');
      // Remove the flash class after animation completes
      (function (row) {
        setTimeout(function () {
          var cls = row.getAttribute('class') || '';
          row.setAttribute('class', cls.replace(' row-flash', ''));
        }, 1500);
      })(rows[i]);
    }
  }
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
  if (state.countdownTimer) {
    clearInterval(state.countdownTimer);
  }

  var intervalSec = Math.round(config.REFRESH_INTERVAL_MS / 1000);
  state.secondsUntilRefresh = intervalSec;

  // Update countdown display every second
  updateCountdownDisplay();
  state.countdownTimer = setInterval(function () {
    state.secondsUntilRefresh--;
    if (state.secondsUntilRefresh < 0) state.secondsUntilRefresh = 0;
    updateCountdownDisplay();
  }, 1000);

  state.refreshTimer = setTimeout(function () {
    if (state.countdownTimer) {
      clearInterval(state.countdownTimer);
    }
    loadData();
  }, config.REFRESH_INTERVAL_MS);
}

function updateCountdownDisplay() {
  if (!elements.countdown) return;
  dom.clearChildren(elements.countdown);
  var secs = state.secondsUntilRefresh;
  var text = secs + 's';
  elements.countdown.appendChild(document.createTextNode('Next update in ' + text));
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
