import { useState, useEffect } from 'react';
import { logger } from '@client/src/lib/logger';
import {
  BookOpen,
  Sparkles,
  Award,
  Volume2,
  TrendingUp,
  Gamepad2,
  Library,
  Shield,
  GraduationCap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { vocabularyApi } from '@/api';
import type { WordBanksInfo } from '@shared/api.interface';

interface SourceItem {
  name: string;
  provider: string;
  license: string;
  licenseType: 'official' | 'cc' | 'mit' | 'academic';
}

const DATA_SOURCES: SourceItem[] = [
  {
    name: '全民英檢參考字表',
    provider: '財團法人語言訓練測驗中心 (LTTC)',
    license: '官方參考資料',
    licenseType: 'official',
  },
  {
    name: 'TOEIC Service List',
    provider: 'NGSL 計畫',
    license: 'CC BY-SA 4.0',
    licenseType: 'cc',
  },
  {
    name: 'Academic Word List (AWL)',
    provider: 'Averil Coxhead',
    license: '學術引用',
    licenseType: 'academic',
  },
  {
    name: '釋義與音標',
    provider: 'ECDICT 開源詞典',
    license: 'MIT License',
    licenseType: 'mit',
  },
];

const FEATURES: Array<{ icon: React.ComponentType<{ className?: string }>; title: string; desc: string; color: string }> = [
  {
    icon: Gamepad2,
    title: '多題型練習',
    desc: '看英文選中文、看中文選英文、聽音選義、拼字、填空',
    color: 'from-primary to-accent',
  },
  {
    icon: Sparkles,
    title: '閃卡背誦',
    desc: '正反面翻轉，快速記憶單字',
    color: 'from-warning to-destructive',
  },
  {
    icon: Volume2,
    title: '發音播放',
    desc: '標準美式發音，邊聽邊學',
    color: 'from-success to-info',
  },
  {
    icon: TrendingUp,
    title: '學習進度追蹤',
    desc: '已學、待複習、答對率一目瞭然',
    color: 'from-info to-chart-2',
  },
  {
    icon: Award,
    title: '遊戲化獎勵',
    desc: 'XP、等級、徽章、連勝機制',
    color: 'from-chart-3 to-warning',
  },
];

const LICENSE_COLORS: Record<string, string> = {
  official: 'bg-primary/10 text-primary border-primary/20',
  cc: 'bg-success/10 text-success border-success/20',
  mit: 'bg-accent/10 text-accent border-accent/20',
  academic: 'bg-info/10 text-info border-info/20',
};

const BANK_LABELS: Record<string, string> = {
  gept: 'GEPT 全民英檢',
  toeic: 'TOEIC 多益',
  ielts: 'IELTS 雅思',
};

const AboutPage: React.FC = () => {
  const [banksInfo, setBanksInfo] = useState<WordBanksInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchInfo = async (): Promise<void> => {
      try {
        const data = await vocabularyApi.getBanksInfo();
        setBanksInfo(data);
      } catch (err) {
        logger.error('getBanksInfo failed', { err: JSON.stringify(err) });
      } finally {
        setLoading(false);
      }
    };
    void fetchInfo();
  }, []);

  return (
    <div className="min-h-screen bg-background page-enter px-4 md:px-6 py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 頁面標題 */}
        <div className="text-center space-y-2 pb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg mb-2">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-destructive bg-clip-text text-transparent">
            關於字庫派對
          </h1>
          <p className="text-muted-foreground text-sm">快樂學單字，輕鬆備考試！</p>
        </div>

        {/* 應用介紹卡片 */}
        <Card className="rounded-2xl border-border shadow-sm overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary via-accent to-destructive" />
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-warning" />
              字庫派對 Vocab Party
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-foreground leading-relaxed">
              專為國中生與全民英檢、多益、雅思考生打造的英文單字學習 App。
              透過遊戲化的互動方式，讓背單字不再枯燥乏味！
            </p>

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-primary" />
                目標使用者
              </h3>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/20"
                >
                  國中生
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-success/10 text-success border-success/20"
                >
                  全民英檢考生
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-warning/10 text-warning border-warning/20"
                >
                  多益考生
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-destructive/10 text-destructive border-destructive/20"
                >
                  雅思考生
                </Badge>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-warning" />
                特色功能
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" data-ai-section-type="card-list">
                {FEATURES.map(
                  (
                    feat: {
                      icon: React.ComponentType<{ className?: string }>;
                      title: string;
                      desc: string;
                      color: string;
                    },
                    idx: number,
                  ) => {
                    const IconComp: React.ComponentType<{ className?: string }> =
                      feat.icon;
                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow"
                      >
                        <div
                          className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feat.color} flex items-center justify-center mb-3`}
                        >
                           <IconComp className="w-5 h-5 text-white" />
                         </div>
                         <h4 className="text-sm font-semibold text-foreground mb-1">
                           {feat.title}
                        </h4>
                         <p className="text-xs text-muted-foreground leading-relaxed">
                          {feat.desc}
                        </p>
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 資料來源卡片 */}
        <Card className="rounded-2xl border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <Library className="w-5 h-5 text-primary" />
              資料來源
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              感謝以下單位與專案提供寶貴的詞彙資料
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-ai-section-type="card-list">
              {DATA_SOURCES.map((src: SourceItem, idx: number) => (
                <div
                  key={idx}
                   className="rounded-xl border border-border bg-muted/50 p-4 hover:bg-card hover:shadow-md transition-all"
                 >
                   <h4 className="text-sm font-semibold text-foreground mb-1">
                     {src.name}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-3">{src.provider}</p>
                  <Badge
                    variant="outline"
                    className={`text-xs font-medium border ${LICENSE_COLORS[src.licenseType] || 'bg-muted text-muted-foreground border-border'}`}
                  >
                    <Shield className="w-3 h-3 mr-1" />
                    {src.license}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 字庫統計卡片 */}
        <Card className="rounded-2xl border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-success" />
              字庫統計
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-6">
              <div className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {loading ? '...' : banksInfo?.totalWords ?? 8160}
              </div>
              <div className="text-sm text-muted-foreground mt-1">總單字數</div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3" data-ai-section-type="card-stat">
              {Object.entries(BANK_LABELS).map(
                ([key, label]: [string, string]) => {
                  const count: number | undefined =
                    banksInfo?.byBank?.[key];
                  return (
                    <div
                      key={key}
                      className="rounded-xl bg-gradient-to-br from-muted to-card border border-border p-3 text-center hover:shadow-sm transition-shadow"
                    >
                        <div className="text-xl font-bold text-foreground">
                        {loading ? '...' : count ?? 0}
                      </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                        {label}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </CardContent>
        </Card>

        {/* 版本資訊 */}
        <div className="text-center text-xs text-muted-foreground pb-4">
          字庫派對 Vocab Party v1.0.0
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
