// Mở trang kết quả khi lớp phủ trên YouTube yêu cầu.
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === 'ytl-open-results') chrome.tabs.create({ url: chrome.runtime.getURL('results.html') });
  if (msg && msg.type === 'ytl-open-import') chrome.tabs.create({ url: chrome.runtime.getURL('import.html') });
});
