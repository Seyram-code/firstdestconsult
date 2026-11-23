function formatValue(value) {
  if (value === undefined || value === null || value === '') {
    return 'Not provided';
  }

  if (Array.isArray(value)) {
    return value.join(', ');
  }

  return String(value);
}

function formatEmailSummary(payload = {}) {
  return Object.entries(payload)
    .map(([key, value]) => `${key}: ${formatValue(value)}`)
    .join('\n');
}

module.exports = {
  formatEmailSummary,
};
