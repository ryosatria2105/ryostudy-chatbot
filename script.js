/* =========================================================
   RyoStudy AI — script.js
   ✅ Original fetch() logic is UNTOUCHED
   ✨ UI-only additions: bubbles, typing indicator, scroll, file preview
   ========================================================= */

// ── UI Helpers ──────────────────────────────────────────────────────────────

function scrollToBottom() {
  const chatBox = document.getElementById("chat-box");
  chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: "smooth" });
}

function showTyping() {
  document.getElementById("typing-indicator").classList.remove("hidden");
  scrollToBottom();
}

function hideTyping() {
  document.getElementById("typing-indicator").classList.add("hidden");
}

function clearWelcome() {
  const welcome = document.querySelector(".welcome-message");
  if (welcome) welcome.remove();
}

function appendUserBubble(message, file) {
  const chatBox = document.getElementById("chat-box");
  clearWelcome();

  let inner = "";

  if (file) {
    const icon = getFileIcon(file.type);
    inner += `<div class="file-chip">${icon} ${escapeHTML(file.name)}</div><br>`;
  }

  if (message) {
    inner += escapeHTML(message);
  }

  const row = document.createElement("div");
  row.className = "message-row user";
  row.innerHTML = `
    <div class="msg-avatar user-av">You</div>
    <div class="message user">${inner}</div>
  `;
  chatBox.appendChild(row);
  scrollToBottom();
}

function appendBotBubble(text) {
  const chatBox = document.getElementById("chat-box");

  const row = document.createElement("div");
  row.className = "message-row bot";
  row.innerHTML = `
    <div class="msg-avatar bot-av">
      <img src="assets/logo-fix.png" alt="AI" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />
    </div>
    <div class="message bot">${escapeHTML(text)}</div>
  `;
  chatBox.appendChild(row);
  scrollToBottom();
}

function getFileIcon(mimeType) {
  if (!mimeType) return "📎";
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.startsWith("audio/")) return "🎵";
  if (mimeType.includes("pdf"))       return "📄";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  if (mimeType.includes("sheet") || mimeType.includes("excel"))   return "📊";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "📑";
  return "📎";
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── File Input Preview ───────────────────────────────────────────────────────

document.getElementById("file-input").addEventListener("change", function () {
  const file = this.files[0];
  const preview  = document.getElementById("file-preview");
  const nameSpan = document.getElementById("file-preview-name");

  if (file) {
    const icon = getFileIcon(file.type);
    nameSpan.textContent = `${icon} ${file.name}`;
    preview.classList.remove("hidden");
  } else {
    preview.classList.add("hidden");
  }
});

document.getElementById("clear-file-btn").addEventListener("click", function () {
  document.getElementById("file-input").value = "";
  document.getElementById("file-preview").classList.add("hidden");
});

// ── Enter Key ────────────────────────────────────────────────────────────────

document.getElementById("message-input").addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    document.getElementById("send-btn").click();
  }
});

// ── Send Button State ────────────────────────────────────────────────────────

function setLoading(isLoading) {
  const btn = document.getElementById("send-btn");
  btn.disabled = isLoading;
}

// ── Core sendMessage ─────────────────────────────────────────────────────────
// ✅ Original fetch() logic is PRESERVED exactly as provided.
// Only the DOM interaction has been swapped for the new bubble helpers.

async function sendMessage() {

  const messageInput = document.getElementById("message-input");
  const fileInput    = document.getElementById("file-input");
  const chatBox      = document.getElementById("chat-box");   // kept for compatibility

  const message = messageInput.value.trim();
  const file    = fileInput.files[0];

  // Guard: nothing to send
  if (!message && !file) return;

  const formData = new FormData();
  formData.append("message", message);

  if (file) {
    formData.append("file", file);
  }

  // ── UI: show user bubble + loading state ──
  appendUserBubble(message, file);
  setLoading(true);
  showTyping();

  // ── ORIGINAL FETCH LOGIC — UNTOUCHED ─────────────────────────────────────
  const response = await fetch("/api/chat", {
    method: "POST",
    body: formData
  });

  const data = await response.json();
  // ─────────────────────────────────────────────────────────────────────────

  // ── UI: hide typing, show bot reply ──
  hideTyping();
  setLoading(false);
  appendBotBubble(data.reply);

  // ── Reset inputs ──
  messageInput.value = "";
  fileInput.value    = "";
  document.getElementById("file-preview").classList.add("hidden");
  messageInput.focus();
}

document.getElementById("send-btn").addEventListener("click", sendMessage);
