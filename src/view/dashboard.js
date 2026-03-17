'use strict';

var dom = require('./dom');
var anomaly = require('../model/anomaly');
var statsModule = require('../model/stats');

// Render the protocol summary dashboard table
// container: DOM element
// protocols: [{name, slug, tvl, change_1h, change_1d, change_7d}, ...]
// protocolHistories: { slug: [{date, tvl}, ...], ... }
function renderDashboard(container, protocols, protocolHistories) {
  dom.clearChildren(container);

  if (!protocols || protocols.length === 0) {
    container.appendChild(dom.el('p', { 'class': 'dashboard-empty' }, ['No protocols found']));
    return;
  }

  // Check for chain-wide event
  var chainEvent = anomaly.detectChainWideEvent(protocols);
  if (chainEvent.detected) {
    var banner = dom.el('div', { 'class': 'alert-banner alert-critical', role: 'alert', 'aria-live': 'assertive' }, [
      dom.el('strong', {}, ['Chain-wide event detected: ']),
      chainEvent.affectedCount + ' protocols showing simultaneous decline (' +
        chainEvent.affectedNames.join(', ') + ')'
    ]);
    container.appendChild(banner);
  }

  var table = dom.el('table', { 'class': 'dashboard-table' });
  var thead = dom.el('thead', {}, [
    dom.el('tr', {}, [
      dom.el('th', {}, ['Protocol']),
      dom.el('th', {}, ['TVL']),
      dom.el('th', {}, ['1h']),
      dom.el('th', {}, ['24h']),
      dom.el('th', {}, ['7d']),
      dom.el('th', { title: 'Z-score: how unusual is today\'s change vs. the last 30 days' }, ['Anomaly']),
      dom.el('th', {}, ['Trend'])
    ])
  ]);
  table.appendChild(thead);

  var tbody = dom.el('tbody', {});
  for (var i = 0; i < protocols.length; i++) {
    var p = protocols[i];
    var row = createProtocolRow(p, protocolHistories[p.slug]);
    tbody.appendChild(row);
  }
  table.appendChild(tbody);
  container.appendChild(table);

  // Anomaly score legend
  container.appendChild(dom.el('div', { 'class': 'anomaly-legend' }, [
    dom.el('strong', {}, ['Anomaly score']),
    ' \u2014 How unusual is today\u2019s TVL change compared to the last 30 days of daily moves. ',
    dom.el('span', { 'class': 'anomaly-legend-normal' }, ['< 2.0 normal']),
    ' \u00B7 ',
    dom.el('span', { 'class': 'anomaly-legend-warning' }, ['\u2265 2.0 unusual']),
    ' \u00B7 ',
    dom.el('span', { 'class': 'anomaly-legend-critical' }, ['\u2265 3.0 investigate'])
  ]));
}

// Create a single protocol table row
function createProtocolRow(protocol, history) {
  // Compute anomaly score if we have history
  var anomalyResult = { score: null, level: 'normal' };
  if (history && history.length > 0) {
    var changes = statsModule.dailyChanges(history);
    anomalyResult = anomaly.scoreProtocol(changes);
  }

  var tr = dom.el('tr', {
    'data-slug': protocol.slug,
    'data-level': anomalyResult.level
  }, [
    dom.el('td', { 'class': 'col-name' }, [protocol.name]),
    dom.el('td', { 'class': 'col-tvl' }, [dom.formatUSD(protocol.tvl)]),
    createChangeCell(protocol.change_1h),
    createChangeCell(protocol.change_1d),
    createChangeCell(protocol.change_7d),
    createAnomalyCell(anomalyResult),
    dom.el('td', { 'class': 'col-sparkline' }) // sparkline mounted later
  ]);

  return tr;
}

// Create a table cell for a percentage change value
function createChangeCell(changePct) {
  var cssClass = 'col-change';
  if (typeof changePct === 'number' && Number.isFinite(changePct)) {
    if (changePct > 0) cssClass += ' change-positive';
    else if (changePct < 0) cssClass += ' change-negative';
  }
  return dom.el('td', { 'class': cssClass }, [dom.formatPct(changePct)]);
}

// Create a table cell for the anomaly score
function createAnomalyCell(result) {
  var cssClass = 'col-anomaly';
  var label = '--';
  if (result.score !== null) {
    label = Math.abs(result.score).toFixed(1);
    cssClass += ' anomaly-' + result.level;
  }
  return dom.el('td', { 'class': cssClass }, [label]);
}

module.exports = {
  renderDashboard: renderDashboard
};
