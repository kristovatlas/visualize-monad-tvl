'use strict';

// Safe DOM manipulation helpers - NO innerHTML anywhere

var ALLOWED_TAGS = {
  div: true, span: true, p: true, h1: true, h2: true, h3: true, h4: true,
  table: true, thead: true, tbody: true, tr: true, th: true, td: true,
  a: true, strong: true, em: true, br: true, section: true, header: true,
  main: true, nav: true, button: true, label: true, input: true, noscript: true
};

var ALLOWED_ATTRS = {
  'class': true, id: true, title: true, role: true,
  'aria-label': true, 'aria-live': true, 'aria-hidden': true,
  href: true, target: true, rel: true, type: true, value: true,
  'data-slug': true, 'data-level': true
};

// Create an element safely
// tag: string (must be in ALLOWED_TAGS)
// attrs: object of attribute key/value pairs (optional)
// children: array of Nodes or strings (optional)
function el(tag, attrs, children) {
  if (!ALLOWED_TAGS[tag]) {
    throw new Error('Disallowed tag: ' + tag);
  }
  var node = document.createElement(tag);
  if (attrs) {
    var keys = Object.keys(attrs);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (!ALLOWED_ATTRS[key]) {
        throw new Error('Disallowed attribute: ' + key);
      }
      node.setAttribute(key, String(attrs[key]));
    }
  }
  if (children) {
    for (var j = 0; j < children.length; j++) {
      var child = children[j];
      if (typeof child === 'string') {
        node.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        node.appendChild(child);
      }
    }
  }
  return node;
}

// Create a text node (always safe)
function text(str) {
  return document.createTextNode(String(str));
}

// Format a number as USD
var usdFormatter = null;
function formatUSD(num) {
  if (typeof num !== 'number' || !Number.isFinite(num)) return '--';
  if (!usdFormatter) {
    usdFormatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }
  return usdFormatter.format(num);
}

// Format a percentage with sign
function formatPct(num) {
  if (typeof num !== 'number' || !Number.isFinite(num)) return '--';
  var sign = num >= 0 ? '+' : '';
  return sign + num.toFixed(2) + '%';
}

// Remove all children from an element
function clearChildren(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

module.exports = {
  el: el,
  text: text,
  formatUSD: formatUSD,
  formatPct: formatPct,
  clearChildren: clearChildren
};
