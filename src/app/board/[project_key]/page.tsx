"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";

interface BoardItem {
  id: string;
  content: string;
  source_url: string | null;
  created_at: string;
  feedback_type: string;
  issue_url: string | null;
  issue_number: number | null;
  votes: number;
  comments: number;
}

interface Comment {
  id: string;
  author_name: string | null;
  content: string;
  created_at: string;
}

const i18n = {
  ja: {
    title: "追加要望ボード",
    subtitle: "ほしい機能に投票、コメントできます",
    loading: "読み込み中...",
    empty: "まだ要望がありません",
    newLabel: "新しい要望・バグ報告を追加",
    newPlaceholder: "要望やバグを書いてください...",
    send: "送信",
    sending: "送信中...",
    sent: "送信しました！",
    anonymous: "匿名",
    namePlaceholder: "名前（任意）",
    commentPlaceholder: "コメントを追加...",
    post: "投稿",
  },
  en: {
    title: "Feature Requests",
    subtitle: "Vote for features you want, or add your thoughts",
    loading: "Loading...",
    empty: "No feature requests yet",
    newLabel: "Add a new request or bug report",
    newPlaceholder: "Describe your request or bug...",
    send: "Send",
    sending: "Sending...",
    sent: "Sent!",
    anonymous: "Anonymous",
    namePlaceholder: "Name (optional)",
    commentPlaceholder: "Add a comment...",
    post: "Post",
  },
} as const;

type Lang = keyof typeof i18n;
type Mode = "all" | "bug" | "feature";

