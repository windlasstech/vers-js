<div align="center">

# vers-js

[![NPM License](https://img.shields.io/npm/l/%40windlass%2Fvers-js)](LICENSE)
[![SemVer Versioning](https://img.shields.io/badge/version_scheme-SemVer-0097a7)](https://semver.org/)
[![SLSA Build L3](https://img.shields.io/badge/SLSA-Build_L3-97ca00.svg?logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALQAAAC0CAMAAAAKE/YAAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAC9FBMVEUAAAD/VQDxMADwMQDwMgDxMQDwMQDwMADwMQDwMQDvMQD/MADtLgDvMgDvMADwMQDwMQDvLwDjOQDxMQDwMQDwMQDwMQDwMQDqKwDvMADxMQDxLwD/MwDwMADwMQDwMQDyMADuMgDwMgDwMQDvMADwNQDvMQD/QADwMgDwMQDvLwDsLwDwMQDvMQD/JADvMADwMADxMgDyNgDwMQDwMQDxMgDwMQDwMQDuMgDwMQDwMgDvMgDwMQDwMQDyMwD/KwDwMQDwMgDwMgDwMQDwMwD/QADwMQDwMADvMADwMQDtNQDwMQDwMgDwMQDwMgDuMwDvMADwLwDxMAD/AADxMQDwMQD/AADwMADwMQDwMgDwMQDvMgDxMQDwMQDwMgDwMQDxMQDwMQD0NQDmMwDwMQDvMgDyLwDwMQDwMQDwMQDwMADwMgDyMwDvMQDxMgDvMQDwMQDwLgDuLgDwMQDxMADwMQDwMADvMgDxMQDvMQD1MwDwMQDxMQDzMgDwMgDxMgDwMQDvMADwMADwMQDxMADwMQDrMQDrJwDxMQDwMADvMgDxMADxMgDtLwDxMQDwMQDxMQDxMQDwMQDoLgDwMgDwMQDwMQDxMwDwMgDwMQDyLgDwMQDxMADwMQDwMQDvMADwMADxMADwMQDvMQDvMQDvMQDvMADwMQDvMgDxMQDwMQDvMQDwMQDxMgDwMgDwMADwMQDvMQDwMQDwMQDxMADwMQDxMQDwMgDvMADwMQDxMQDvMADwMQDvMQDyMgDxKwDvMQDzLgDvMQDwMQDxMQDtNwDwMwDwMQDxMQDvMQDwMgDxMADuMwDvMQDxMgDzMQDwMADxMgDwMgDwMADxMADuMgDwMQDwMgDwMQDwMADvMgDwMADwMQDvMADwMQDwMQDwLQDxMQDvMQDyMQDuMwDuMwDwMQDwMQDxMgDvMQDwMAD0LADwMQDwMQDwMQDwMQDwMQDwMQDxMADvMQDzLwDwMgDyMADxMADwMADvMQDwMQD///+A/jMyAAAA+nRSTlMAAzVjirDS3e75fhAccLPx7zEJXbv98DQMb+U2BXXt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)](https://slsa.dev/spec/v1.2/build-track-basics#build-l3)
[![NPM Version](https://img.shields.io/npm/v/@windlass/vers-js)](https://www.npmjs.com/package/@windlass/vers-js)
[![NPM Last Update](https://img.shields.io/npm/last-update/@windlass/vers-js)](https://www.npmjs.com/package/@windlass/vers-js)
[![Node Current](https://img.shields.io/node/v/@windlass/vers-js)](package.json)
![NPM Unpacked Size](https://img.shields.io/npm/unpacked-size/@windlass/vers-js)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-3.0-4baaaa.svg)](https://github.com/windlasstech/.github/blob/main/CODE_OF_CONDUCT.md)
[![GitHub issues](https://img.shields.io/badge/issue_tracking-GitHub-blue.svg)](https://github.com/windlasstech/vers-js/issues)

[![TypeScript dev dependency version](https://img.shields.io/github/package-json/dependency-version/windlasstech/vers-js/dev/typescript)](package.json)
[![Vitest dev dependency version](https://img.shields.io/github/package-json/dependency-version/windlasstech/vers-js/dev/vitest)](package.json)
[![markdownlint-cli2 dev dependency version](https://img.shields.io/github/package-json/dependency-version/windlasstech/vers-js/dev/markdownlint-cli2)](package.json)
[![Oxlint dev dependency version](https://img.shields.io/github/package-json/dependency-version/windlasstech/vers-js/dev/oxlint)](package.json)
[![Oxfmt dev dependency version](https://img.shields.io/github/package-json/dependency-version/windlasstech/vers-js/dev/oxfmt)](package.json)
[![Lefthook dev dependency version](https://img.shields.io/github/package-json/dependency-version/windlasstech/vers-js/dev/lefthook)](package.json)

[![Quality Gates](https://github.com/windlasstech/vers-js/actions/workflows/quality-gates.yml/badge.svg)](https://github.com/windlasstech/vers-js/actions/workflows/quality-gates.yml)
[![CodeQL](https://github.com/windlasstech/vers-js/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/windlasstech/vers-js/actions/workflows/github-code-scanning/codeql)
[![OSV Scanner Full](https://github.com/windlasstech/vers-js/actions/workflows/osv-scanner-full.yml/badge.svg)](https://github.com/windlasstech/vers-js/actions/workflows/osv-scanner-full.yml)
[![Dependency Review](https://github.com/windlasstech/vers-js/actions/workflows/dependency-review.yml/badge.svg)](https://github.com/windlasstech/vers-js/actions/workflows/dependency-review.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/windlasstech/vers-js/badge)](https://scorecard.dev/viewer/?uri=github.com/windlasstech/vers-js)
[![codecov](https://codecov.io/gh/windlasstech/vers-js/graph/badge.svg)](https://codecov.io/gh/windlasstech/vers-js)
[![Tested with fast-check](https://img.shields.io/badge/tested%20with-fast%E2%80%91check%20%F0%9F%90%92-%23282ea9?flat&logoSize=auto&labelColor=%231b1b1d)](https://fast-check.dev/)

[English](README.md) | 한국어

</div>

[VERS](https://packageurl.org/docs/vers/specification)(VErsion Range Specifier) 선언문을 파싱하고 검증하는, 런타임에 무관하게 동작하는 TypeScript 라이브러리.

## 개요

`vers-js`는 정규화된 VERS 구문 검증과 파싱 결과 메타데이터를 위한 소규모 데이터 중심 API를 제공합니다. `vers:npm/>=1.0.0|<2.0.0` 같은 VERS 문자열을 검증하고, 구조화한 성공/실패 결과와 기계가 읽을 수 있는 진단 정보를 반환합니다.

**주요 특징:**

- **런타임 독립적**: Node.js(>=22), Deno, Bun에서 모두 동작
- **외부 의존성 없음**: 런타임 의존성 없음
- **ESM 전용**: 최신 ECMAScript 모듈, CommonJS 미지원
- **named export 전용**: JavaScript default export 없이 명시적 루트 export 제공
- **TypeScript 우선**: TypeScript로 작성되며 완전한 타입 선언 제공
- **엄격한 정규 검증**: 자동 수정, 강제 변환, 경고 모드 없음
- **기계가 읽을 수 있는 진단 정보**: 하위 도구를 위한 구조화한 오류 코드

## 설치

```bash
npm install @windlass/vers-js
# 또는
pnpm add @windlass/vers-js
# 또는
yarn add @windlass/vers-js
# 또는
bun add @windlass/vers-js
```

## 빠른 시작

```typescript
import { parseVers, validateVers, canonicalizeVers } from "@windlass/vers-js";

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

## 문서 및 프로젝트 정책

- **[아키텍처 사양](docs/architecture/)**: 구현 계약 및 기술 사양
- **[아키텍처 결정 기록](docs/decisions/)**: 설계 결정 및 근거(MADR 형식)
- **[릴리즈 절차](docs/release.md)**: signed tag, npm Trusted Publishing, provenance, GitHub Release 워크플로우
- **[변경 기록](CHANGELOG.md)**: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) 및 인류력 릴리즈 날짜 형식에 따라 유지관리하는, 사용자 대상 릴리즈 노트
- **[기여 가이드](https://github.com/windlasstech/.github/blob/main/CONTRIBUTING.md)**: 윈들러스(Windlass) 조직 공통 기여 절차, PR 기대사항, 변경 기록 워크플로우
- **[보안 정책](https://github.com/windlasstech/.github/blob/main/SECURITY.md)**: 비공개 취약점 제보, 조율된 공개, 공급망 무결성 요구사항
- **[행동 강령](https://github.com/windlasstech/.github/blob/main/CODE_OF_CONDUCT.md)**: 모든 프로젝트 관련 상호작용에 적용되는 Contributor Covenant 3.0 커뮤니티 행동 강령 및 기준
- **[AGENTS.md](AGENTS.md)**: 이 저장소에서 작업하는 AI 보조 도구용 지침

## 개발

**필수 조건:**

- Node.js 22 LTS 이상
- pnpm(패키지 매니저)

**스크립트:**

```bash
# 타입 검사
pnpm run typecheck    # tsc --noEmit

# 빌드
pnpm run build        # tsc -p tsconfig.build.json

# 테스트
pnpm run test         # vitest run
pnpm run test:pbt     # vitest run tests/property-based.test.ts
pnpm run test:fuzz    # property별 시간 예산 기반 fuzz 탐색
pnpm run test:watch   # vitest
pnpm run test:coverage # vitest run --coverage

# test:fuzz의 10초 fast-check 시간 예산은 각 property 테스트마다 적용됩니다.
# 예상 실행 시간은 대략 property 수 × 10초에 시작 오버헤드를 더한 값입니다.
# property 실패는 VERS_PBT_SEED=<seed>와 VERS_PBT_PATH=<path>로 재현합니다.

# 패키지 검증(빌드 산출물 사용)
pnpm run test:package              # 빌드 후 배포 패키지 산출물 검증
pnpm run typecheck:package         # 빌드 후 패키지 소비자 선언문 타입 검사
pnpm run typecheck:package:blocked # 빌드 후 차단된 subpath import가 실패하는지 검증
pnpm run smoke:package             # 빌드 후 package-name 런타임 스모크 테스트 실행
pnpm run verify:package            # 위 모든 패키지 검증 작업 일괄 실행

# 런타임 스모크 테스트
pnpm run smoke:runtime # Node.js, Deno, Bun에서 빌드 산출물 스모크 테스트 실행
pnpm run verify:runtime # 빌드 후 모든 런타임 스모크 테스트 실행

# 린팅 및 포맷팅
pnpm run lint:md      # markdownlint-cli2
pnpm run lint:ts      # oxlint
pnpm run fmt          # oxfmt
pnpm run fmt:check    # oxfmt --check
```

## 라이선스

Apache 2.0. [LICENSE](LICENSE) 참고.
