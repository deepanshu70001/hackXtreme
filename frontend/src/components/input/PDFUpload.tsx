import React, { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { extractTextFromPDF } from '../../lib/extractors/pdfExtractor';

interface PDFUploadProps {
  onExtract: (payload: { text: string; label: string }) => void;
  onError?: (message: string) => void;
}

export const PDFUpload: React.FC<PDFUploadProps> = ({ onExtract, onError }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      onError?.('Please upload a PDF file.');
      return;
    }
    setFileName(file.name);
    setIsExtracting(true);
    try {
      const text = await extractTextFromPDF(file);
      onExtract({ text, label: file.name });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Failed to extract text from the PDF.';
      onError?.(message);
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      className={`relative group cursor-pointer border-2 border-dashed rounded-2xl p-6 transition-all duration-300 ${
        isDragging ? 'border-emerald-500 bg-emerald-500/5' : 'border-white/10 hover:border-white/20'
      }`}
    >
      <input
        type="file"
        accept=".pdf"
        className="absolute inset-0 opacity-0 cursor-pointer"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      
      <div className="flex flex-col items-center text-center gap-3">
        <div className={`p-3 rounded-xl ${isDragging ? 'bg-emerald-500 text-white' : 'bg-white/5 text-text-secondary group-hover:text-white'}`}>
          <Upload className="w-6 h-6" />
        </div>
        
        <div>
          <p className="text-sm font-medium text-white">
            {fileName || 'Drop PDF here or click to browse'}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            {isExtracting ? 'Extracting text locally (OCR fallback enabled)...' : 'Local PDF text extraction + OCR fallback'}
          </p>
        </div>
      </div>

      {fileName && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setFileName(null);
          }}
          className="absolute top-2 right-2 p-1 hover:bg-white/10 rounded-full"
        >
          <X className="w-4 h-4 text-text-secondary" />
        </button>
      )}
    </div>
  );
};
