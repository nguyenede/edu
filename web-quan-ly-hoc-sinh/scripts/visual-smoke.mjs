import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const webUrl = process.env.WEB_URL || 'http://localhost:5173';
const apiUrl = process.env.API_URL || 'http://localhost:5001/api';
const port = Number(process.env.CDP_PORT || 9333);
const outputDir = path.resolve(os.tmpdir(), 'studentos-visual-smoke');
if (path.basename(outputDir) !== 'studentos-visual-smoke' || !outputDir.startsWith(path.resolve(os.tmpdir()))) {
  throw new Error('Unsafe visual test output path');
}
fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'studentos-chrome-'));

const chrome = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`, 'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitForJson = async () => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json`);
      if (response.ok) return response.json();
    } catch { /* Chrome is still starting. */ }
    await sleep(100);
  }
  throw new Error('Chrome DevTools endpoint did not start');
};

let socket;
let requestId = 0;
const pending = new Map();
const runtimeIssues = [];

const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++requestId;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});

const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Browser evaluation failed');
  return result.result.value;
};

const navigate = async (url, waitMs = 900) => {
  await send('Page.navigate', { url });
  await sleep(waitMs);
};

const setViewport = (width, height) => send('Emulation.setDeviceMetricsOverride', {
  width, height, deviceScaleFactor: 1, mobile: width < 600, screenWidth: width, screenHeight: height
});

