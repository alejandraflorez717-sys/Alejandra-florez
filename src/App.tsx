import React, { useMemo, useRef, useState } from 'react';
import { Database, Upload } from 'lucide-react';
import { DatasetModal } from './components/DatasetModal';
import { BinomialDistributionSection } from './components/sections/BinomialDistributionSection';
import { NormalDistributionSection } from './components/sections/NormalDistributionSection';
import { OverviewPanel } from './components/sections/OverviewPanel';
import { SamplingDistributionSection } from './components/sections/SamplingDistributionSection';
import { ZTableSection } from './components/sections/ZTableSection';
import { BEAUTY_SURVEY_120 } from './data/beautySurvey120';
import { SurveyRecord } from './types/survey';
import { parseSurveyFileContent } from './utils/csvParser';
import { analyzeColumns } from './utils/statsEngine';

type ActiveSection = 'overview' | 'normal' | 'binomial' | 'sampling' | 'ztable';

const NAV_ITEMS: Array<{ id: ActiveSection; label: string }> = [
  { id: 'overview', label: 'Panel Principal' },
  { id: 'normal', label: 'Distribución Normal' },
  { id: 'binomial', label: 'Binomial' },
  { id: 'sampling', label: 'Muestral' },
  { id: 'ztable', label: 'Tabla Z' },
];

export default function App() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('overview');
  const [records, setRecords] = useState<SurveyRecord[]>(BEAUTY_SURVEY_120);
  const [datasetName, setDatasetName] = useState<string>('Encuesta Universitaria de Belleza');
  const [isDefaultDataset, setIsDefaultDataset] = useState<boolean>(true);
  const [isDatasetModalOpen, setIsDatasetModalOpen] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const columns = useMemo(() => analyzeColumns(records), [records]);
  const numericCols = useMemo(
    () => columns.filter((c) => c.kind === 'numeric' && !c.isIdLike),
    [columns]
  );
  const categoricalCount = useMemo(
    () => columns.filter((c) => c.kind === 'categorical' || c.kind === 'binary').length,
    [columns]
  );

  const [selectedNumericKey, setSelectedNumericKey] = useState<string>('gasto_mensual');

  const activeNumericKey = numericCols.some((c) => c.key === selectedNumericKey)
    ? selectedNumericKey
    : numericCols[0]?.key || '';

  const handleLoadCustomDataset = (newRecords: SurveyRecord[], fileName: string) => {
    setRecords(newRecords);
    setDatasetName(fileName);
    setIsDefaultDataset(false);
    setUploadError(null);
    const nextCols = analyzeColumns(newRecords);
    const firstNum = nextCols.find((c) => c.kind === 'numeric' && !c.isIdLike);
    if (firstNum) setSelectedNumericKey(firstNum.key);
  };

  const handleRestoreDefault = () => {
    setRecords(BEAUTY_SURVEY_120);
    setDatasetName('Encuesta Universitaria de Belleza');
    setIsDefaultDataset(true);
    setUploadError(null);
    setSelectedNumericKey('gasto_mensual');
  };

  const handleQuickCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    try {
      const content = await file.text();
      const parsed = parseSurveyFileContent(content, file.name);
      handleLoadCustomDataset(parsed, file.name);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error al leer el archivo.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FCF9F6] text-[#231A20]">
      {/* Top Navigation Bar: 3-Zone Contract */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-[#EADFD9] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => setActiveSection('overview')}
            className="font-display text-xl font-semibold tracking-tight text-[#231A20] hover:text-[#9E3E5D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            BeautyStats
          </button>

          {/* Zone 2: Concise single-line navigation links */}
          <nav
            aria-label="Secciones estadísticas"
            className="hidden md:flex items-center gap-6 text-sm font-medium"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'border-[#C85A7C] text-[#9E3E5D] font-semibold'
                      : 'border-transparent text-[#5A4C53] hover:text-[#231A20] hover:border-[#DFC4CE]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt,.json"
              onChange={handleQuickCsvUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-xs font-medium text-white bg-[#C85A7C] hover:bg-[#B2486A] rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Cargar Datos CSV</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Strip */}
        <nav
          aria-label="Navegación móvil"
          className="md:hidden border-t border-[#F2E9E4] px-4 py-2 flex items-center gap-4 overflow-x-auto"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`py-1 text-xs font-medium border-b-2 whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'border-[#C85A7C] text-[#9E3E5D] font-semibold'
                    : 'border-transparent text-[#5A4C53]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Workspace Context Strip (outside header) */}
      <div className="bg-[#F5EFEA]/70 border-b border-[#EADFD9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#5A4C53]">
            <span className="font-medium text-[#231A20]">{datasetName}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{records.length} registros</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{numericCols.length} variables numéricas</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{categoricalCount} categóricas</span>
          </div>

          <div className="flex items-center gap-3">
            {!isDefaultDataset && (
              <button
                type="button"
                onClick={handleRestoreDefault}
                className="text-xs font-medium text-[#62489A] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                Restaurar encuesta (120)
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsDatasetModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9E3E5D] hover:text-[#7E2C47] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Explorar base de datos ({records.length})</span>
            </button>
          </div>
        </div>
      </div>

      {uploadError && (
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-[#FDF2F4] border border-[#E7B7C4] text-[#9E3E5D] text-xs px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{uploadError}</span>
            <button
              type="button"
              onClick={() => setUploadError(null)}
              className="font-medium underline ml-4"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeSection === 'overview' && (
          <OverviewPanel
            records={records}
            columns={columns}
            selectedNumericKey={activeNumericKey}
            onSelectNumericKey={setSelectedNumericKey}
          />
        )}

        {activeSection === 'normal' && (
          <NormalDistributionSection
            records={records}
            columns={columns}
            selectedNumericKey={activeNumericKey}
            onSelectNumericKey={setSelectedNumericKey}
          />
        )}

        {activeSection === 'binomial' && (
          <BinomialDistributionSection records={records} columns={columns} />
        )}

        {activeSection === 'sampling' && (
          <SamplingDistributionSection
            records={records}
            columns={columns}
            selectedNumericKey={activeNumericKey}
            onSelectNumericKey={setSelectedNumericKey}
          />
        )}

        {activeSection === 'ztable' && (
          <ZTableSection records={records} columns={columns} />
        )}
      </main>

      {/* Quiet Academic Footer */}
      <footer className="border-t border-[#EADFD9] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-wrap items-center justify-between gap-4 text-xs text-[#7C6D75]">
          <p>
            BeautyStats · Análisis Estadístico del Consumo de Productos de Belleza (Proyecto Universitario)
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsDatasetModalOpen(true)}
              className="hover:text-[#231A20] transition-colors cursor-pointer"
            >
              Ver registros ({records.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('normal')}
              className="hover:text-[#231A20] transition-colors cursor-pointer"
            >
              Normal
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('binomial')}
              className="hover:text-[#231A20] transition-colors cursor-pointer"
            >
              Binomial
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('sampling')}
              className="hover:text-[#231A20] transition-colors cursor-pointer"
            >
              Muestral
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('ztable')}
              className="hover:text-[#231A20] transition-colors cursor-pointer"
            >
              Tabla Z
            </button>
          </div>
        </div>
      </footer>

      <DatasetModal
        isOpen={isDatasetModalOpen}
        onClose={() => setIsDatasetModalOpen(false)}
        records={records}
        columns={columns}
        datasetName={datasetName}
        isDefault={isDefaultDataset}
        onLoadCustomDataset={handleLoadCustomDataset}
        onRestoreDefault={handleRestoreDefault}
      />
    </div>
  );
}
