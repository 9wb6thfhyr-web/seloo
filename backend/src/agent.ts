import { analyzeMarket } from './scraper';
import { checkCompliance } from './rag';

const DEEPSEEK_API = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || '';

export interface AgentStep {
  id: number;
  name: string;
  status: 'pending' | 'running' | 'done' | 'error';
  detail: string;
}

export interface AnalysisReport {
  keyword: string;
  country: string;
  marketData: {
    platforms: { name: string; competitorCount: number; avgPrice: string; searchVolume: string }[];
    summary: string;
  };
  compliance: {
    required: { name: string; period: string; cost: string }[];
    restrictions: string[];
    riskLevel: 'low' | 'medium' | 'high';
  };
  competition: {
    topPriceRange: string;
    avgRating: number;
    suggestedPrice: string;
    estimatedMargin: string;
    competitionLevel: string;
  };
  risks: string[];
  score: number;
  summary: string;
}

type StepCallback = (step: AgentStep) => void;

function isElectronicGuess(keyword: string): boolean {
  const electronic = ['耳机', '音箱', '筋膜枪', '手机', '电脑', '平板', '充电', '电池', '蓝牙', '电子', '智能', '灯'];
  return electronic.some((kw) => keyword.includes(kw));
}

async function callDeepSeek(messages: { role: string; content: string }[]): Promise<string> {
  const response = await fetch(DEEPSEEK_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature: 0.3,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status}`);
  }

  const json: any = await response.json();
  return json.choices[0].message.content;
}

export async function runAgent(
  keyword: string,
  country: string,
  onStep: StepCallback
): Promise<AnalysisReport> {
  const countryName = country === 'br' ? '巴西' : country === 'mx' ? '墨西哥' : country;

  // Step 1: Intent decomposition
  onStep({ id: 1, name: '意图拆解', status: 'running', detail: `正在分析"${keyword}"在${countryName}的搜索意图…` });

  const intentPrompt = `你是一个跨境电商选品专家。用户想了解品类"${keyword}"在${countryName}（平台：Mercado Libre、Shopee、TikTok Shop）的市场情况。
请将这个需求拆解为需要完成的分析任务，输出JSON格式：
{
  "tasks": ["任务1", "任务2", ...],
  "category": "品类归属",
  "isElectronic": true/false（是否含电子/电池）
}`;

  let intent: any = { tasks: ['市场分析', '合规检查', '竞品对比'], category: keyword, isElectronic: isElectronicGuess(keyword) };
  try {
    const intentRaw = await callDeepSeek([{ role: 'user', content: intentPrompt }]);
    intent = JSON.parse(intentRaw.replace(/```json|```/g, '').trim());
  } catch {
    console.warn('⚠️ DeepSeek API 不可用，使用本地规则拆解意图');
  }

  onStep({ id: 1, name: '意图拆解', status: 'done', detail: `品类归属：${intent.category || keyword}，电子类：${intent.isElectronic ? '是' : '否'}` });

  // Step 2: Market data scraping
  onStep({ id: 2, name: '市场数据抓取', status: 'running', detail: `正在从 Mercado Libre / Shopee 抓取${keyword}的市场数据…` });

  const marketData = await analyzeMarket(keyword, country, intent.isElectronic);
  onStep({ id: 2, name: '市场数据抓取', status: 'done', detail: `Mercado: ${marketData.platforms[0]?.competitorCount || 'N/A'} 个竞品，均价 ${marketData.platforms[0]?.avgPrice || 'N/A'}` });

  // Step 3: Compliance check via RAG
  onStep({ id: 3, name: '合规检索 (RAG)', status: 'running', detail: `正在检索${countryName}的合规法规数据库…` });

  const compliance = await checkCompliance(keyword, country, intent.isElectronic);
  const riskLevel = compliance.required.length > 1 ? 'high' : compliance.required.length === 1 ? 'medium' : 'low';
  onStep({ id: 3, name: '合规检索 (RAG)', status: 'done', detail: compliance.required.length > 0 ? `需要 ${compliance.required.map(r => r.name).join('、')}` : '无需特殊认证' });

  // Step 4: Competition analysis
  onStep({ id: 4, name: '竞品分析', status: 'running', detail: '正在用AI对比竞品价格/评分/卖点…' });

  const competitionPrompt = `分析品类"${keyword}"在${countryName}的竞争情况。
市场数据：${JSON.stringify(marketData)}
请输出JSON（不要markdown代码块）：
{
  "topPriceRange": "价格区间（本地货币）",
  "avgRating": 平均评分（1-5的数字）,
  "suggestedPrice": "建议售价（本地货币）",
  "estimatedMargin": "预估毛利率百分比",
  "competitionLevel": "竞争程度：低/中/高"
}`;

  let competition: any = { topPriceRange: '数据不足', avgRating: 4.0, suggestedPrice: '待定', estimatedMargin: '30%', competitionLevel: '中' };
  try {
    const compRaw = await callDeepSeek([{ role: 'user', content: competitionPrompt }]);
    competition = JSON.parse(compRaw.replace(/```json|```/g, '').trim());
  } catch {
    console.warn('⚠️ 竞品分析 API 不可用，使用估算数据');
  }

  onStep({ id: 4, name: '竞品分析', status: 'done', detail: `建议售价 ${competition.suggestedPrice}，预估毛利 ${competition.estimatedMargin}` });

  // Step 5: Final report generation
  onStep({ id: 5, name: '报告生成', status: 'running', detail: '正在汇总分析结果，生成决策报告…' });

  const reportPrompt = `你是一个跨境电商选品顾问。基于以下分析结果，生成最终决策报告。

品类：${keyword}
目标市场：${countryName}
市场数据：${JSON.stringify(marketData)}
合规检查：${JSON.stringify(compliance)}
竞品分析：${JSON.stringify(competition)}

请输出JSON（不要markdown代码块）：
{
  "score": 0-100的可做指数（综合考虑市场机会、合规难度、竞争程度、物流成本），
  "summary": "一句话总结建议，包含关键风险",
  "risks": ["风险1", "风险2", "风险3"]
}`;

  let reportFinal: any = { score: 50, summary: `${keyword}在${countryName}的市场机会中等，建议进一步人工调研`, risks: ['数据不足，建议验证'] };
  try {
    const reportRaw = await callDeepSeek([{ role: 'user', content: reportPrompt }]);
    reportFinal = JSON.parse(reportRaw.replace(/```json|```/g, '').trim());
  } catch {
    console.warn('⚠️ 报告生成 API 不可用，使用规则引擎评分');
    let score = 50;
    if (compliance.required.length > 1) score -= 20;
    if (competition.competitionLevel === '高') score -= 15;
    if (marketData.platforms[0]?.competitorCount < 300) score += 15;
    score = Math.max(0, Math.min(100, score));
    reportFinal = { score, summary: `${keyword}在${countryName}市场${score > 60 ? '值得关注' : '建议谨慎'}（基于规则引擎估算）`, risks: compliance.required.length > 0 ? ['需要产品认证，周期较长'] : ['建议人工验证市场数据'] };
  }

  onStep({ id: 5, name: '报告生成', status: 'done', detail: `可做指数 ${reportFinal.score}/100` });

  return {
    keyword,
    country: countryName,
    marketData: {
      platforms: marketData.platforms || [],
      summary: marketData.summary || '',
    },
    compliance: {
      required: compliance.required || [],
      restrictions: compliance.restrictions || [],
      riskLevel: riskLevel as 'low' | 'medium' | 'high',
    },
    competition: {
      topPriceRange: competition.topPriceRange || 'N/A',
      avgRating: competition.avgRating || 0,
      suggestedPrice: competition.suggestedPrice || 'N/A',
      estimatedMargin: competition.estimatedMargin || '30%',
      competitionLevel: competition.competitionLevel || '中',
    },
    risks: reportFinal.risks || [],
    score: reportFinal.score || 50,
    summary: reportFinal.summary || `${keyword}在${countryName}的市场分析已完成`,
  };
}
