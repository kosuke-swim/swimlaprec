import { useCallback, useRef, useState } from 'react';

interface Props {
  onFileSelect: (file: File) => void;
}

export function VideoUploader({ onFileSelect }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith('video/')) onFileSelect(file);
    },
    [onFileSelect]
  );

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-800">レース動画を分析</h2>
        <p className="text-slate-500 text-sm">動画をアップロードしてラップタイムを計測</p>
      </div>

      <div
        className={`
          relative flex flex-col items-center justify-center
          border-2 border-dashed rounded-2xl p-10
          cursor-pointer transition-all duration-200
          ${isDragging
            ? 'border-sky-400 bg-sky-50 scale-[1.02]'
            : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/50'
          }
          shadow-sm
        `}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
      >
        <div className={`
          w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors duration-200
          ${isDragging ? 'bg-sky-100' : 'bg-gradient-to-br from-blue-50 to-sky-50'}
        `}>
          <svg className="w-8 h-8 text-sky-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <p className="text-slate-700 font-semibold text-base">動画ファイルを選択</p>
        <p className="text-slate-400 text-xs mt-1.5">ドラッグ&ドロップ または タップ</p>
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
