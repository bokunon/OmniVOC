(function () {
  "use strict";

  var script = document.currentScript;
  if (!script) return;

  var projectKey = script.getAttribute("data-project-key");
  var apiBase = script.src.replace(/\/board\.js.*$/, "");
  var lang = script.getAttribute("data-lang") || document.documentElement.lang || "ja";

  if (!projectKey) {
    console.error("[OmniVOC Board] data-project-key is required");
    return;
  }

  var i18n = {
    ja: {
      title: "追加要望ボード",
      subtitle: "ほしい機能に投票、コメントできます",
      empty: "まだ要望がありません",
      comment: "コメント",
      post: "投稿",
      name: "名前（任意）",
      addComment: "コメントを追加...",
      loading: "読み込み中...",
    },
    en: {
      title: "Feature Requests",
      subtitle: "Vote for features you want, or add your thoughts",
      empty: "No feature requests yet",
      comment: "comments",
      post: "Post",
      name: "Name (optional)",
      addComment: "Add a comment...",
      loading: "Loading...",
    },
  };
  var t = i18n[lang] || i18n.en;

  function getVoterId() {
    var key = "omnivoc_voter_id";
    var id = localStorage.getItem(key);
    if (!id) {
      id = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, function (c) {
        return (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16);
      });
      localStorage.setItem(key, id);
    }
    return id;
  }

  var container = document.createElement("div");
  container.id = "omnivoc-board";
  script.parentNode.insertBefore(container, script.nextSibling);

  var style = document.createElement("style");
  style.textContent =
    "#omnivoc-board{font-family:system-ui,-apple-system,sans-serif;max-width:640px;margin:0 auto}" +
    "#omnivoc-board .hdr{margin-bottom:16px}" +
    "#omnivoc-board .hdr h2{font-size:18px;font-weight:700;margin:0}" +
    "#omnivoc-board .hdr p{font-size:13px;color:#888;margin:4px 0 0}" +
    "#omnivoc-board .item{background:#fff;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px}" +
    "#omnivoc-board .row{display:flex;align-items:flex-start;gap:12px;padding:12px}" +
    "#omnivoc-board .vote{display:flex;flex-direction:column;align-items:center;min-width:44px;padding:6px 4px;border-radius:6px;border:1px solid #e5e7eb;background:#f9fafb;cursor:pointer;font-size:13px}" +
    "#omnivoc-board .vote:hover{background:#f0f0f0}" +
    "#omnivoc-board .vote.active{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8}" +
    "#omnivoc-board .vote .n{font-weight:700}" +
    "#omnivoc-board .body{flex:1;min-width:0}" +
    "#omnivoc-board .body .src{display:block;font-size:11px;color:#9ca3af;text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;margin-bottom:2px}" +
    "#omnivoc-board .body .src:hover{color:#3b82f6}" +
    "#omnivoc-board .body p{font-size:14px;color:#1f2937;margin:0}" +
    "#omnivoc-board .meta{display:flex;gap:12px;margin-top:6px;font-size:12px;color:#9ca3af}" +
    "#omnivoc-board .meta a{color:#3b82f6;text-decoration:none}" +
    "#omnivoc-board .meta button{background:none;border:none;color:#9ca3af;cursor:pointer;padding:0;font-size:12px}" +
    "#omnivoc-board .meta button:hover{color:#6b7280}" +
    "#omnivoc-board .cmt{border-top:1px solid #e5e7eb;padding:12px;background:#f9fafb}" +
    "#omnivoc-board .cmt-item{font-size:13px;margin-bottom:8px}" +
    "#omnivoc-board .cmt-item .author{font-weight:600;color:#374151}" +
    "#omnivoc-board .cmt-item .date{font-size:11px;color:#9ca3af;margin-left:6px}" +
    "#omnivoc-board .cmt-item p{color:#4b5563;margin:2px 0 0}" +
    "#omnivoc-board .cmt-form{display:flex;gap:6px;margin-top:8px}" +
    "#omnivoc-board .cmt-form input{border:1px solid #ddd;border-radius:6px;padding:6px 8px;font-size:13px}" +
    "#omnivoc-board .cmt-form input:focus{outline:none;border-color:#000}" +
    "#omnivoc-board .cmt-form input.name{width:90px}" +
    "#omnivoc-board .cmt-form input.text{flex:1}" +
    "#omnivoc-board .cmt-form button{background:#000;color:#fff;border:none;border-radius:6px;padding:6px 12px;font-size:13px;cursor:pointer}" +
    "#omnivoc-board .empty{text-align:center;padding:32px;color:#9ca3af;font-size:14px}";
  document.head.appendChild(style);

  var votedIds = JSON.parse(localStorage.getItem("omnivoc_votes_" + projectKey) || "[]");
  var expandedId = null;

  function render(items) {
    if (!items || items.length === 0) {
      container.innerHTML = '<div class="hdr"><h2>' + t.title + "</h2><p>" + t.subtitle + '</p></div><div class="empty">' + t.empty + "</div>";
      return;
    }

    var html = '<div class="hdr"><h2>' + t.title + "</h2><p>" + t.subtitle + "</p></div>";
    items.forEach(function (item) {
      var isVoted = votedIds.indexOf(item.id) !== -1;
      html += '<div class="item" data-id="' + item.id + '">';
      html += '<div class="row">';
      html += '<div class="vote' + (isVoted ? " active" : "") + '" data-vote="' + item.id + '">';
      html += "<span>" + (isVoted ? "\u25B2" : "\u25B3") + '</span><span class="n">' + item.votes + "</span></div>";
      html += '<div class="body">';
      if (item.source_url) html += '<a class="src" href="' + escHtml(item.source_url) + '" target="_blank" title="' + escHtml(item.source_url) + '">\uD83D\uDCC4 ' + escHtml(item.source_url) + "</a>";
      html += "<p>" + escHtml(item.content) + "</p>";
      html += '<div class="meta">';
      if (item.issue_url) html += '<a href="' + item.issue_url + '" target="_blank">#' + item.issue_number + "</a>";
      html += '<button data-toggle="' + item.id + '">\uD83D\uDCAC ' + item.comments + "</button>";
      html += "<span>" + new Date(item.created_at).toLocaleDateString() + "</span>";
      html += "</div></div></div>";
      if (expandedId === item.id) {
        html += '<div class="cmt" id="cmt-' + item.id + '">' + t.loading + "</div>";
      }
      html += "</div>";
    });
    container.innerHTML = html;
    bindEvents(items);
    if (expandedId) loadComments(expandedId);
  }

  function escHtml(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function bindEvents(items) {
    container.querySelectorAll("[data-vote]").forEach(function (el) {
      el.addEventListener("click", function () {
        var id = el.getAttribute("data-vote");
        vote(id, items);
      });
    });
    container.querySelectorAll("[data-toggle]").forEach(function (el) {
      el.addEventListener("click", function () {
        var id = el.getAttribute("data-toggle");
        expandedId = expandedId === id ? null : id;
        render(items);
      });
    });
  }

  function vote(feedbackId, items) {
    fetch(apiBase + "/api/board/" + projectKey + "/" + feedbackId + "/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voter_id: getVoterId() }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var idx = votedIds.indexOf(feedbackId);
        if (data.voted && idx === -1) votedIds.push(feedbackId);
        if (!data.voted && idx !== -1) votedIds.splice(idx, 1);
        localStorage.setItem("omnivoc_votes_" + projectKey, JSON.stringify(votedIds));
        items.forEach(function (item) {
          if (item.id === feedbackId) item.votes += data.voted ? 1 : -1;
        });
        items.sort(function (a, b) { return b.votes - a.votes; });
        render(items);
      });
  }

  function loadComments(feedbackId) {
    var cmtEl = document.getElementById("cmt-" + feedbackId);
    if (!cmtEl) return;
    fetch(apiBase + "/api/board/" + projectKey + "/" + feedbackId + "/comments")
      .then(function (r) { return r.json(); })
      .then(function (comments) {
        var html = "";
        comments.forEach(function (c) {
          html += '<div class="cmt-item"><span class="author">' + escHtml(c.author_name || "Anonymous") + '</span><span class="date">' + new Date(c.created_at).toLocaleDateString() + "</span><p>" + escHtml(c.content) + "</p></div>";
        });
        html += '<div class="cmt-form">';
        html += '<input class="name" placeholder="' + t.name + '" id="cmt-name-' + feedbackId + '">';
        html += '<input class="text" placeholder="' + t.addComment + '" id="cmt-text-' + feedbackId + '">';
        html += "<button id=\"cmt-post-" + feedbackId + '">' + t.post + "</button></div>";
        cmtEl.innerHTML = html;
        document.getElementById("cmt-post-" + feedbackId).addEventListener("click", function () {
          postComment(feedbackId);
        });
        document.getElementById("cmt-text-" + feedbackId).addEventListener("keydown", function (e) {
          if (e.key === "Enter") postComment(feedbackId);
        });
      });
  }

  function postComment(feedbackId) {
    var text = document.getElementById("cmt-text-" + feedbackId).value.trim();
    if (!text) return;
    var name = document.getElementById("cmt-name-" + feedbackId).value.trim();
    fetch(apiBase + "/api/board/" + projectKey + "/" + feedbackId + "/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, author_name: name || null }),
    }).then(function () {
      loadComments(feedbackId);
      // コメント数を再取得
      fetch(apiBase + "/api/board/" + projectKey)
        .then(function (r) { return r.json(); })
        .then(render);
    });
  }

  // 初期読み込み
  container.innerHTML = '<div class="empty">' + t.loading + "</div>";
  fetch(apiBase + "/api/board/" + projectKey)
    .then(function (r) { return r.json(); })
    .then(render);
})();
