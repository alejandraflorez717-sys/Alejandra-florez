import React, { useMemo, useRef, useState } from 'react';
import { Download, RotateCcw, Search, Upload, X } from 'lucide-react';
import { ColumnMeta, SurveyRecord } from '../types/survey';
import { exportSurveyToCsv, parseSurveyFileContent } from '../utils/csvParser';

interface DatasetModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: SurveyRecord[];
  columns: ColumnMeta[];
  datasetName: string;
  isDefault: boolean;
  onLoadCustomDataset: (records: SurveyRecord[], fileName: string) => void;
  onRestoreDefault: () => void;
}

export const DatasetModal: React.FC<DatasetModalProps> = ({
  isOpen,
  onClose,
  records,
  columns,
  datasetName,
  isDefault,
  onLoadCustomDataset,
  onRestoreDefault,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filteredRecords = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return records;
    return records.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(q))
    );
  }, [records, searchTerm]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    try {
      const text = await file.text();
      const parsed = parseSurveyFileContent(text, file.name);
      onLoadCustomDataset(parsed, file.name);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'No se pudo procesar el archivo seleccionado.'
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExport = () => {
    const csv = exportSurveyToCsv(records);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = isDefault ? 'beautystats_encuesta_120.csv' : datasetName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#231A20]/45 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dataset-modal-title"
    >
      <div className="bg-white border border-[#EADFD9] rounded-2xl w-full max-w-6xl max-h-[88vh] flex flex-col shadow-xl">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#EADFD9] flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 id="dataset-modal-title" className="font-display text-xl font-semibold text-[#231A20]">
              Base de datos activa · {datasetName}
            </h2>
            <p className="text-xs text-[#5A4C53] mt-0.5">
              {records.length} registros · {columns.length} variables detectadas automáticamente
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt,.json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 text-xs font-medium rounded-lg bg-[#C85A7C] hover:bg-[#B2486A] text-white inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Subir CSV / JSON</span>
            </button>

            <button
              type="button"
              onClick={handleExport}
              className="px-3.5 py-2 text-xs font-medium rounded-lg bg-[#F5EFEA] hover:bg-[#ECE2DA] text-[#231A20] border border-[#DFD2CA] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>

            {!isDefault && (
              <button
                type="button"
                onClick={onRestoreDefault}
                className="px-3.5 py-2 text-xs font-medium rounded-lg bg-white hover:bg-[#FCF9F6] text-[#62489A] border border-[#DFD2CA] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar 120 registros</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar visor de base de datos"
              className="p-2 rounded-lg text-[#5A4C53] hover:text-[#231A20] hover:bg-[#F5EFEA] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Detected Columns & Search */}
        <div className="px-6 py-3 bg-[#FCF9F6] border-b border-[#EADFD9] flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[#5A4C53]">
            Columnas:{' '}
            {columns.map((c, idx) => (
              <span key={c.key}>
                <span className="font-medium text-[#231A20]">{c.label}</span>{' '}
                <span className="text-[#7C6D75]">
                  ({c.kind === 'numeric' ? 'num' : c.kind === 'binary' ? 'binaria' : 'cat'})
                </span>
                {idx < columns.length - 1 ? ' · ' : ''}
              </span>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#7C6D75] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar registros..."
              className="w-full h-9 pl-8 pr-3 rounded-lg bg-white border border-[#DFD2CA] text-xs text-[#231A20] focus:outline-none focus:ring-2 focus:ring-[#C85A7C]/40"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-3 px-4 py-2.5 rounded-lg bg-[#FDF2F4] border border-[#E7B7C4] text-xs text-[#9E3E5D]">
            {errorMsg}
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto p-6 pt-3">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-white border-b border-[#EADFD9]">
              <tr className="text-left text-[#7C6D75]">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`py-2.5 px-3 font-medium whitespace-nowrap ${
                      col.kind === 'numeric' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2E9E4]">
              {filteredRecords.map((row, idx) => (
                <tr key={idx} className="hover:bg-[#FCF9F6]">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`py-2 px-3 whitespace-nowrap ${
                        col.kind === 'numeric'
                          ? 'text-right font-mono tabular-nums text-[#231A20]'
                          : 'text-left text-[#4A3F45]'
                      }`}
                    >
                      {String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRecords.length === 0 && (
            <div className="py-12 text-center text-sm text-[#7C6D75]">
              No se encontraron registros que coincidan con “{searchTerm}”.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
