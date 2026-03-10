import type { MetaInfo } from '../types';

interface Props {
  metaInfo: MetaInfo;
  onChange: (info: MetaInfo) => void;
}

const STROKE_OPTIONS = ['自由形', '背泳ぎ', 'バタフライ', '平泳ぎ', '個人メドレー', 'フリーリレー', 'メドレーリレー'];
const DISTANCE_OPTIONS = ['25m', '50m', '100m', '200m', '400m', '800m', '1500m'];

const inputClass = "w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-base bg-white focus:outline-none focus:ring-2 focus:ring-sky-300/50 focus:border-sky-300 transition-shadow placeholder:text-slate-300";

export function MetaInfoForm({ metaInfo, onChange }: Props) {
  const update = (field: keyof MetaInfo, value: string) => {
    onChange({ ...metaInfo, [field]: value });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5 space-y-4 shadow-sm">
      <h3 className="text-sm font-bold text-slate-700">レース情報</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5 font-medium">選手名</label>
          <input
            type="text"
            value={metaInfo.swimmerName}
            onChange={(e) => update('swimmerName', e.target.value)}
            placeholder="山田太郎"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5 font-medium">日付</label>
          <input
            type="date"
            value={metaInfo.date}
            onChange={(e) => update('date', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1.5 font-medium">大会名</label>
        <input
          type="text"
          value={metaInfo.eventName}
          onChange={(e) => update('eventName', e.target.value)}
          placeholder="○○大会"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5 font-medium">距離</label>
          <select
            value={metaInfo.distance}
            onChange={(e) => update('distance', e.target.value)}
            className={inputClass}
          >
            <option value="">選択</option>
            {DISTANCE_OPTIONS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5 font-medium">泳法</label>
          <select
            value={metaInfo.stroke}
            onChange={(e) => update('stroke', e.target.value)}
            className={inputClass}
          >
            <option value="">選択</option>
            {STROKE_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
