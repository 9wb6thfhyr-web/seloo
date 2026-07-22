import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { AnalysisReport } from '../types/report';

export default function Report() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState(!id);
  const [error, setError] = useState('');

  // Load existing report by ID
  useEffect(() => {
    if (!id) return;

    fetch(`/api/report/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.report_json) {
          setReport(data.report_json);
          setLoading(false);
        }
      })
      .catch(() => {
        // Report not found, might be generating
        setLoading(false);
        setError('报告未找到，请重新搜索');
      });
  }, [id]);

  // If no ID, the user came from Home — we need to do a search
  // The search is already handled in Home.tsx

  function getScoreColor(score: number) {
    if (score >= 70) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 40) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  }

  function getRiskBadge(level: string) {
    switch (level) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-green-100 text-green-700 border-green-200';
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-3xl mb-4">⏳</div>
          <p className="text-gray-500">正在加载报告…</p>
        </div>
      </main>
    );
  }

  if (error && !report) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="text-blue-600 hover:underline"
        >
          返回首页重新搜索
        </button>
      </main>
    );
  }

  if (!report) return null;

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            ← 返回
          </button>
          <button
            onClick={() => navigate('/history')}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            历史记录
          </button>
        </div>

        {/* Title */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {report.keyword}
                <span className="ml-3 text-base font-normal text-gray-400">
                  {report.country}
                </span>
              </h1>
              <p className="text-sm text-gray-500 mt-1">{report.summary}</p>
            </div>

            {/* Score */}
            <div
              className={`flex flex-col items-center justify-center w-24 h-24 rounded-2xl border-2 ${getScoreColor(report.score)}`}
            >
              <span className="text-3xl font-extrabold">{report.score}</span>
              <span className="text-xs font-medium">可做指数</span>
            </div>
          </div>
        </div>

        {/* Agent Steps */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4 tracking-wide">
            AI Agent 分析过程
          </h2>
          <div className="space-y-3">
            {[
              { id: 1, name: '意图拆解', status: 'done', detail: `品类：${report.keyword}，市场：${report.country}` },
              {
                id: 2,
                name: '市场数据抓取',
                status: 'done',
                detail: report.marketData.platforms
                  .map((p) => `${p.name}: ${p.competitorCount}个竞品, 均价${p.avgPrice}`)
                  .join(' | '),
              },
              {
                id: 3,
                name: '合规检索 (RAG)',
                status: 'done',
                detail:
                  report.compliance.required.length > 0
                    ? `需认证: ${report.compliance.required.map((r) => r.name).join('、')}`
                    : '无特殊认证要求',
              },
              {
                id: 4,
                name: '竞品分析',
                status: 'done',
                detail: `价格带: ${report.competition.topPriceRange} | 建议售价: ${report.competition.suggestedPrice} | 毛利率: ${report.competition.estimatedMargin}`,
              },
              {
                id: 5,
                name: '报告生成',
                status: 'done',
                detail: `综合评分 ${report.score}/100，${report.score >= 60 ? '建议跟进' : '建议谨慎'}`,
              },
            ].map((step) => (
              <div key={step.id} className="flex items-start gap-3">
                <span className="text-lg mt-0.5">
                  {step.status === 'done' ? '✅' : '⏳'}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-800">
                    {step.name}
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5 break-words">
                    {step.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Compliance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4 tracking-wide">
            合规检查
          </h2>

          <div className="mb-4">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getRiskBadge(report.compliance.riskLevel)}`}
            >
              风险等级：{report.compliance.riskLevel === 'high' ? '⚠️ 高' : report.compliance.riskLevel === 'medium' ? '⚡ 中' : '✅ 低'}
            </span>
          </div>

          {report.compliance.required.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">需要认证</h3>
              <div className="space-y-2">
                {report.compliance.required.map((cert, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-orange-50 rounded-lg px-4 py-2.5"
                  >
                    <span className="text-sm font-medium text-orange-800">{cert.name}</span>
                    <span className="text-xs text-orange-600">
                      ⏱ {cert.period} · 💰 {cert.cost}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.compliance.restrictions.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">限制与注意</h3>
              <ul className="space-y-1">
                {report.compliance.restrictions.map((r, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Market Data */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4 tracking-wide">
            市场数据
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {report.marketData.platforms.map((platform) => (
              <div
                key={platform.name}
                className="bg-gray-50 rounded-lg p-4 text-center"
              >
                <div className="text-xs text-gray-500 mb-1">{platform.name}</div>
                <div className="text-lg font-bold text-gray-900">
                  {platform.competitorCount}
                </div>
                <div className="text-xs text-gray-400">竞品数</div>
                <div className="text-sm font-medium text-gray-700 mt-2">
                  {platform.avgPrice}
                </div>
                <div className="text-xs text-gray-400">均价</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">{report.marketData.summary}</p>
        </div>

        {/* Risks */}
        {report.risks.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4 tracking-wide">
              风险提示
            </h2>
            <ul className="space-y-2">
              {report.risks.map((risk, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-red-400 mt-0.5">⚠️</span>
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Bottom */}
        <div className="text-center mt-8 mb-4">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
          >
            搜索新品类
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 pb-8">
          Seloo · AI 跨境选品知识库 · 分析结果仅供参考
        </p>
      </div>
    </main>
  );
}
