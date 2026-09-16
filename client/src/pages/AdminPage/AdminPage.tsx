import React, { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { toast } from 'sonner';
import {
  Upload,
  Plus,
  Sparkles,
  FileJson,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import * as adminApi from '@client/src/api/admin';
import type { ImportResult, VocabWord } from '@shared/api.interface';

type TabKey = 'import' | 'manage' | 'examples';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'import', label: '匯入字庫', icon: <Upload className="w-4 h-4" /> },
  { key: 'manage', label: '管理單字', icon: <Plus className="w-4 h-4" /> },
  { key: 'examples', label: '例句補齊', icon: <Sparkles className="w-4 h-4" /> },
];

interface WordForm {
  word: string;
  display: string;
  zh: string;
  phonetic: string;
  pos: string;
  banks: string;
  level: string;
  example: string;
  exampleZh: string;
}

const DEFAULT_FORM: WordForm = {
  word: '',
  display: '',
  zh: '',
  phonetic: '',
  pos: '',
  banks: '',
  level: '',
  example: '',
  exampleZh: '',
};

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('import');

  // Import tab state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manage tab state
  const [form, setForm] = useState<WordForm>(DEFAULT_FORM);
  const [isCreating, setIsCreating] = useState(false);

  // Examples tab state
  const [fillLimit, setFillLimit] = useState<number>(50);
  const [isFilling, setIsFilling] = useState(false);
  const [fillResult, setFillResult] = useState<{
    filled: number;
    totalMissing: number;
  } | null>(null);

  /* -------------------- Import handlers -------------------- */

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setImportResult(null);
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'json') setFormat('json');
    else if (ext === 'csv') setFormat('csv');
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('請先選擇檔案');
      return;
    }
    setIsImporting(true);
    try {
      const result = await adminApi.importWordsFile(selectedFile, format);
      setImportResult(result);
      toast.success(`匯入完成：成功 ${result.imported} 個`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '匯入失敗';
      toast.error(msg);
    } finally {
      setIsImporting(false);
    }
  };

  /* -------------------- Manage handlers -------------------- */

  const updateField = <K extends keyof WordForm>(key: K, value: WordForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreateWord = async () => {
    if (!form.word.trim() || !form.zh.trim()) {
      toast.error('請填寫 word 與中文釋義');
      return;
    }
    setIsCreating(true);
    try {
      const wordData: Omit<VocabWord, 'id'> = {
        word: form.word.trim(),
        display: form.display.trim() || form.word.trim(),
        zh: form.zh.trim(),
        phonetic: form.phonetic.trim(),
        pos: form.pos.trim(),
        definition: '',
        frq: 0,
        note: '',
        academic: '',
        example: form.example.trim(),
        exampleZh: form.exampleZh.trim(),
        banks: form.banks
          .split(',')
          .map((b) => b.trim())
          .filter(Boolean),
        level: form.level.trim(),
      };
      await adminApi.createWord(wordData);
      toast.success(`已新增單字：${wordData.word}`);
      setForm(DEFAULT_FORM);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '新增失敗';
      toast.error(msg);
    } finally {
      setIsCreating(false);
    }
  };

  /* -------------------- Examples handlers -------------------- */

  const handleFillExamples = async () => {
    if (fillLimit <= 0 || fillLimit > 200) {
      toast.error('數量須介於 1 ~ 200');
      return;
    }
    setIsFilling(true);
    try {
      const result = await adminApi.fillMissingExamples({
        limit: fillLimit,
        dryRun: false,
      });
      setFillResult(result);
      toast.success(`已補齊 ${result.filled} 個例句`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '補齊失敗';
      toast.error(msg);
    } finally {
      setIsFilling(false);
    }
  };

  /* -------------------- Render -------------------- */

  return (
    <div className="min-h-screen bg-background page-enter py-6 px-4 md:px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">管理後台</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {TABS.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab.key)}
              className="rounded-xl"
            >
              {tab.icon}
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Import Tab */}
        {activeTab === 'import' && (
          <div className="bg-card rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-foreground">匯入字庫</h2>

            {/* Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
                transition-colors
                ${isDragging
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary hover:bg-muted'
                }
              `}
            >
              <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-foreground font-medium mb-1">
                拖放檔案到此處，或點擊選取
              </p>
              <p className="text-sm text-muted-foreground">支援 .json 和 .csv 格式</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>

            {/* Selected file info */}
            {selectedFile && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                {format === 'json' ? (
                  <FileJson className="w-5 h-5 text-primary" />
                ) : (
                  <FileSpreadsheet className="w-5 h-5 text-success" />
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                    {selectedFile.name}
                  </p>
                    <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as 'json' | 'csv')}
                  className="text-sm px-3 py-1.5 rounded-lg border border-border bg-card"
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                </select>
              </div>
            )}

            {/* Import button */}
            <Button
              onClick={handleImport}
              disabled={!selectedFile || isImporting}
              className="w-full rounded-xl"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  匯入中...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  開始匯入
                </>
              )}
            </Button>

            {/* Result */}
            {importResult && (
              <div className="border border-border rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-foreground">匯入結果</h3>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div className="p-2">
                    <div className="text-2xl font-bold text-primary">
                      {importResult.total}
                    </div>
                      <div className="text-xs text-muted-foreground">總數</div>
                  </div>
                  <div className="p-2">
                    <div className="text-2xl font-bold text-success">
                      {importResult.imported}
                    </div>
                      <div className="text-xs text-muted-foreground">成功</div>
                  </div>
                  <div className="p-2">
                    <div className="text-2xl font-bold text-warning">
                      {importResult.updated}
                    </div>
                      <div className="text-xs text-muted-foreground">更新</div>
                  </div>
                  <div className="p-2">
                    <div className="text-2xl font-bold text-muted-foreground">
                      {importResult.skipped}
                    </div>
                      <div className="text-xs text-muted-foreground">跳過</div>
                  </div>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="mt-2">
                      <p className="text-sm font-medium text-destructive flex items-center gap-1 mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      錯誤 ({importResult.errors.length})
                    </p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {importResult.errors.map((err, i) => (
                        <p
                          key={i}
                          className="text-xs text-foreground bg-destructive/10 px-2 py-1 rounded"
                        >
                          {err}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Manage Tab */}
        {activeTab === 'manage' && (
          <div className="bg-card rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-foreground">新增單字</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                  <label className="text-sm text-foreground mb-1 block">
                   word <span className="text-destructive">*</span>
                </label>
                <Input
                  value={form.word}
                  onChange={(e) => updateField('word', e.target.value)}
                  placeholder="ex: apple"
                  className="rounded-lg"
                />
              </div>
              <div>
                  <label className="text-sm text-foreground mb-1 block">
                  display
                </label>
                <Input
                  value={form.display}
                  onChange={(e) => updateField('display', e.target.value)}
                  placeholder="顯示形式（預設同 word）"
                  className="rounded-lg"
                />
              </div>
              <div>
                  <label className="text-sm text-foreground mb-1 block">
                  中文釋義 <span className="text-destructive">*</span>
                </label>
                <Input
                  value={form.zh}
                  onChange={(e) => updateField('zh', e.target.value)}
                  placeholder="ex: 蘋果"
                  className="rounded-lg"
                />
              </div>
              <div>
                  <label className="text-sm text-foreground mb-1 block">
                  音標
                </label>
                <Input
                  value={form.phonetic}
                  onChange={(e) => updateField('phonetic', e.target.value)}
                  placeholder="ex: /ˈæp.əl/"
                  className="rounded-lg"
                />
              </div>
              <div>
                  <label className="text-sm text-foreground mb-1 block">
                  詞性 (pos)
                </label>
                <Input
                  value={form.pos}
                  onChange={(e) => updateField('pos', e.target.value)}
                  placeholder="ex: n."
                  className="rounded-lg"
                />
              </div>
              <div>
                  <label className="text-sm text-foreground mb-1 block">
                  等級 (level)
                </label>
                <Input
                  value={form.level}
                  onChange={(e) => updateField('level', e.target.value)}
                  placeholder="ex: 初級"
                  className="rounded-lg"
                />
              </div>
              <div className="md:col-span-2">
                  <label className="text-sm text-foreground mb-1 block">
                  所屬字庫（banks，逗號分隔）
                </label>
                <Input
                  value={form.banks}
                  onChange={(e) => updateField('banks', e.target.value)}
                  placeholder="ex: GEPT, TOEIC"
                  className="rounded-lg"
                />
              </div>
              <div className="md:col-span-2">
                  <label className="text-sm text-foreground mb-1 block">
                  例句 (英文)
                </label>
                <Input
                  value={form.example}
                  onChange={(e) => updateField('example', e.target.value)}
                  placeholder="ex: I eat an apple every day."
                  className="rounded-lg"
                />
              </div>
              <div className="md:col-span-2">
                  <label className="text-sm text-foreground mb-1 block">
                  例句 (中文)
                </label>
                <Input
                  value={form.exampleZh}
                  onChange={(e) => updateField('exampleZh', e.target.value)}
                  placeholder="ex: 我每天吃一顆蘋果。"
                  className="rounded-lg"
                />
              </div>
            </div>

            <Button
              onClick={handleCreateWord}
              disabled={isCreating}
              className="w-full rounded-xl"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  新增中...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  新增單字
                </>
              )}
            </Button>
          </div>
        )}

        {/* Examples Tab */}
        {activeTab === 'examples' && (
          <div className="bg-card rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-foreground">例句補齊</h2>

            <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
              <div className="flex gap-3">
                <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-medium text-primary mb-1">
                    自動從線上詞典補齊缺例句的單字
                  </p>
                    <p className="text-xs text-primary/80">
                    系統會自動搜尋尚未有例句的單字，並從線上詞典來源取得對應的英文例句與中文翻譯。
                  </p>
                </div>
              </div>
            </div>

            <div>
                <label className="text-sm text-foreground mb-1 block">
                 補齊數量（預設 50，最大 200）
              </label>
              <Input
                type="number"
                min={1}
                max={200}
                value={fillLimit}
                onChange={(e) => setFillLimit(Number(e.target.value))}
                className="rounded-lg"
              />
            </div>

            <Button
              onClick={handleFillExamples}
              disabled={isFilling}
              className="w-full rounded-xl"
            >
              {isFilling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  補齊中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  開始補齊
                </>
              )}
            </Button>

            {fillResult && (
              <div className="border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <h3 className="font-semibold text-foreground">補齊完成</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-success/10 rounded-xl">
                    <div className="text-3xl font-bold text-success">
                      {fillResult.filled}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">已補齊</div>
                  </div>
                  <div className="p-3 bg-muted rounded-xl">
                    <div className="text-3xl font-bold text-muted-foreground">
                      {fillResult.totalMissing}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">總缺例句數</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
