// popup.js - Cookie.box (from scratch)
let currentHost = '';

document.addEventListener('DOMContentLoaded', init);

async function init() {
  const domainEl = document.getElementById('domain');
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url || !tab.url.startsWith('http')) {
    domainEl.textContent = 'Not a valid webpage';
    document.getElementById('cookieList').innerHTML = '<div style="padding:10px;color:#ef4444">Open a website to manage cookies.</div>';
    return;
  }

  const url = new URL(tab.url);
  currentHost = url.hostname;
  domainEl.textContent = currentHost;

  loadCookies();
  setupEventListeners();
}

function setupEventListeners() {
  document.getElementById('addBtn').addEventListener('click', addCookie);
}

async function loadCookies() {
  const listEl = document.getElementById('cookieList');
  try {
    const cookies = await chrome.cookies.getAll({ domain: currentHost });
    if (cookies.length === 0) {
      listEl.innerHTML = '<div style="padding:10px;color:#6b7280;">No cookies found.</div>';
      return;
    }

    let html = '';
    cookies.forEach(cookie => {
      const safeValue = cookie.value || '';
      html += `
        <div class="cookie-item">
          <div class="cookie-info">
            <div class="cookie-name">${escapeHtml(cookie.name)}</div>
            <div class="cookie-value">${escapeHtml(truncate(safeValue, 60))}</div>
          </div>
          <div class="cookie-actions">
            <button class="btn-copy" onclick="copyValue('${escapeJS(safeValue)}')">Copy</button>
            <button class="btn-delete" onclick="deleteCookie('${escapeJS(cookie.name)}', '${escapeJS(cookie.path)}')">Del</button>
          </div>
        </div>
      `;
    });
    listEl.innerHTML = html;
  } catch (e) {
    listEl.innerHTML = `<div style="padding:10px;color:#ef4444">Error loading cookies: ${e.message}</div>`;
  }
}

async function addCookie() {
  const name = document.getElementById('newName').value.trim();
  const value = document.getElementById('newValue').value.trim();
  const path = document.getElementById('newPath').value.trim() || '/';

  if (!name || !value) {
    showStatus('Name and value are required.', 'error');
    return;
  }

  try {
    await chrome.cookies.set({
      url: `https://${currentHost}`,
      name,
      value,
      path,
      secure: true,
      httpOnly: false,
      sameSite: 'lax'
    });
    showStatus(`✅ Added: ${name}`, 'success');
    document.getElementById('newName').value = '';
    document.getElementById('newValue').value = '';
    loadCookies();
  } catch (e) {
    showStatus(`❌ Failed: ${e.message}`, 'error');
  }
}

// Global functions for inline onclick (required in MV3 popup)
window.copyValue = (value) => {
  navigator.clipboard.writeText(value).then(() => {
    showStatus('📋 Copied!', 'success');
  }).catch(() => {
    showStatus('Failed to copy', 'error');
  });
};

window.deleteCookie = async (name, path) => {
  try {
    await chrome.cookies.remove({
      url: `https://${currentHost}`,
      name,
      path
    });
    showStatus(`🗑️ Deleted: ${name}`, 'success');
    loadCookies();
  } catch (e) {
    showStatus(`Delete error: ${e.message}`, 'error');
  }
};

function showStatus(message, type) {
  const el = document.getElementById('status');
  el.textContent = message;
  el.className = `status-${type}`;
  setTimeout(() => {
    el.style.display = 'none';
  }, 2500);
}

// Helpers
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '<', '>': '>', '"': '&quot;', "'": '&#039;' }[m]));
}

function escapeJS(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function truncate(str, len) {
  return str.length > len ? str.substring(0, len) + '…' : str;
}
