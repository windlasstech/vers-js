<div align="center">

# vers-js

[English](README.md) | 한국어

</div>

[VERS](https://packageurl.org/docs/vers/specification)(VErsion Range Specifier) 선언문을 파싱하고 검증하는, 런타임 독립적인 TypeScript 라이브러리.

## 개요

`vers-js`는 정규화된 VERS 구문 검증과 파싱 결과 메타데이터를 위한 소규모 데이터 중심 API를 제공합니다. `vers:npm/>=1.0.0|<2.0.0` 같은 VERS 문자열을 검증하고, 구조화한 성공/실패 결과와 기계가 읽을 수 있는 진단 정보를 반환합니다.

**주요 특징:**

- **런타임 독립적**: Node.js, Deno, Bun에서 모두 동작
- **ESM 전용**: 최신 ECMAScript 모듈, CommonJS 미지원
- **TypeScript 우선**: TypeScript로 작성되며 완전한 타입 선언 제공
- **엄격한 정규 검증**: 자동 수정, 강제 변환, 경고 모드 없음
- **기계가 읽을 수 있는 진단 정보**: 하위 도구를 위한 구조화한 오류 코드

## 설치

```bash
npm install vers-js
# 또는
pnpm add vers-js
# 또는
yarn add vers-js
# 또는
bun add vers-js
```

## 빠른 시작

```typescript
import { parseVers, validateVers, canonicalizeVers } from "vers-js";

// VERS 선언문 파싱
const result = parseVers("vers:npm/>=1.0.0|<2.0.0");

if (result.ok) {
  console.log(result.value.type); // "npm"
  console.log(result.value.constraints); // 파싱된 제약 조건
  console.log(result.value.canonical); // 정규화한 VERS 문자열
} else {
  console.log(result.issues); // 구조화한 진단 정보
}

// 파싱 없이 검증
const valid = validateVers("vers:npm/>=1.0.0|<2.0.0");
// { ok: true, value: true }

// 정규 형식 가져오기
const canonical = canonicalizeVers("vers:npm/>=1.0.0|<2.0.0");
// { ok: true, value: "vers:npm/>=1.0.0|<2.0.0" }
```

## API

### `parseVers(input: string): VersParseResult`

VERS 선언문을 파싱하고 파싱한 구문 메타데이터를 반환합니다.

**성공 시:**

```typescript
{
  ok: true,
  value: {
    scheme: "vers",
    type: "npm",
    constraints: [
      { comparator: ">=", version: "1.0.0" },
      { comparator: "<", version: "2.0.0" }
    ],
    canonical: "vers:npm/>=1.0.0|<2.0.0"
  }
}
```

### `validateVers(input: string): VersValidationResult`

VERS 선언문을 검증하되 파싱한 메타데이터는 반환하지 않습니다.

**성공 시:** `{ ok: true, value: true }`

### `canonicalizeVers(input: string): VersCanonicalizeResult`

VERS 선언문을 검증하고 정규화한 VERS 문자열을 반환합니다.

**성공 시:** `{ ok: true, value: "vers:npm/>=1.0.0|<2.0.0" }`

### 오류 처리

세 함수 모두 판별 결과를 VersResult 타입으로 반환합니다:

```typescript
type VersResult<T> =
  | { ok: true; value: T }
  | { ok: false; issues: VersIssue[]; metadata?: VersFailureMetadata };
```

문자열이 아닌 입력은 `TypeError`를 발생시킵니다:

```typescript
parseVers(null); // TypeError 발생
validateVers(123); // TypeError 발생
```

## 지원 범위

**v0.1.0 범위 내:**

- 정규화한 VERS 구문 검증
- 파싱한 선언문 메타데이터 (`VersRange`, `VersConstraint`)
- 정규 문자열 투영
- 구문 전용 타입 검증
- 단일 패스 퍼센트 디코딩
- 원본 입력 기반 영향 범위를 포함한 진단 정보

**v0.1.0 범위 밖:**

- 버전 비교 또는 포함 관계
- 생태계별 네이티브 범위 표현 변환
- 의미론적 정렬 또는 단순화
- 알려진 타입 레지스트리 적용
- 경고, 수정, 강제 변환 모드
- 취약점 해석 또는 VEX 의미론

## 문서

- **[아키텍처 사양](docs/architecture/)**: 구현 계약 및 기술 사양
- **[아키텍처 결정 기록](docs/decisions/)**: 설계 결정 및 근거(MADR 형식)
- **[AGENTS.md](AGENTS.md)**: 이 저장소에서 작업하는 AI 보조 도구용 지침

## 개발

**필수 조건:**

- Node.js 22 LTS 이상
- pnpm(패키지 매니저)

**스크립트:**

```bash
# 타입 검사
pnpm typecheck        # tsc --noEmit

# 빌드
pnpm build            # tsc -p tsconfig.build.json

# 테스트
pnpm test             # vitest run
pnpm test:watch       # vitest

# 린팅 및 포맷팅
pnpm lint             # oxlint --type-aware
pnpm lint:fix         # oxlint --type-aware --fix
pnpm format           # oxfmt
pnpm format:check     # oxfmt --check
```

## 라이선스

Apache 2.0. [LICENSE](LICENSE) 참고.
