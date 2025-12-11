export default function AdminDashboard() {
    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">관리자 대시보드</h2>

            <div className="mb-8 p-6 border rounded-lg bg-white shadow-sm">
                <h3 className="text-lg font-bold mb-3">🛠️ 앱 다운로드 (테스트용)</h3>
                <p className="text-sm text-gray-600 mb-4">
                    아래 링크를 통해 최신 빌드된 APK 파일을 다운로드할 수 있습니다.<br />
                    (안드로이드 스튜디오에서 빌드 후 public/apk 폴더에 파일을 넣고 배포해야 합니다.)
                </p>
                <a
                    href="/apk/app-release.apk"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors mb-6"
                    download
                >
                    📥 Latest APK Download
                </a>

                <div className="bg-gray-100 p-4 rounded text-sm text-gray-700 space-y-2">
                    <p className="font-bold">📱 설치 방법</p>
                    <ol className="list-decimal list-inside space-y-1 ml-1">
                        <li>위 <strong>Download</strong> 버튼을 눌러 APK 파일을 다운로드하세요.</li>
                        <li>다운로드가 완료되면 알림창을 눌러 실행하세요.</li>
                        <li>
                            <span className="text-red-600 font-medium">"보안상의 이유로 이 소스의 앱을 설치할 수 없습니다"</span>
                            라고 나오면 <strong>설정</strong>을 누르고 <strong>"이 소스 허용"</strong>을 켜주세요.
                        </li>
                        <li>설치 화면으로 돌아가서 <strong>설치</strong> 버튼을 누르면 완료됩니다.</li>
                        <li>
                            혹시 <span className="text-red-600 font-medium">"유해한 앱일 수 있습니다"</span>
                            경고가 뜨면 <strong>무시하고 설치</strong>를 눌러주세요. (플레이스토어에 등록되지 않은 테스트 앱이라 그렇습니다)
                        </li>
                    </ol>
                </div>
            </div>

            <p className="text-gray-600">왼쪽 메뉴를 선택하여 작업을 시작하세요.</p>
        </div>
    );
}