try {
  const pages = await waitForJson();
  const page = pages.find((item) => item.type === 'page');
  if (!page) throw new Error('No Chrome page target found');
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const request = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message)); else request.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') runtimeIssues.push(message.params.exceptionDetails.text || 'Uncaught exception');
    if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(message.params.type)) {
      const text = message.params.args.map((arg) => arg.value || arg.description || '').join(' ');
      if (!text.includes('Download the React DevTools')) runtimeIssues.push(`${message.params.type}: ${text}`);
    }
  };

  await Promise.all([send('Page.enable'), send('Runtime.enable'), send('Network.enable')]);
  await setViewport(1440, 900);
  await navigate(`${webUrl}/login`);
  const login = await evaluate(`(async () => {
    const response = await fetch(${JSON.stringify(`${apiUrl}/auth/login`)}, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@school.com', password: '123456' })
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.message || 'Login failed');
    localStorage.setItem('token', json.data.token);
    localStorage.setItem('user', JSON.stringify(json.data.user));
    return { ok: true, role: json.data.user.role };
  })()`);
  if (!login?.ok) throw new Error('Could not seed browser session');

  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 1024, height: 768 },
    { name: 'mobile', width: 390, height: 844 }
  ];
  const results = [];
  for (const viewport of viewports) {
    await setViewport(viewport.width, viewport.height);
    await navigate(`${webUrl}/dashboard`, 1300);
    const layout = await evaluate(`({
      title: document.title,
      path: location.pathname,
      viewportWidth: window.innerWidth,
      contentWidth: document.documentElement.scrollWidth,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      alertText: Array.from(document.querySelectorAll('[role="alert"]')).map((node) => node.textContent?.trim()).filter(Boolean),
      bodyText: document.body.innerText.slice(0, 240)
    })`);
    const capture = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
    const file = path.join(outputDir, `dashboard-${viewport.name}.png`);
    fs.writeFileSync(file, Buffer.from(capture.data, 'base64'));
    results.push({ viewport: viewport.name, ...layout, screenshot: file });
    if (viewport.name === 'mobile') {
      const menuState = await evaluate(`(() => {
        const button = document.querySelector('button[aria-label="Mở menu"]');
        button?.click();
        const sidebar = document.querySelector('aside');
        return { buttonFound: Boolean(button), sidebarFound: Boolean(sidebar) };
      })()`);
      await sleep(350);
      const openedMenu = await evaluate(`(() => {
        const sidebar = document.querySelector('aside');
        if (!sidebar) return { visible: false };
        const rect = sidebar.getBoundingClientRect();
        return { visible: rect.left >= -1 && rect.right > 0, left: rect.left, right: rect.right, width: rect.width };
      })()`);
      const menuCapture = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
      const menuFile = path.join(outputDir, 'dashboard-mobile-menu.png');
      fs.writeFileSync(menuFile, Buffer.from(menuCapture.data, 'base64'));
      results.push({ viewport: 'mobile-menu', ...menuState, ...openedMenu, screenshot: menuFile });
    }
  }

  await setViewport(1440, 900);
  const adminRoutes = [
    '/students', '/students/create', '/teachers', '/teachers/create', '/classes', '/subjects',
    '/schedules', '/grades', '/attendance', '/payments', '/notifications', '/parents', '/settings',
    '/reports', '/audit', '/profile', '/ai-advisor'
  ];
  for (const route of adminRoutes) {
    const issueStart = runtimeIssues.length;
    await navigate(`${webUrl}${route}`, 1100);
    const state = await evaluate(`({
      path: location.pathname,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      alertText: Array.from(document.querySelectorAll('[role="alert"]')).map((node) => node.textContent?.trim()).filter(Boolean),
      hasLoadingText: document.body.innerText.includes('Đang tải')
    })`);
    results.push({ route, ...state, runtimeIssues: runtimeIssues.slice(issueStart) });
  }
  await navigate(`${webUrl}/students/create`, 900);
  const accountTrigger = await evaluate(`(() => {
    const checkbox = document.querySelector('input[type="checkbox"]');
    checkbox?.click();
    return { checkboxFound: Boolean(checkbox) };
  })()`);
  await sleep(150);
  const accountFields = await evaluate(`(() => {
    const password = document.querySelector('input[type="password"]');
    return { passwordFound: Boolean(password), passwordRequired: Boolean(password?.required) };
  })()`);
  results.push({ route: '/students/create#account', ...accountTrigger, ...accountFields });

  await setViewport(390, 844);
  await navigate(`${webUrl}/students/create`, 900);
  const studentFormState = await evaluate(`(() => {
    const text = document.body.innerText;
    const requiredLabels = ['Họ và tên', 'Ngày sinh', 'Nơi sinh', 'CCCD/Hộ chiếu', 'Người liên hệ khẩn cấp', 'Trường học trước đây'];
    return {
      requiredLabels: Object.fromEntries(requiredLabels.map((label) => [label, text.includes(label)])),
      controls: document.querySelectorAll('input, select, textarea').length,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  })()`);
  const studentFormCapture = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
  const studentFormFile = path.join(outputDir, 'student-create-mobile.png');
  fs.writeFileSync(studentFormFile, Buffer.from(studentFormCapture.data, 'base64'));
  results.push({ route: '/students/create', viewport: 'mobile', ...studentFormState, screenshot: studentFormFile });

  await navigate(`${webUrl}/students/1`, 1000);
  const studentDetailState = await evaluate(`({
    path: location.pathname,
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    hasProfileTabs: document.body.innerText.includes('Thông tin cá nhân') && document.body.innerText.includes('Kết quả học tập'),
    alertText: Array.from(document.querySelectorAll('[role="alert"]')).map((node) => node.textContent?.trim()).filter(Boolean),
  })`);
  const studentDetailCapture = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
  const studentDetailFile = path.join(outputDir, 'student-detail-mobile.png');
  fs.writeFileSync(studentDetailFile, Buffer.from(studentDetailCapture.data, 'base64'));
  results.push({ route: '/students/1', viewport: 'mobile', ...studentDetailState, screenshot: studentDetailFile });

  await setViewport(1440, 900);
  await navigate(`${webUrl}/classes`, 900);
  const modalTrigger = await evaluate(`(() => {
    const button = Array.from(document.querySelectorAll('button')).find((node) => node.textContent?.includes('Thêm lớp'));
    button?.click();
    return { triggerFound: Boolean(button) };
  })()`);
  await sleep(200);
  const modalState = await evaluate(`(() => {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return { dialogFound: false };
    const rect = dialog.getBoundingClientRect();
    return { dialogFound: true, fitsViewport: rect.top >= 0 && rect.bottom <= window.innerHeight + 1, dialogHeight: rect.height };
  })()`);
  results.push({ route: '/classes#create-modal', ...modalTrigger, ...modalState });

  await navigate(`${webUrl}/classes`, 900);
  const confirmationTrigger = await evaluate(`(() => {
    const button = document.querySelector('button[aria-label="Xóa lớp"]');
    button?.click();
    return { triggerFound: Boolean(button) };
  })()`);
  await sleep(150);
  const confirmationState = await evaluate(`(() => {
    const dialog = document.querySelector('[role="dialog"]');
    const cancel = Array.from(dialog?.querySelectorAll('button') || []).find((node) => node.textContent?.trim() === 'Hủy');
    const state = {
      dialogFound: Boolean(dialog),
      titleFound: Boolean(dialog?.textContent?.includes('Xóa lớp học?')),
      cancelFocused: document.activeElement === cancel,
    };
    cancel?.click();
    return state;
  })()`);
  results.push({ route: '/classes#delete-confirmation', ...confirmationTrigger, ...confirmationState });

  await setViewport(390, 844);
  for (const account of [
    { role: 'teacher', email: 'teacher@school.com' },
    { role: 'student', email: 'student@school.com' },
    { role: 'parent', email: 'parent@school.com' }
  ]) {
    const issueStart = runtimeIssues.length;
    const session = await evaluate(`(async () => {
      localStorage.clear(); sessionStorage.clear();
      const response = await fetch(${JSON.stringify(`${apiUrl}/auth/login`)}, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ${JSON.stringify(account.email)}, password: '123456' })
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || 'Role login failed');
      localStorage.setItem('token', json.data.token);
      localStorage.setItem('user', JSON.stringify(json.data.user));
      return json.data.user.role;
    })()`);
    await navigate(`${webUrl}/dashboard`, 1200);
    const state = await evaluate(`({
      path: location.pathname,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      alertText: Array.from(document.querySelectorAll('[role="alert"]')).map((node) => node.textContent?.trim()).filter(Boolean),
      bodyText: document.body.innerText.slice(0, 500)
    })`);
    results.push({ viewport: 'mobile', role: account.role, session, ...state, runtimeIssues: runtimeIssues.slice(issueStart) });
  }
  const failures = [];
  for (const result of results) {
    if (result.overflowX) failures.push(`${result.route || result.viewport}: horizontal overflow`);
    if (result.alertText?.length) failures.push(`${result.route || result.viewport}: ${result.alertText.join('; ')}`);
    if (result.runtimeIssues?.length) failures.push(`${result.route || result.viewport}: ${result.runtimeIssues.join('; ')}`);
  }
  if (!accountTrigger.checkboxFound || !accountFields.passwordFound || !accountFields.passwordRequired) failures.push('Student account fields are incomplete');
  if (!Object.values(studentFormState.requiredLabels).every(Boolean) || studentFormState.controls < 20) failures.push('Student profile form is incomplete');
  if (!studentDetailState.hasProfileTabs || studentDetailState.path !== '/students/1') failures.push('Student detail page did not render');
  if (!modalTrigger.triggerFound || !modalState.dialogFound || !modalState.fitsViewport) failures.push('Class editor modal failed visual check');
  if (!confirmationTrigger.triggerFound || !confirmationState.dialogFound || !confirmationState.titleFound || !confirmationState.cancelFocused) failures.push('Confirmation dialog failed interaction check');
  if (runtimeIssues.length) failures.push(...runtimeIssues.map((issue) => `browser runtime: ${issue}`));
  process.stdout.write(`${JSON.stringify({ outputDir, results, runtimeIssues, failures }, null, 2)}\n`);
  if (failures.length) process.exitCode = 1;
} finally {
  if (socket?.readyState === WebSocket.OPEN) socket.close();
  chrome.kill();
  await sleep(150);
  if (profileDir.startsWith(path.resolve(os.tmpdir()))) fs.rmSync(profileDir, { recursive: true, force: true });
}
