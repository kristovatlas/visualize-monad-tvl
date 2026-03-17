'use strict';

var dom = require('./dom');

// Render a status message (loading, error, etc.)
function renderStatus(container, message, type) {
  dom.clearChildren(container);
  var cssClass = 'status-message';
  if (type === 'error') cssClass += ' status-error';
  if (type === 'loading') cssClass += ' status-loading';
  container.appendChild(dom.el('div', { 'class': cssClass, 'aria-live': 'polite' }, [message]));
}

// Render last-updated timestamp
function renderLastUpdated(container, date) {
  dom.clearChildren(container);
  var timeStr = date.toUTCString();
  container.appendChild(dom.el('span', { 'class': 'last-updated' }, ['Last updated: ' + timeStr]));
}

module.exports = {
  renderStatus: renderStatus,
  renderLastUpdated: renderLastUpdated
};
