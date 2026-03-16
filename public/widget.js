(function () {
  "use strict";

  var script = document.currentScript;
  if (!script) return;

  var projectKey = script.getAttribute("data-project-key");
  var apiBase = script.src.replace(/\/widget\.js.*$/, "");
  var lang = script.getAttribute("data-lang") || document.documentElement.lang || "ja";

  if (!projectKey) {
    console.error("[OmniVOC] data-project-key is required");
    return;
  }

  // i18n
  var i18n = {
    ja: {
      title: "フィードバックを送る",
      placeholder: "ご意見・ご要望をお聞かせください",
      submit: "送信",
      sending: "送信中...",
      thanks: "ありがとうございます！<br>フィードバックを受け付けました。",
      error: "送信失敗。もう一度お試しください",
      tooltip: "フィードバックを送る",
    },
    en: {
      title: "Send Feedback",
      placeholder: "Share your thoughts or suggestions",
      submit: "Submit",
      sending: "Sending...",
      thanks: "Thank you!<br>Your feedback has been received.",
      error: "Failed to send. Please try again.",
      tooltip: "Send feedback",
    },
  };
  var t = i18n[lang] || i18n.en;

  // スタイル
  var style = document.createElement("style");
  style.textContent =
    "#omnivoc-btn{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;background:#000;color:#fff;border:none;cursor:pointer;font-size:24px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,.15);z-index:99999;transition:transform .2s}" +
    "#omnivoc-btn:hover{transform:scale(1.1)}" +
    "#omnivoc-panel{position:fixed;bottom:96px;right:24px;width:360px;max-width:calc(100vw - 48px);background:#fff;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.12);z-index:99999;font-family:system-ui,-apple-system,sans-serif;display:none}" +
    "#omnivoc-panel.open{display:block}" +
    "#omnivoc-panel header{padding:16px;border-bottom:1px solid #eee;font-weight:600;font-size:14px}" +
    "#omnivoc-panel .body{padding:16px}" +
    "#omnivoc-panel textarea{width:100%;height:120px;border:1px solid #ddd;border-radius:8px;padding:12px;font-size:14px;resize:vertical;box-sizing:border-box}" +
    "#omnivoc-panel textarea:focus{outline:none;border-color:#000}" +
    "#omnivoc-panel button.submit{width:100%;margin-top:12px;padding:10px;background:#000;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer}" +
    "#omnivoc-panel button.submit:hover{background:#333}" +
    "#omnivoc-panel button.submit:disabled{opacity:.5;cursor:default}" +
    "#omnivoc-panel .thanks{text-align:center;padding:24px;color:#666;font-size:14px}";
  document.head.appendChild(style);

  // ボタン
  var btn = document.createElement("button");
  btn.id = "omnivoc-btn";
  btn.innerHTML = "&#9993;";
  btn.title = t.tooltip;
  document.body.appendChild(btn);

  // パネル
  var panel = document.createElement("div");
  panel.id = "omnivoc-panel";
  document.body.appendChild(panel);

  function renderForm() {
    panel.innerHTML =
      "<header>" + t.title + "</header>" +
      '<div class="body">' +
      '<textarea id="omnivoc-input" placeholder="' + t.placeholder + '"></textarea>' +
      '<button class="submit" id="omnivoc-submit">' + t.submit + "</button>" +
      "</div>";
    document.getElementById("omnivoc-submit").addEventListener("click", handleSubmit);
  }

  renderForm();

  var isOpen = false;
  btn.addEventListener("click", function () {
    isOpen = !isOpen;
    panel.className = isOpen ? "open" : "";
    btn.innerHTML = isOpen ? "&#10005;" : "&#9993;";
  });

  function handleSubmit() {
    var input = document.getElementById("omnivoc-input");
    var submitBtn = document.getElementById("omnivoc-submit");
    var content = input.value.trim();
    if (!content) return;

    submitBtn.disabled = true;
    submitBtn.textContent = t.sending;

    fetch(apiBase + "/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_key: projectKey,
        channel: "web",
        content: content,
      }),
    })
      .then(function (res) {
        if (res.ok) {
          panel.querySelector(".body").innerHTML =
            '<div class="thanks">' + t.thanks + "</div>";
          setTimeout(function () {
            isOpen = false;
            panel.className = "";
            btn.innerHTML = "&#9993;";
            renderForm();
          }, 2000);
        } else {
          submitBtn.disabled = false;
          submitBtn.textContent = t.error;
        }
      })
      .catch(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = t.error;
      });
  }
})();
