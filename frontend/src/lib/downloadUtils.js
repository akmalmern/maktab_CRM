export function buildSafeDownloadFileName({ fileName, fallbackName }) {
  if (fileName && !String(fileName).toLowerCase().endsWith('.bin')) {
    return fileName;
  }
  return fallbackName;
}

export function triggerBrowserDownload({ blob, fileName }) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function saveDownloadedFile({ blob, fileName, fallbackName }) {
  const safeName = buildSafeDownloadFileName({ fileName, fallbackName });
  triggerBrowserDownload({ blob, fileName: safeName });
  return safeName;
}

