// Only server-supplied verification metadata controls these warnings.
export function syncWarningText(event) {
  if (event?.syncStatus !== 'unverified') return '';
  const date = event.lastSyncedAt ? new Date(event.lastSyncedAt) : null;
  const lastSync = date && !Number.isNaN(date.getTime())
    ? `from ${date.toLocaleString()}` : '(last successful sync time unknown)';
  return `This event could not be verified with Salesforce. Showing the last successfully synced details ${lastSync}. These details may be outdated.`;
}
