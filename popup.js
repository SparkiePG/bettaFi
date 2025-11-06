let currentDomain = '';

document.addEventListener('DOMContentLoaded', () => {
  getCurrentTabDomain().then(domain => {
    currentDomain = domain;
    document.getElementById('domain').textContent = domain;
    loadCookies(domain);
  });
});

async function getCurrentTabDomain() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = new URL(tab.url);
  return url.hostname;
}

async function loadCookies(domain) {
  const cookies = await chrome.cookies.getAll({ domain: '.' + domain });
  const list = document.getElementById('cookieList');
  const count = document.getElementById('count');
  list.innerHTML = '';
  count.textContent = cookies.length;

  cookies.forEach(cookie => {
    const div = document.createElement('div');
    div.className = 'cookie-item';
    div.innerHTML = `
      <div class="cookie-name">${cookie.name}</div>
      <div class="cookie-value">${cookie.value}</div>
      <button onclick="copyValue('${cookie.value}')">Copy</button>
      <button class="btn-del" onclick="deleteCookie('${cookie.name}', '${cookie.path}')">Delete</button>
    `;
    list.appendChild(div);
  });
}

function copyValue(value) {
  navigator.clipboard.writeText(value).then(() => {
    showStatus('Copied to clipboard!', 'success');
  }).catch(() => {
    showStatus('Failed to copy', 'error');
  });
}

async function deleteCookie(name, path) {
  await chrome.cookies.remove({
    url: `https://${currentDomain}`,
    name: name,
    path: path
  });
  showStatus(`Deleted: ${name}`, 'success');
  loadCookies(currentDomain);
}

async function addCookie() {
  const name = document.getElementById('name').value.trim();
  const value = document.getElementById('value').value.trim();
  const path = document.getElementById('path').value.trim() || '/';

  if (!name || !value) {
    showStatus('Name and value are required', 'error');
    return;
  }

  try {
    await chrome.cookies.set({
      url: `https://${currentDomain}`,
      name: name,
      value: value,
      path: path,
      secure: true,
      httpOnly: false,
      sameSite: 'lax'
    });
    showStatus(`Added: ${name}`, 'success');
    document.getElementById('name').value = '';
    document.getElementById('value').value = '';
    loadCookies(currentDomain);
  } catch (e) {
    showStatus('Failed to add cookie: ' + e.message, 'error');
  }
}

function showStatus(msg, type = 'info') {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = type;
  setTimeout(() => el.textContent = '', 3000);
}
