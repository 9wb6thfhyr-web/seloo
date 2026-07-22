import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SearchHistoryItem } from '../types/report';

const COUNTRIES = [
  { value: 'br', label: '🇧🇷 巴西' },
  { value: 'mx', label: '🇲🇽 墨西哥' },
];

export default function Home() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [country, setCountry] = useState('br');
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<SearchHistoryItem[]>([]);

  useEffect(() => {
    fetch('/api/history')
      .then((r) => r.json())
      .then(setRecentSearches)
      .catch(() => {});
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim() || loading) return;

    setLoading(true);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: keyword.trim(), country }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '网络错误' }));
        alert(err.error || '分析失败');
        setLoading(false);
        return;
      }

      const { searchId } = await res.json();
      navigate(`/report/${searchId}`);
    } catch (err) {
      console.error('Search failed:', err);
      alert('分析失败，请检查后端是否启动');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      {/* Logo & Hero */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight mb-2 text-gray-900">
          Seloo
        </h1>
        <p className="text-gray-500 text-lg">
          拉美电商 AI 选品决策引擎
        </p>
        <p className="text-gray-400 text-sm mt-1">
          输入一个品类，30 秒告诉你该不该卖
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="w-full max-w-xl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {/* Keyword input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              品类名称
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder='输入品类，如"筋膜枪""手机壳"…'
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              disabled={loading}
            />
          </div>

          {/* Country selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              目标市场
            </label>
            <div className="flex gap-3">
              {COUNTRIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCountry(c.value)}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition ${
                    country === c.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !keyword.trim()}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin text-lg">⏳</span>
                AI 正在分析中…
              </>
            ) : (
              <>🔍 开始分析</>
            )}
          </button>
        </div>
      </form>

      {/* Recent searches */}
      {recentSearches.length > 0 && (
        <div className="w-full max-w-xl mt-8">
          <h3 className="text-sm font-medium text-gray-500 mb-3">最近搜索</h3>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
            {recentSearches.slice(0, 10).map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(`/report/${item.id}`)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition text-left"
              >
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {item.keyword}
                  </span>
                  <span className="ml-2 text-xs text-gray-400">
                    {item.country}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-bold ${
                      item.score >= 70
                        ? 'text-green-500'
                        : item.score >= 40
                        ? 'text-orange-500'
                        : 'text-red-500'
                    }`}
                  >
                    {item.score}分
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(item.created_at).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="mt-10 text-xs text-gray-400">
        Seloo · 拉美电商 AI 选品知识库 · Powered by DeepSeek + RAG
      </p>
    </main>
  );
}
