import { Global, Module } from "@nestjs/common";
import { createStorageProvider, StoragePort } from "@study-note/storage";

/**
 * StorageModule — @Global 단일 등록으로 app-wide 싱글톤 보장.
 *
 * ## NestJS provider scope와 DI 싱글톤
 * NestJS provider는 기본 Scope.DEFAULT(singleton scope)이므로 IoC 컨테이너가
 * 앱 전체에서 인스턴스를 1개만 생성한다. Spring의 @Service/@Component bean이
 * 기본 singleton scope로 관리되는 것과 동일한 원리다.
 *
 * ## 이전 버그 — 모듈별 중복 등록으로 인한 인스턴스 분리
 * materials/pdf-annotations/user-notes 세 모듈이 각자
 * `{ provide: StoragePort, useFactory: createStorageProvider }` 를 등록했다.
 * Nest는 각 모듈의 provider를 별개 토큰으로 취급하므로 인스턴스가 3개 생겼고,
 * in-memory 상태를 가진 local-mock 환경에서 cross-module 읽기가 깨졌다.
 * (Spring으로 치면 같은 @Bean 메서드를 세 @Configuration 클래스에 복붙한 것과 같다.
 *  prod(Cloudflare R2)는 stateless 공유 버킷이라 증상이 드러나지 않았다.)
 *
 * ## fix — @Global 1회 등록 + export
 * 이 모듈에서만 StoragePort를 등록하고 export한다.
 * 나머지 모듈은 imports 에 StorageModule 없이 StoragePort를 주입받는다.
 * DB 클라이언트를 같은 방식으로 관리하는 PrismaModule(@Global)과 동일한 패턴이다.
 *
 * ## 안티패턴 회피 — 정적 싱글톤 / 전역 변수
 * 모듈 스코프 변수나 static 필드로 인스턴스를 직접 공유하면 DI 컨테이너를 우회해
 * 테스트에서 mock 교체가 불가능해진다. StoragePort는 unit spec에서 교체 대상이므로
 * DI 관리 싱글톤이 정답이다.
 */
@Global()
@Module({
  providers: [{ provide: StoragePort, useFactory: createStorageProvider }],
  exports: [StoragePort]
})
export class StorageModule {}
