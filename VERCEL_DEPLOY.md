# Act-Vamp-Proto · Vercel 배포

이 프로젝트는 루트에서 `dist/`를 정적 출력 폴더로 사용하는 Vercel 프로젝트입니다. 저장소를 Vercel에 연결한 뒤 Framework Preset은 `Other`로 두면 됩니다. `vercel.json`이 빌드 명령과 출력 폴더를 지정하므로 별도의 패키지 설치가 필요하지 않습니다.

## Vercel 대시보드

1. Vercel에서 **Add New → Project**를 선택합니다.
2. `TeddyWeenie/Act-Vamp-Proto`를 가져옵니다.
3. Framework Preset은 **Other**, Root Directory는 저장소 루트로 둡니다.
4. 환경 변수 없이 Deploy를 누릅니다.

## Vercel CLI

저장소 루트에서 `vercel`을 실행해 로그인하고 프로젝트를 연결한 뒤, `vercel --prod`로 배포할 수 있습니다. `vercel.json`은 `dist/`를 배포 대상으로 사용합니다.

배포 후 `/atelier.html`에서 새 3D 모델과 9종 동작을 확인할 수 있습니다.
