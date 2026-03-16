import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold">OmniVOC</h1>
      <p className="text-gray-500">
        ユーザーの声を収集・集約・チケット化
      </p>
      <Link
        href="/dashboard"
        className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800"
      >
        ダッシュボードを開く
      </Link>
    </main>
  );
}
