"use client";

import { useState, useEffect, useCallback } from "react";

interface Project {
  id: string;
  project_key: string;
  display_name: string;
  repo_full_name: string | null;
  created_at: string;
}

interface Feedback {
  id: string;
  project_id: string;
  channel: string;
  content: string;
  status: string;
  ai_confidence: number | null;
  ai_reason: string | null;
  suggested_issue_url: string | null;
  reviewed: boolean;
  sender_name: string | null;
  source_url: string | null;
  created_at: string;
  projects: {
    display_name: string;
    project_key: string;
    repo_full_name: string | null;
  };
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  auto_new: { label: "新規", color: "bg-blue-100 text-blue-800" },
  auto_linked: { label: "AI: 類似", color: "bg-yellow-100 text-yellow-800" },
  auto_resolved: { label: "AI: 対応済", color: "bg-gray-100 text-gray-800" },
  ticketed: { label: "チケット化済", color: "bg-green-100 text-green-800" },
  resolved: { label: "解決済み", color: "bg-gray-200 text-gray-600" },
};

const CHANNEL_LABELS: Record<string, string> = {
  web: "Web",
  slack: "Slack",
  line: "LINE",
};

export default function DashboardPage() {
  const [authUser, setAuthUser] = useState<{ user: string; avatar: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filterProject, setFilterProject] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterChannel, setFilterChannel] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // チケット化モーダル
  const [ticketModal, setTicketModal] = useState<{
    feedbackIds: string[];
    content: string;
    repoFullName: string;
  } | null>(null);
  const [ticketTitle, setTicketTitle] = useState("");
  const [ticketBody, setTicketBody] = useState("");
  const [generating, setGenerating] = useState(false);

  // プロジェクト登録モーダル
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectRepoUrl, setNewProjectRepoUrl] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [repoChecking, setRepoChecking] = useState(false);
  const [repoError, setRepoError] = useState("");
  const [repoVerified, setRepoVerified] = useState(false);

  const fetchFeedbacks = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterProject) params.set("project_id", filterProject);
    if (filterStatus) params.set("status", filterStatus);
    if (filterChannel) params.set("channel", filterChannel);
    const res = await fetch(`/api/feedbacks?${params}`);
    const data = await res.json();
    setFeedbacks(data);
    setLoading(false);
  }, [filterProject, filterStatus, filterChannel]);

  const fetchProjects = async () => {
    const res = await fetch("/api/projects");
    const data = await res.json();
    setProjects(data);
  };

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          setAuthUser({ user: data.user, avatar: data.avatar });
        }
        setAuthChecked(true);
      });
  }, []);

  useEffect(() => {
    if (authUser) fetchProjects();
  }, [authUser]);
  useEffect(() => {
    if (authUser) fetchFeedbacks();
  }, [fetchFeedbacks, authUser]);

  const handleReview = async (
    id: string,
    action: "approve" | "reject" | "relink",
    issueUrl?: string
  ) => {
    setActionLoading(id);
    await fetch(`/api/feedbacks/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, issue_url: issueUrl }),
    });
    await fetchFeedbacks();
    setActionLoading(null);
  };

  // チケット化モーダルを開く + AI でタイトル・本文生成
  const openTicketModal = async (feedbackIds: string[]) => {
    const selected = feedbacks.filter((f) => feedbackIds.includes(f.id));
    const content = selected.map((f) => f.content).join("\n\n---\n\n");
    const repoFullName = selected[0]?.projects?.repo_full_name || "";
    setTicketModal({ feedbackIds, content, repoFullName });
    setTicketTitle("");
    setTicketBody(content);

    // AI 生成
    setGenerating(true);
    try {
      const url =
        feedbackIds.length === 1
          ? `/api/feedbacks/${feedbackIds[0]}/generate-issue`
          : "/api/feedbacks/generate-issue-bulk";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback_ids: feedbackIds }),
      });
      const data = await res.json();
      setTicketTitle(data.title || "");
      setTicketBody(data.body || content);
    } catch {
      // フォールバック: 元のコンテンツのまま
    }
    setGenerating(false);
  };

  const handleTicketize = async () => {
    if (!ticketModal) return;
    setActionLoading("ticketize");
    if (ticketModal.feedbackIds.length === 1) {
      await fetch(`/api/feedbacks/${ticketModal.feedbackIds[0]}/ticketize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_full_name: ticketModal.repoFullName,
          title: ticketTitle,
          issue_body: ticketBody,
        }),
      });
    } else {
      await fetch("/api/feedbacks/ticketize-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback_ids: ticketModal.feedbackIds,
          repo_full_name: ticketModal.repoFullName,
          title: ticketTitle,
          issue_body: ticketBody,
        }),
      });
    }
    setTicketModal(null);
    setSelectedIds(new Set());
    await fetchFeedbacks();
    setActionLoading(null);
  };

  // プロジェクト登録: リポジトリ URL → 解析
  const parseRepoFullName = (url: string): string | null => {
    // https://github.com/owner/repo or owner/repo
    const match = url.match(
      /(?:https?:\/\/github\.com\/)?([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/
    );
    return match ? match[1].replace(/\.git$/, "") : null;
  };

  const handleCheckRepo = async () => {
    setRepoError("");
    setRepoVerified(false);
    const repoFullName = parseRepoFullName(newProjectRepoUrl);
    if (!repoFullName) {
      setRepoError("リポジトリ URL の形式が正しくありません");
      return;
    }
    setRepoChecking(true);
    try {
      const res = await fetch(
        `/api/github/repos?repo=${encodeURIComponent(repoFullName)}`
      );
      if (!res.ok) {
        setRepoError(
          "リポジトリにアクセスできません。URL と権限を確認してください。"
        );
        setRepoChecking(false);
        return;
      }
      const data = await res.json();
      setNewProjectName(data.name);
      setRepoVerified(true);
      if (!data.has_issues) {
        setRepoError("このリポジトリは Issues が無効です");
        setRepoVerified(false);
      }
    } catch {
      setRepoError("確認中にエラーが発生しました");
    }
    setRepoChecking(false);
  };

  const handleCreateProject = async () => {
    const repoFullName = parseRepoFullName(newProjectRepoUrl);
    if (!repoFullName || !repoVerified) return;
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: newProjectName,
        repo_full_name: repoFullName,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setRepoError(data.error || "登録に失敗しました");
      return;
    }
    setShowProjectModal(false);
    setNewProjectRepoUrl("");
    setNewProjectName("");
    setRepoVerified(false);
    setRepoError("");
    await fetchProjects();
  };

  const handleDeleteProject = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "削除に失敗しました");
      return;
    }
    await fetchProjects();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthUser(null);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-6">
        <h1 className="text-3xl font-bold">OmniVOC</h1>
        <p className="text-gray-500">ダッシュボードにアクセスするには GitHub でログインしてください</p>
        {typeof window !== "undefined" &&
          new URLSearchParams(window.location.search).get("error") && (
            <p className="text-sm text-red-600">
              認証エラー: {new URLSearchParams(window.location.search).get("error")}
            </p>
          )}
        <a
          href="/api/auth/login"
          className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800"
        >
          GitHub でログイン
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">OmniVOC Dashboard</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {authUser.avatar && (
              <img src={authUser.avatar} alt="" className="w-6 h-6 rounded-full" />
            )}
            {authUser.user}
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            ログアウト
          </button>
          <button
            onClick={() => setShowProjectModal(true)}
            className="bg-black text-white px-4 py-2 rounded text-sm hover:bg-gray-800"
          >
            + プロジェクト登録
          </button>
        </div>
      </header>

      {/* プロジェクト一覧 */}
      {projects.length > 0 && (
        <div className="px-6 py-3 flex gap-2 flex-wrap">
          {projects.map((p) => (
            <div
              key={p.id}
              className="bg-white border rounded px-3 py-1.5 text-xs flex items-center gap-2"
            >
              <span className="font-medium">{p.display_name}</span>
              <span className="text-gray-400">{p.repo_full_name}</span>
              <a
                href={`/board/${p.project_key}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
                title="公開ボード"
              >
                Board
              </a>
              <button
                onClick={() => handleDeleteProject(p.id, p.display_name)}
                className="text-red-400 hover:text-red-600"
                title="削除"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      {/* フィルター */}
      <div className="px-6 py-4 flex gap-4 items-center flex-wrap">
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value="">全プロジェクト</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.display_name}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value="">全ステータス</option>
          <option value="auto_new">新規</option>
          <option value="auto_linked">AI: 類似</option>
          <option value="auto_resolved">AI: 対応済</option>
          <option value="ticketed">チケット化済</option>
          <option value="resolved">解決済み</option>
        </select>
        <select
          value={filterChannel}
          onChange={(e) => setFilterChannel(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value="">全チャネル</option>
          <option value="web">Web</option>
          <option value="slack">Slack</option>
          <option value="line">LINE</option>
        </select>
        <button
          onClick={fetchFeedbacks}
          className="text-sm text-blue-600 hover:underline"
        >
          更新
        </button>
        {selectedIds.size > 0 && (
          <button
            onClick={() => openTicketModal(Array.from(selectedIds))}
            className="ml-auto bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700"
          >
            まとめてチケット化 ({selectedIds.size}件)
          </button>
        )}
      </div>

      {/* フィードバック一覧 */}
      <div className="px-6">
        {loading ? (
          <p className="text-gray-500 py-8 text-center">読み込み中...</p>
        ) : feedbacks.length === 0 ? (
          <p className="text-gray-500 py-8 text-center">
            フィードバックがありません
          </p>
        ) : (
          <div className="space-y-3">
            {feedbacks.map((fb) => {
              const statusInfo = STATUS_LABELS[fb.status] || {
                label: fb.status,
                color: "bg-gray-100",
              };
              return (
                <div
                  key={fb.id}
                  className="bg-white border rounded-lg p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(fb.id)}
                      onChange={() => toggleSelect(fb.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                        <span className="text-xs text-gray-500">
                          {fb.projects?.display_name}
                        </span>
                        <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                          {CHANNEL_LABELS[fb.channel] || fb.channel}
                        </span>
                        {fb.sender_name && (
                          <span className="text-xs text-gray-500">
                            by {fb.sender_name}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {new Date(fb.created_at).toLocaleString("ja-JP")}
                        </span>
                        {fb.reviewed && (
                          <span className="text-xs text-green-600">
                            確認済
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-800 mb-2">{fb.content}</p>

                      {/* 送信元 URL */}
                      {fb.source_url && (
                        <div className="text-xs text-gray-400 mb-2">
                          <a
                            href={fb.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            {fb.source_url}
                          </a>
                        </div>
                      )}

                      {fb.ai_reason && (
                        <div className="text-xs text-gray-500 mb-2">
                          AI:{" "}
                          {fb.ai_confidence !== null &&
                            `(${Math.round(fb.ai_confidence * 100)}%) `}
                          {fb.ai_reason}
                          {fb.suggested_issue_url && (
                            <>
                              {" → "}
                              <a
                                href={fb.suggested_issue_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {fb.suggested_issue_url
                                  .split("/")
                                  .slice(-2)
                                  .join(" #")}
                              </a>
                            </>
                          )}
                        </div>
                      )}

                      {!fb.reviewed && (
                        <div className="flex gap-2">
                          {(fb.status === "auto_linked" ||
                            fb.status === "auto_resolved") && (
                            <>
                              <button
                                onClick={() => handleReview(fb.id, "approve")}
                                disabled={actionLoading === fb.id}
                                className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded border border-green-200 hover:bg-green-100 disabled:opacity-50"
                              >
                                承認
                              </button>
                              <button
                                onClick={() => handleReview(fb.id, "reject")}
                                disabled={actionLoading === fb.id}
                                className="text-xs bg-red-50 text-red-700 px-3 py-1 rounded border border-red-200 hover:bg-red-100 disabled:opacity-50"
                              >
                                棄却
                              </button>
                            </>
                          )}
                          {fb.status === "auto_new" && (
                            <button
                              onClick={() => openTicketModal([fb.id])}
                              className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded border border-blue-200 hover:bg-blue-100"
                            >
                              チケット化
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* チケット化モーダル */}
      {ticketModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
            <h2 className="text-lg font-bold mb-4">GitHub Issue を作成</h2>
            {generating && (
              <p className="text-sm text-gray-500 mb-3">
                AI がタイトル・本文を生成中...
              </p>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  リポジトリ
                </label>
                <input
                  type="text"
                  value={ticketModal.repoFullName}
                  onChange={(e) =>
                    setTicketModal({
                      ...ticketModal,
                      repoFullName: e.target.value,
                    })
                  }
                  placeholder="owner/repo"
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  タイトル
                </label>
                <input
                  type="text"
                  value={ticketTitle}
                  onChange={(e) => setTicketTitle(e.target.value)}
                  placeholder={generating ? "生成中..." : "Issue タイトル"}
                  className="w-full border rounded px-3 py-2 text-sm"
                  disabled={generating}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">本文</label>
                <textarea
                  value={ticketBody}
                  onChange={(e) => setTicketBody(e.target.value)}
                  rows={6}
                  className="w-full border rounded px-3 py-2 text-sm"
                  disabled={generating}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setTicketModal(null)}
                className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleTicketize}
                disabled={
                  !ticketTitle ||
                  !ticketModal.repoFullName ||
                  actionLoading === "ticketize" ||
                  generating
                }
                className="px-4 py-2 text-sm bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* プロジェクト登録モーダル */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
            <h2 className="text-lg font-bold mb-4">プロジェクト登録</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  GitHub リポジトリ URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newProjectRepoUrl}
                    onChange={(e) => {
                      setNewProjectRepoUrl(e.target.value);
                      setRepoVerified(false);
                      setRepoError("");
                    }}
                    placeholder="https://github.com/owner/repo"
                    className="flex-1 border rounded px-3 py-2 text-sm"
                  />
                  <button
                    onClick={handleCheckRepo}
                    disabled={!newProjectRepoUrl || repoChecking}
                    className="px-4 py-2 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
                  >
                    {repoChecking ? "確認中..." : "確認"}
                  </button>
                </div>
                {repoError && (
                  <p className="text-xs text-red-600 mt-1">{repoError}</p>
                )}
                {repoVerified && !repoError && (
                  <p className="text-xs text-green-600 mt-1">
                    リポジトリを確認しました
                  </p>
                )}
              </div>
              {repoVerified && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    表示名
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowProjectModal(false);
                  setNewProjectRepoUrl("");
                  setNewProjectName("");
                  setRepoVerified(false);
                  setRepoError("");
                }}
                className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!repoVerified || !newProjectName}
                className="px-4 py-2 text-sm bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
              >
                登録
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
