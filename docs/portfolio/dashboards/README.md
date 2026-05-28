# 운영지표 대시보드 스냅샷

루트 `README.md` 의 "운영지표 대시보드 스냅샷 펼쳐보기" 드롭다운에서 참조하는 캡처 이미지 보관 폴더입니다.
라이브 Grafana / Prometheus 가 비활성화된 이후 포트폴리오 검토자가 동일 화면을 확인할 수 있도록 합니다.

## 파일 규약

| 파일명 | 대시보드 | 캡처 권장 시점 |
|---|---|---|
| `live-ops.png` | APM Live Ops (study-note-ops) | 부하 발생 직후 (호출량/p95 spike 보이게) |
| `product.png` | Product (study-note-product) | DAU/역할 분포/콘텐츠 누적 값이 채워진 상태 |
| `cost.png` | Cost (study-note-cost) | R2 storage/object 값 인입 후 |
| `dashboards-list.png` | Grafana Dashboards 목록 | 4종 모두 보이는 목록 화면 |

## 갱신 방법

1. 라이브 Grafana 에서 각 대시보드를 캡처합니다.
2. 위 파일명으로 이 폴더에 저장합니다 (PNG).
3. 루트 README 드롭다운의 캡처 일자를 갱신합니다.
4. 라이브 비활성화 시 README 상단 상태 배지를 🔴 **비활성** 으로 변경합니다.
