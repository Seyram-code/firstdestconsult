const test = require('node:test');
const assert = require('node:assert/strict');
const { formatEmailSummary } = require('./emailSummary');

test('formatEmailSummary converts payload into admin email summary text', () => {
  const summary = formatEmailSummary({
    name: 'Ama Doe',
    email: 'ama@example.com',
    countryChoice: ['Canada', 'Germany'],
  });

  assert.match(summary, /name: Ama Doe/i);
  assert.match(summary, /email: ama@example.com/i);
  assert.match(summary, /countryChoice: Canada, Germany/i);
});
