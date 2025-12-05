import RouteManager from '@/components/admin/RouteManager';

export default function RoutesPage() {
    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">버스 노선 관리</h2>
            <RouteManager />
        </div>
    );
}
