import RouteStopEditor from '@/components/admin/RouteStopEditor';

export default function EditorPage() {
    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">노선 구성 편집</h2>
            <p className="mb-6 text-gray-600">노선에 정류장을 연결하고 순서를 지정합니다.</p>
            <RouteStopEditor />
        </div>
    );
}
