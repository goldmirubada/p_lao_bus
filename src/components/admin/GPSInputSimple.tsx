'use client';

interface GPSInputSimpleProps {
    lat: number;
    lng: number;
    onLocationChange: (lat: number, lng: number) => void;
}

export default function GPSInputSimple({ lat, lng, onLocationChange }: GPSInputSimpleProps) {
    return (
        <div className="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                    위도 (Latitude)
                </label>
                <input
                    type="number"
                    step="0.000001"
                    value={lat}
                    onChange={(e) => onLocationChange(parseFloat(e.target.value), lng)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 font-mono"
                    placeholder="17.9757"
                />
            </div>
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                    경도 (Longitude)
                </label>
                <input
                    type="number"
                    step="0.000001"
                    value={lng}
                    onChange={(e) => onLocationChange(lat, parseFloat(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg p-2.5 font-mono"
                    placeholder="102.6331"
                />
            </div>
            <div className="text-xs text-slate-500 bg-blue-50 p-3 rounded border border-blue-100">
                💡 <strong>팁:</strong> Google Maps에서 위치를 찾아 마우스 우클릭 → 좌표 복사 후 붙여넣으세요.
            </div>
        </div>
    );
}
