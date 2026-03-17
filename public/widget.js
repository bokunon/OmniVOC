(function () {
  "use strict";

  var script = document.currentScript;
  if (!script) return;

  var projectKey = script.getAttribute("data-project-key");
  var apiBase = script.src.replace(/\/widget\.js.*$/, "");
  var lang = script.getAttribute("data-lang") || document.documentElement.lang || "ja";
  var customMessage = script.getAttribute("data-message");

  if (!projectKey) {
    console.error("[OmniVOC] data-project-key is required");
    return;
  }

  var i18n = {
    ja: {
      placeholder: "バグ報告/追加要望",
      submit: "送信",
      sending: "送信中...",
      thanks: "ありがとうございます！",
      error: "送信失敗",
      mobileBtn: "バグ報告/追加要望",
    },
    en: {
      placeholder: "Bug Report / Feature Request",
      submit: "Submit",
      sending: "Sending...",
      thanks: "Thank you!",
      error: "Failed to send",
      mobileBtn: "Bug Report / Feature Request",
    },
  };
  var t = i18n[lang] || i18n.en;
  var label = customMessage || t.placeholder;
  var isMobile = window.innerWidth < 768;

  var style = document.createElement("style");
  style.textContent =
    /* PC: 常時テキストボックス */
    "#omnivoc-pc{position:fixed;bottom:24px;right:24px;width:340px;z-index:99999;font-family:system-ui,-apple-system,sans-serif}" +
    "#omnivoc-pc .bar{display:flex;gap:8px;align-items:stretch}" +
    "#omnivoc-pc textarea{flex:1;border:1px solid #ddd;border-radius:8px;padding:10px 12px;font-size:13px;resize:none;height:42px;box-sizing:border-box;transition:height .2s}" +
    "#omnivoc-pc textarea:focus{outline:none;border-color:#000;height:80px}" +
    "#omnivoc-pc .send{background:#000;color:#fff;border:none;border-radius:8px;padding:0 16px;font-size:13px;cursor:pointer;white-space:nowrap;opacity:0;transition:opacity .2s;pointer-events:none}" +
    "#omnivoc-pc .send.show{opacity:1;pointer-events:auto}" +
    "#omnivoc-pc .send:hover{background:#333}" +
    "#omnivoc-pc .send:disabled{opacity:.5}" +
    "#omnivoc-pc .msg{text-align:center;padding:8px;font-size:12px;color:#666}" +
    /* モバイル: 文言ボタン → 展開 */
    "#omnivoc-mob-btn{position:fixed;bottom:24px;right:24px;background:#000;color:#fff;border:none;border-radius:24px;padding:10px 20px;font-size:13px;cursor:pointer;z-index:99999;font-family:system-ui,-apple-system,sans-serif;box-shadow:0 4px 12px rgba(0,0,0,.15)}" +
    "#omnivoc-mob-panel{position:fixed;bottom:24px;right:24px;left:24px;background:#fff;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.12);z-index:99999;font-family:system-ui,-apple-system,sans-serif;display:none;padding:16px}" +
    "#omnivoc-mob-panel.open{display:block}" +
    "#omnivoc-mob-panel textarea{width:100%;height:80px;border:1px solid #ddd;border-radius:8px;padding:10px;font-size:14px;resize:none;box-sizing:border-box;margin-bottom:8px}" +
    "#omnivoc-mob-panel textarea:focus{outline:none;border-color:#000}" +
    "#omnivoc-mob-panel .actions{display:flex;gap:8px}" +
    "#omnivoc-mob-panel .send{flex:1;background:#000;color:#fff;border:none;border-radius:8px;padding:10px;font-size:14px;cursor:pointer}" +
    "#omnivoc-mob-panel .cancel{flex:0;background:#eee;color:#333;border:none;border-radius:8px;padding:10px 16px;font-size:14px;cursor:pointer}" +
    "#omnivoc-mob-panel .msg{text-align:center;padding:8px;font-size:13px;color:#666}";
  document.head.appendChild(style);

  function postFeedback(content, onSuccess, onError) {
    fetch(apiBase + "/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_key: projectKey,
        channel: "web",
        content: content,
        source_url: window.location.href,
      }),
    })
      .then(function (res) { res.ok ? onSuccess() : onError(); })
      .catch(onError);
  }

  if (!isMobile) {
    /* === PC === */
    var pc = document.createElement("div");
    pc.id = "omnivoc-pc";
    pc.innerHTML =
      '<div class="bar">' +
      '<textarea placeholder="' + label + '"></textarea>' +
      '<button class="send">' + t.submit + "</button>" +
      "</div>";
    document.body.appendChild(pc);

    var pcTextarea, pcSend;

    function bindPcEvents() {
      pcTextarea = pc.querySelector("textarea");
      pcSend = pc.querySelector(".send");
      pcTextarea.addEventListener("focus", function () {
        pcSend.classList.add("show");
      });
      pcTextarea.addEventListener("blur", function () {
        setTimeout(function () {
          if (!pcTextarea.value.trim()) pcSend.classList.remove("show");
        }, 200);
      });
      pcSend.addEventListener("click", handlePcSubmit);
    }

    function handlePcSubmit() {
      var content = pcTextarea.value.trim();
      if (!content) return;
      pcSend.disabled = true;
      pcSend.textContent = t.sending;
      postFeedback(
        content,
        function () {
          pc.querySelector(".bar").innerHTML =
            '<div class="msg">' + t.thanks + "</div>";
          setTimeout(function () {
            pc.querySelector(".bar").innerHTML =
              '<textarea placeholder="' + label + '"></textarea>' +
              '<button class="send">' + t.submit + "</button>";
            bindPcEvents();
          }, 2000);
        },
        function () {
          pcSend.disabled = false;
          pcSend.textContent = t.error;
        }
      );
    }

    bindPcEvents();
  } else {
    /* === モバイル === */
    var mobBtn = document.createElement("button");
    mobBtn.id = "omnivoc-mob-btn";
    mobBtn.textContent = customMessage || t.mobileBtn;
    document.body.appendChild(mobBtn);

    var mobPanel = document.createElement("div");
    mobPanel.id = "omnivoc-mob-panel";
    document.body.appendChild(mobPanel);

    function renderMobForm() {
      mobPanel.innerHTML =
        '<textarea placeholder="' + label + '"></textarea>' +
        '<div class="actions">' +
        '<button class="cancel">x</button>' +
        '<button class="send">' + t.submit + "</button>" +
        "</div>";
      mobPanel.querySelector(".cancel").addEventListener("click", closeMob);
      mobPanel.querySelector(".send").addEventListener("click", submitMob);
    }

    function openMob() {
      mobBtn.style.display = "none";
      mobPanel.className = "open";
      renderMobForm();
      mobPanel.querySelector("textarea").focus();
    }

    function closeMob() {
      mobPanel.className = "";
      mobBtn.style.display = "";
    }

    function submitMob() {
      var ta = mobPanel.querySelector("textarea");
      var btn = mobPanel.querySelector(".send");
      var content = ta.value.trim();
      if (!content) return;
      btn.disabled = true;
      btn.textContent = t.sending;
      postFeedback(
        content,
        function () {
          mobPanel.innerHTML = '<div class="msg">' + t.thanks + "</div>";
          setTimeout(closeMob, 2000);
        },
        function () {
          btn.disabled = false;
          btn.textContent = t.error;
        }
      );
    }

    mobBtn.addEventListener("click", openMob);
  }
})();
