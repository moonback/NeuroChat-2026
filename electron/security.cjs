function assertMainOrigin(event) {
  const senderUrl = event.sender.getURL();
  const isDev = !!process.env.VITE_DEV_SERVER_URL;
  
  if (isDev) {
    if (!senderUrl.startsWith(process.env.VITE_DEV_SERVER_URL)) {
      throw new Error(`IPC Security: Origin mismatch (Dev). Expected ${process.env.VITE_DEV_SERVER_URL}, got ${senderUrl}`);
    }
  } else {
    // In production, the URL is file:///.../index.html
    if (!senderUrl.startsWith('file://')) {
      throw new Error(`IPC Security: Origin mismatch (Prod). Expected file://, got ${senderUrl}`);
    }
  }
}

module.exports = { assertMainOrigin };
