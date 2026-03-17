'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var partialDay = require('../../src/chart/partial-day');

// Helper: get start of today in UTC as unix timestamp
function todayStartUTC() {
  var now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000;
}

test('isPartialDay: today is partial', function () {
  var todayNoon = todayStartUTC() + 43200; // noon today
  assert.equal(partialDay.isPartialDay(todayNoon), true);
});

test('isPartialDay: yesterday is not partial', function () {
  var yesterday = todayStartUTC() - 86400;
  assert.equal(partialDay.isPartialDay(yesterday), false);
});

test('isPartialDay: midnight today is partial', function () {
  var midnight = todayStartUTC();
  assert.equal(partialDay.isPartialDay(midnight), true);
});

test('isPartialDay: one second before today is not partial', function () {
  var justBefore = todayStartUTC() - 1;
  assert.equal(partialDay.isPartialDay(justBefore), false);
});

test('isPartialDay: future timestamp is partial', function () {
  var tomorrow = todayStartUTC() + 86400 * 2;
  assert.equal(partialDay.isPartialDay(tomorrow), true);
});

test('isPartialDay: rejects non-number', function () {
  assert.equal(partialDay.isPartialDay('1740787200'), false);
  assert.equal(partialDay.isPartialDay(null), false);
  assert.equal(partialDay.isPartialDay(undefined), false);
  assert.equal(partialDay.isPartialDay(NaN), false);
  assert.equal(partialDay.isPartialDay(Infinity), false);
});

// ============================================================
// findPartialDayIndex
// ============================================================

test('findPartialDayIndex: finds partial day at end', function () {
  var today = todayStartUTC() + 3600;
  var series = [
    { date: todayStartUTC() - 86400 * 2 },
    { date: todayStartUTC() - 86400 },
    { date: today }
  ];
  var idx = partialDay.findPartialDayIndex(series);
  assert.equal(idx, 2);
});

test('findPartialDayIndex: returns -1 when no partial day', function () {
  var series = [
    { date: todayStartUTC() - 86400 * 3 },
    { date: todayStartUTC() - 86400 * 2 },
    { date: todayStartUTC() - 86400 }
  ];
  var idx = partialDay.findPartialDayIndex(series);
  assert.equal(idx, -1);
});

test('findPartialDayIndex: empty array returns -1', function () {
  assert.equal(partialDay.findPartialDayIndex([]), -1);
});

test('findPartialDayIndex: null returns -1', function () {
  assert.equal(partialDay.findPartialDayIndex(null), -1);
});

test('findPartialDayIndex: all partial returns 0', function () {
  var today = todayStartUTC();
  var series = [
    { date: today },
    { date: today + 3600 },
    { date: today + 7200 }
  ];
  var idx = partialDay.findPartialDayIndex(series);
  assert.equal(idx, 0);
});
