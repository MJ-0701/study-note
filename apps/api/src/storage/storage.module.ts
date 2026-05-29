import { Global, Module } from "@nestjs/common";
import { createStorageProvider, StoragePort } from "@study-note/storage";

// StoragePort 단일 공유 인스턴스. local-mock 의 in-memory 상태가 모든 모듈에서
// 동일 인스턴스로 공유되도록 @Global 1곳에서만 provide (이전엔 모듈별 provider 가
// 인스턴스를 분리시켜 cross-module read 가 깨졌음).
@Global()
@Module({
  providers: [{ provide: StoragePort, useFactory: createStorageProvider }],
  exports: [StoragePort]
})
export class StorageModule {}
