import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SearchHistoryItem } from '../types/report';

export default function History() {
  const navigate = useNavigate();
  const [items, setItems] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/history')
      .then((r) => r.json())
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function getScoreColor(score: number) {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            ← 返回首页
          </button>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-6">📋 历史分析记录</h1>

        {loading ? (
          <div className="text-center py-12 text-gray-400">加载中…</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-3">暂无搜索记录</p>
            <button
              onClick={() => navigate('/')}
              className="text-blue-600 hover:underline text-sm"
            >
              开始第一次搜索
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(`/report/${item.id}`)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition text-left"
              >
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {item.keyword}
                  </span>
                  <span className="ml-2 text-xs text-gray-400">{item.country}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-sm font-bold ${getScoreColor(item.score)}`}>
                    {item.score} 分
                  </span>
                  <span className="text-xs text-gray-400 w-20 text-right">
                    {new Date(item.created_at).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-8 pb-8">
          Seloo · AI 跨境选品知识库
        </p>
      </div>
    </main>
  );
}
