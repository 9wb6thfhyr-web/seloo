import { searchComplianceRules } from './db';

const DEEPSEEK_API = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || '';

// Embedding via DeepSeek (using same API format)
async function getEmbedding(text: string): Promise<number[]> {
  // Use a simple keyword-based embedding when DeepSeek embedding isn't available
  // For production, use DeepSeek's embedding endpoint or OpenAI-compatible API
  const response = await fetch('https://api.deepseek.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-embedding',
      input: text,
    }),
  });

  if (!response.ok) {
    // Fallback: use keyword matching when embedding API unavailable
    return fallbackEmbed(text);
  }

  const json: any = await response.json();
  return json.data[0].embedding;
}

// Fallback: simple keyword-based vector (1536 dims)
function fallbackEmbed(text: string): number[] {
  const keywords = [
    '电子', '电池', '无线', '蓝牙', '充电', '电器', '手机', '电脑', '耳机', '音箱',
    '认证', 'INMETRO', 'ANATEL', 'NOM', 'ANVISA', 'FDA',
    '巴西', '墨西哥', '拉美',
    '食品', '药品', '化妆品', '玩具', '服装', '家具',
    '进口', '关税', '清关', '物流',
  ];

  const lower = text.toLowerCase();
  const vec = new Array(1536).fill(0);

  keywords.forEach((kw, i) => {
    if (lower.includes(kw.toLowerCase())) {
      // Set non-zero values in relevant regions
      const base = (i * 100) % 1500;
      vec[base] = 0.5;
      vec[base + 1] = 0.3;
      vec[base + 2] = 0.2;
    }
  });

  // Add some base signal
  vec[0] = 0.1;
  return vec;
}

export interface ComplianceResult {
  required: { name: string; period: string; cost: string }[];
  restrictions: string[];
}

// Built-in compliance database (used when vector DB is empty)
const BUILTIN_COMPLIANCE: Record<string, { keywords: string[]; rules: ComplianceResult }> = {
  br: {
    keywords: ['电子', '蓝牙', '无线', '耳机', '音箱', '筋膜枪', '充电', '电池', '手机', '电脑', '平板', '智能'],
    rules: {
      required: [
        { name: 'ANATEL 射频认证', period: '2-3个月', cost: '$500-$1,500' },
      ],
      restrictions: ['禁止使用未经 ANATEL 认证的无线发射模块', '产品标签需包含葡语说明和 ANATEL 编号'],
    },
  },
  mx: {
    keywords: ['电子', '蓝牙', '无线', '耳机', '音箱', '充电', '电池', '手机', '电脑', '电器'],
    rules: {
      required: [
        { name: 'NOM 电子安全认证', period: '1-2个月', cost: '$300-$1,000' },
      ],
      restrictions: ['需墨西哥本地公司或授权代表提交申请', '标签须含西语信息和 NOM 标志'],
    },
  },
};

// Generic compliance rules for non-electronic products
const GENERIC_RULES: Record<string, ComplianceResult> = {
  br: {
    required: [],
    restrictions: ['商品价值超 $50 需缴纳 60% 进口税 + 17% ICMS 州税', '纺织品/玩具需 INMETRO 认证（如适用）'],
  },
  mx: {
    required: [],
    restrictions: ['跨境包裹征收 33.5% 关税 + 16% 增值税', '消费电子需 NOM 认证'],
  },
};

export async function checkCompliance(
  keyword: string,
  country: string,
  isElectronic: boolean
): Promise<ComplianceResult> {
  try {
    // Try vector search in database
    const queryText = `${keyword} ${isElectronic ? '电子 电池 认证' : '一般商品'} ${country}`;
    const embedding = await getEmbedding(queryText);

    const results = await searchComplianceRules(embedding, 3);

    if (results.length > 0 && results[0].similarity > 0.3) {
      // Build compliance result from vector search
      const required: { name: string; period: string; cost: string }[] = [];
      const restrictions: string[] = [];

      results.forEach((r: any) => {
        if (r.rule_type === '认证') {
          required.push({
            name: r.content.split('|')[0] || r.content,
            period: r.content.split('|')[1] || '1-3个月',
            cost: r.content.split('|')[2] || '$200-$1,000',
          });
        } else {
          restrictions.push(r.content);
        }
      });

      return { required, restrictions };
    }
  } catch {
    // Fallback to built-in rules
    console.log('Vector search unavailable, using built-in compliance rules');
  }

  // Use built-in compliance database
  const countryRules = BUILTIN_COMPLIANCE[country];
  const genericRules = GENERIC_RULES[country];

  if (isElectronic && countryRules) {
    const matched = countryRules.keywords.some((kw) =>
      keyword.toLowerCase().includes(kw.toLowerCase())
    );
    if (matched) {
      return {
        required: [...countryRules.rules.required],
        restrictions: [
          ...countryRules.rules.restrictions,
          ...(genericRules?.restrictions || []),
        ],
      };
    }
  }

  // Return generic rules
  if (genericRules) {
    return {
      required: [],
      restrictions: genericRules.restrictions || [],
    };
  }

  return { required: [], restrictions: [] };
}
