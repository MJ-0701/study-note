// Polyfills loaded before any other module.
//
// hotfix(pdf-canvas): iPad Safari 18.5 의 PDF blank-canvas 가 pdfjs-dist 5.7.284 의
// `Map.prototype.getOrInsertComputed` (TC39 upsert proposal, stage 3) 호출 시점에
// `TypeError: ... is not a function` 으로 throw 한다. pdfjs 가 10+ call site
// (objectCache / methodPromises / intentStates / debug metadata 등) 에서 이 메서드
// 를 사용하기 때문에 단일 패치로 회복 가능. WeakMap 도 같은 proposal 의 일부라서
// 같이 polyfill — 미래 pdfjs 업그레이드 회귀 보호.
//
// 호환 매트릭스 (2026-05 기준):
//   - Chrome 134+ / Firefox 137+    : 네이티브 지원
//   - Safari 18.4 이상              : 부분 지원, iPad 환경에 따라 누락 보고됨
//   - Safari < 18.4 / iOS 18.3 이하 : 미지원
// 따라서 항상 conditional define — 네이티브 구현이 이미 있으면 건드리지 않는다.
//
// TC39 spec: https://tc39.es/proposal-upsert/

type GetOrInsert<K, V> = (key: K, defaultValue: V) => V;
type GetOrInsertComputed<K, V> = (key: K, computer: (key: K) => V) => V;

function definePrototypeMethod(
  target: unknown,
  name: string,
  // Method is generic by call-site, but JS prototype carries one shape per class.
  // The polyfill just installs the function; per-instance typing is provided by
  // the d.ts augmentation below.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: (...args: any[]) => any
): void {
  if (target == null) {
    return;
  }
  const holder = target as { prototype?: Record<string, unknown> };
  const proto = holder.prototype;
  if (!proto || typeof proto !== "object") {
    return;
  }
  if (typeof proto[name] === "function") {
    return;
  }
  Object.defineProperty(proto, name, {
    value,
    writable: true,
    configurable: true
  });
}

if (typeof globalThis !== "undefined") {
  // Map ----------------------------------------------------------------------
  definePrototypeMethod(Map, "getOrInsert", function <K, V>(this: Map<K, V>, key: K, defaultValue: V): V {
    if (this.has(key)) return this.get(key) as V;
    this.set(key, defaultValue);
    return defaultValue;
  });
  definePrototypeMethod(Map, "getOrInsertComputed", function <K, V>(this: Map<K, V>, key: K, computer: (key: K) => V): V {
    if (this.has(key)) return this.get(key) as V;
    const value = computer(key);
    this.set(key, value);
    return value;
  });

  // WeakMap ------------------------------------------------------------------
  definePrototypeMethod(WeakMap, "getOrInsert", function <K extends object, V>(this: WeakMap<K, V>, key: K, defaultValue: V): V {
    if (this.has(key)) return this.get(key) as V;
    this.set(key, defaultValue);
    return defaultValue;
  });
  definePrototypeMethod(WeakMap, "getOrInsertComputed", function <K extends object, V>(this: WeakMap<K, V>, key: K, computer: (key: K) => V): V {
    if (this.has(key)) return this.get(key) as V;
    const value = computer(key);
    this.set(key, value);
    return value;
  });
}

// TypeScript ambient augmentation so other modules can call the methods without
// `(map as any).getOrInsertComputed(...)`.
declare global {
  interface Map<K, V> {
    getOrInsert: GetOrInsert<K, V>;
    getOrInsertComputed: GetOrInsertComputed<K, V>;
  }
  interface WeakMap<K extends object, V> {
    getOrInsert: GetOrInsert<K, V>;
    getOrInsertComputed: GetOrInsertComputed<K, V>;
  }
}
