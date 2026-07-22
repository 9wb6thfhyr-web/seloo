/**
 * Seed script: populate compliance_rules table with Brazil & Mexico regulations.
 * Run with: npx ts-node src/seed.ts
 */
import { initDB, insertComplianceRule } from './db';

// Simple keyword-based embedding (matching the fallback in rag.ts)
function keywordEmbed(text: string): number[] {
  const keywords = [
    '电子', '电池', '无线', '蓝牙', '充电', '电器', '手机', '电脑', '耳机', '音箱',
    '认证', 'INMETRO', 'ANATEL', 'NOM', 'ANVISA',
    '巴西', '墨西哥', '拉美',
    '食品', '药品', '化妆品', '玩具', '服装', '家具', '纺织',
    '进口', '关税', '清关', '物流',
  ];
  const lower = text.toLowerCase();
  const vec = new Array(1536).fill(0);
  keywords.forEach((kw, i) => {
    if (lower.includes(kw.toLowerCase())) {
      const base = (i * 100) % 1500;
      vec[base] = 0.5;
      vec[base + 1] = 0.3;
      vec[base + 2] = 0.2;
    }
  });
  vec[0] = 0.1;
  return vec;
}

const rules = [
  // Brazil compliance rules
  { country: 'br', category: '电子产品', ruleType: '认证', content: 'ANATEL 射频认证|2-3个月|$500-$1,500' },
  { country: 'br', category: '电子产品', ruleType: '限制', content: '无线发射设备必须通过 ANATEL 认证，产品标签需含葡语信息和 ANATEL 编号' },
  { country: 'br', category: '电子产品', ruleType: '限制', content: '禁止使用未经 ANATEL 认证的蓝牙/WiFi 模块' },
  { country: 'br', category: '玩具', ruleType: '认证', content: 'INMETRO 玩具安全认证|3-6个月|$800-$2,000' },
  { country: 'br', category: '纺织品', ruleType: '认证', content: 'INMETRO 纺织品安全认证|2-4个月|$500-$1,500' },
  { country: 'br', category: '食品', ruleType: '认证', content: 'ANVISA 食品进口许可|3-6个月|$1,000-$3,000' },
  { country: 'br', category: '化妆品', ruleType: '认证', content: 'ANVISA 化妆品注册|4-8个月|$2,000-$5,000' },
  { country: 'br', category: '通用', ruleType: '关税', content: '跨境包裹价值 > $50 征收 60% 联邦进口税 + 17% ICMS 州税' },
  { country: 'br', category: '通用', ruleType: '关税', content: '2026年新政：50美元以下包裹取消免税，征收20%联邦税+17%州税' },
  { country: 'br', category: '通用', ruleType: '限制', content: '巴西禁止进口二手商品、假冒商品、含有危险物质的产品' },

  // Mexico compliance rules
  { country: 'mx', category: '电子产品', ruleType: '认证', content: 'NOM 电子安全认证|1-2个月|$300-$1,000' },
  { country: 'mx', category: '电子产品', ruleType: '限制', content: '消费电子产品需 NOM 认证，标签须含西语信息和 NOM 标志' },
  { country: 'mx', category: '电子产品', ruleType: '限制', content: '无线产品需额外 NOM-EMC 电磁兼容认证' },
  { country: 'mx', category: '玩具', ruleType: '认证', content: 'NOM 玩具安全标准认证|2-4个月|$500-$1,500' },
  { country: 'mx', category: '纺织品', ruleType: '限制', content: '纺织品需标注成分、产地、洗涤说明（西语）' },
  { country: 'mx', category: '食品', ruleType: '认证', content: 'COFEPRIS 食品进口许可|3-6个月|$1,000-$4,000' },
  { country: 'mx', category: '通用', ruleType: '关税', content: '跨境包裹征收 33.5% 关税 + 16% 增值税（IVA）' },
  { country: 'mx', category: '通用', ruleType: '限制', content: '2026年RFC税号强制：无本地RFC卖家平台代扣16%增值税+20%所得税（综合36%）' },
  { country: 'mx', category: '通用', ruleType: '限制', content: '墨西哥禁止进口含有濒危物种成分的产品、未经授权的药品' },

  // Logistics cost reference
  { country: 'br', category: '物流成本', ruleType: '参考', content: '中国→巴西海运头程：约$3-6/kg，时效30-45天|海外仓：圣保罗仓约R$25/月/立方|尾程配送：Correios约R$15-30/单' },
  { country: 'mx', category: '物流成本', ruleType: '参考', content: '中国→墨西哥海运头程：约$2-5/kg，时效25-35天|海外仓：墨西哥城仓约$15/月/立方|尾程配送：约MXN 50-100/单' },
  { country: 'br', category: '选品案例', ruleType: '参考', content: '手机壳在巴西市场78分（可做）——轻小件、无认证、运费低、TikTok Shop增速快' },
  { country: 'br', category: '选品案例', ruleType: '参考', content: 'LED灯具在巴西35分（不建议）——需INMETRO认证6个月，等批下来热度已过' },
  { country: 'br', category: '选品案例', ruleType: '参考', content: '瑜伽裤在巴西88分（可做）——TikTok Shop墨西哥站健身内容爆发，竞争是美国的1/4' },
  { country: 'mx', category: '选品案例', ruleType: '参考', content: '筋膜枪在巴西42分（不建议）——大件仓储贵+ANATEL认证3个月+运费占比22%' },
];

async function seed() {
  await initDB();
  console.log('🌱 Starting seed...');

  for (const rule of rules) {
    const text = `${rule.category} ${rule.ruleType} ${rule.content}`;
    const embedding = keywordEmbed(text);
    await insertComplianceRule(rule.country, rule.category, rule.ruleType, rule.content, embedding);
  }

  console.log(`✅ Seeded ${rules.length} compliance rules`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