function getVoterId(): string {
  const key = "omnivoc_voter_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export default function BoardPage() {
  const { project_key } = useParams<{ project_key: string }>();
  const searchParams = useSearchParams();

  const lang: Lang = (searchParams.get("lang") as Lang) in i18n
    ? (searchParams.get("lang") as Lang)
    : "ja";
  const mode: Mode = (["all", "bug", "feature"].includes(searchParams.get("mode") ?? ""))
    ? (searchParams.get("mode") as Mode)
    : "all";

  const t = i18n[lang];

  const [items, setItems] = useState<BoardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentName, setCommentName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [newText, setNewText] = useState("");
  const [posting, setPosting] = useState(false);
  const [postDone, setPostDone] = useState(false);

  const feedbackType: "bug" | "feature" = mode === "bug" ? "bug" : "feature";

  const fetchItems = useCallback(async () => {
    const typeParam = mode !== "all" ? `?type=${mode}` : "";
    const res = await fetch(`/api/board/${project_key}${typeParam}`);
    const data = await res.json();
    setItems(data);
    setLoading(false);
  }, [project_key, mode]);

  useEffect(() => {
    fetchItems();
    const stored = localStorage.getItem(`omnivoc_votes_${project_key}`);
    if (stored) setVotedIds(new Set(JSON.parse(stored)));
  }, [fetchItems, project_key]);

  const handlePost = async () => {
    if (!newText.trim() || posting) return;
    setPosting(true);
    await fetch(`/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_key,
        channel: "board",
        content: newText.trim(),
        source_url: window.location.href,
        feedback_type: feedbackType,
      }),
    });
    setNewText("");
    setPosting(false);
    setPostDone(true);
    setTimeout(() => setPostDone(false), 3000);
    await fetchItems();
  };

  const handleVote = async (feedbackId: string) => {
    const voterId = getVoterId();
    const res = await fetch(`/api/board/${project_key}/${feedbackId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voter_id: voterId }),
    });
    const data = await res.json();

    setVotedIds((prev) => {
      const next = new Set(prev);
      if (data.voted) next.add(feedbackId);
      else next.delete(feedbackId);
      localStorage.setItem(`omnivoc_votes_${project_key}`, JSON.stringify([...next]));
      return next;
    });

    setItems((prev) =>
      prev
        .map((item) =>
          item.id === feedbackId
            ? { ...item, votes: item.votes + (data.voted ? 1 : -1) }
            : item
        )
        .sort((a, b) => b.votes - a.votes)
    );
  };

  const toggleComments = async (feedbackId: string) => {
    if (expandedId === feedbackId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(feedbackId);
    const res = await fetch(`/api/board/${project_key}/${feedbackId}/comments`);
    setComments(await res.json());
  };

  const handleComment = async () => {
    if (!commentText.trim() || !expandedId) return;
    setSubmitting(true);
    await fetch(`/api/board/${project_key}/${expandedId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: commentText, author_name: commentName || null }),
    });
    setCommentText("");
    const res = await fetch(`/api/board/${project_key}/${expandedId}/comments`);
    setComments(await res.json());
    setSubmitting(false);
    await fetchItems();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <h1 className="text-xl font-bold">{t.title}</h1>
        <p className="text-sm text-gray-500 mt-1">{t.subtitle}</p>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* 新規投稿フォーム */}
        <div className="bg-white border rounded-lg shadow-sm p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">{t.newLabel}</p>
          <div className="flex gap-2">
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder={t.newPlaceholder}
              rows={2}
              className="flex-1 border rounded px-3 py-2 text-sm resize-none focus:outline-none focus:border-black"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handlePost();
              }}
            />
            <button
              onClick={handlePost}
              disabled={!newText.trim() || posting}
              className="bg-black text-white px-4 py-2 rounded text-sm hover:bg-gray-800 disabled:opacity-50 self-end"
            >
              {posting ? t.sending : t.send}
            </button>
          </div>
          {postDone && <p className="text-xs text-green-600 mt-1">{t.sent}</p>}
        </div>

        {/* フィードバック一覧 */}
        {loading ? (
          <p className="text-gray-500 text-center py-8">{t.loading}</p>
        ) : items.length === 0 ? (
          <p className="text-gray-500 text-center py-8">{t.empty}</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const allowComments = item.feedback_type === "feature";
              return (
                <div key={item.id} className="bg-white border rounded-lg shadow-sm">
                  <div className="flex items-start gap-3 p-4">
                    <button
                      onClick={() => handleVote(item.id)}
                      className={`flex flex-col items-center min-w-[48px] py-2 px-1 rounded-lg border text-sm ${
                        votedIds.has(item.id)
                          ? "bg-blue-50 border-blue-300 text-blue-700"
                          : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <span className="text-lg leading-none">
                        {votedIds.has(item.id) ? "\u25B2" : "\u25B3"}
                      </span>
                      <span className="font-bold">{item.votes}</span>
                    </button>

                    <div className="flex-1 min-w-0">
                      {item.source_url && (
                        <a
                          href={item.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs text-gray-400 hover:text-blue-500 truncate mb-1"
                          title={item.source_url}
                        >
                          📄 {item.source_url}
                        </a>
                      )}
                      <p className="text-sm text-gray-800">{item.content}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        {item.issue_url && (
                          <a
                            href={item.issue_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            #{item.issue_number}
                          </a>
                        )}
                        {allowComments && (
                          <button
                            onClick={() => toggleComments(item.id)}
                            className="hover:text-gray-600"
                          >
                            {"\uD83D\uDCAC"} {item.comments}
                          </button>
                        )}
                        <span>{new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {allowComments && expandedId === item.id && (
                    <div className="border-t px-4 py-3 bg-gray-50">
                      {comments.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {comments.map((c) => (
                            <div key={c.id} className="text-sm">
                              <span className="font-medium text-gray-700">
                                {c.author_name || t.anonymous}
                              </span>
                              <span className="text-gray-400 text-xs ml-2">
                                {new Date(c.created_at).toLocaleDateString()}
                              </span>
                              <p className="text-gray-600 mt-0.5">{c.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={commentName}
                          onChange={(e) => setCommentName(e.target.value)}
                          placeholder={t.namePlaceholder}
                          className="border rounded px-2 py-1.5 text-sm w-28"
                        />
                        <input
                          type="text"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder={t.commentPlaceholder}
                          className="flex-1 border rounded px-2 py-1.5 text-sm"
                          onKeyDown={(e) => e.key === "Enter" && handleComment()}
                        />
                        <button
                          onClick={handleComment}
                          disabled={!commentText.trim() || submitting}
                          className="bg-black text-white px-3 py-1.5 rounded text-sm hover:bg-gray-800 disabled:opacity-50"
                        >
                          {t.post}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
