# 아키텍처 결정 기록

<div align="center">

[English](README.md) | 한국어

</div>

이 디렉터리에는 [MADR 4.0.0](https://adr.github.io/madr/) 형식으로 작성한 `vers-js` 아키텍처 의사결정 기록(ADR)들이 있습니다.

## 아키텍처 의사결정 기록(ADR)이란?

ADR은 중요한 아키텍처 결정과 그 맥락, 결과를 담은 문서입니다. 미래의 기여자가 프로젝트가 *무엇*을 구현했는지 파악하는 데 그치지 않고, _왜_ 그렇게 구현했는지를 이해하는 데 도움을 줍니다.

## 형식

각 ADR은 MADR 4.0.0 형식을 따릅니다.

- **맥락 및 문제 제기**: 어떤 문제를 해결하고 있는지
- **결정 동기**: 무엇이 결정에 영향을 미쳤는지
- **고려한 선택지들**: 어떤 대안들을 검토하였는지
- **결정 결과**: 어떤 선택을 했고 그 이유는 무엇인지
- **기대 효과**: 무엇을 얻었는지, 또한 대가가 있다면 무엇인지
- **확인**: 준수 여부를 어떻게 검증할지

## 의사결정 목록

### 기반(ADR-0000–0010)

| ADR                                                                           | 제목                                              | 상태     |
| ----------------------------------------------------------------------------- | ------------------------------------------------- | -------- |
| [0000](0000-use-markdown-architectural-decision-records.md)                   | MADR(마크다운 아키텍처 결정 기록) 사용            | accepted |
| [0001](0001-use-typescript-for-vers-library.md)                               | VERS 라이브러리에 TypeScript 사용                 | accepted |
| [0002](0002-use-nodejs-lts-for-development-runtime.md)                        | 개발 런타임으로 Node.js LTS 사용                  | accepted |
| [0003](0003-use-pnpm-as-development-package-manager.md)                       | 개발 패키지 매니저로 pnpm 사용                    | accepted |
| [0004](0004-use-result-centered-functional-public-api.md)                     | Result 중심 함수형 공개 API 사용                  | accepted |
| [0005](0005-use-syntax-metadata-data-model-with-discriminated-constraints.md) | 구별된 제약 조건이 있는 구문 메타데이터 모델 사용 | accepted |
| [0006](0006-use-bounded-accumulated-diagnostics.md)                           | 제한된 누적 진단 정보 사용                        | accepted |
| [0007](0007-use-hierarchical-namespaced-issue-codes.md)                       | 계층적 네임스페이스 이슈 코드 사용                | accepted |
| [0008](0008-use-parse-conformance-fixtures-for-v1.md)                         | v1 파싱 적합성 픽스처 사용                        | accepted |
| [0009](0009-use-snapshot-pinned-vers-spec-and-tests.md)                       | 스냅샷 고정 VERS 사양 및 테스트 사용              | accepted |
| [0010](0010-use-strict-canonicalization-without-auto-repair.md)               | 자동 수정 없는 엄격한 정규화 사용                 | accepted |

### 패키지 및 API(ADR-0011–0020)

| ADR                                                                      | 제목                                              | 상태     |
| ------------------------------------------------------------------------ | ------------------------------------------------- | -------- |
| [0011](0011-publish-esm-only-package.md)                                 | ESM 전용 패키지 출시                              | accepted |
| [0012](0012-use-root-only-package-exports.md)                            | 루트 전용 패키지 exports 사용                     | accepted |
| [0013](0013-use-root-types-with-exports-types-condition.md)              | exports 타입 조건이 있는 루트 타입 사용           | accepted |
| [0014](0014-use-universal-default-export-for-runtime-imports.md)         | 런타임 imports를 위한 범용 기본 export 사용       | accepted |
| [0015](0015-use-syntax-only-type-validation-with-advisory-registries.md) | 권고 레지스트리가 있는 구문 전용 타입 검증 사용   | accepted |
| [0016](0016-use-logical-parser-phases-with-explicit-fatal-boundaries.md) | 명시적인 치명적 경계가 있는 논리적 파서 단계 사용 | accepted |
| [0017](0017-use-rfc3986-unreserved-raw-version-characters.md)            | RFC 3986 비예약 raw 버전 문자 사용                | accepted |
| [0018](0018-accept-lowercase-percent-hex-and-emit-uppercase.md)          | 소문자 퍼센트 hex 수락 및 대문자 출력             | accepted |
| [0019](0019-reject-invalid-utf8-percent-decoded-versions.md)             | 잘못된 UTF-8 퍼센트 디코딩 버전 거부              | accepted |
| [0020](0020-use-single-pass-percent-decoding.md)                         | 단일 패스 퍼센트 디코딩 사용                      | accepted |

### 파싱 및 진단(ADR-0021–0030)

| ADR                                                                     | 제목                                            | 상태     |
| ----------------------------------------------------------------------- | ----------------------------------------------- | -------- |
| [0021](0021-preserve-input-order-and-defer-semantic-ordering-checks.md) | 입력 순서 유지 및 의미론적 정렬 검사 연기       | accepted |
| [0022](0022-use-decoded-string-equality-for-v1-duplicate-versions.md)   | v1 중복 버전에 디코딩된 문자열 기준 동등성 사용 | accepted |
| [0023](0023-use-original-input-for-diagnostic-spans.md)                 | 진단 범위에 원본 입력 사용                      | accepted |
| [0024](0024-use-zero-based-half-open-span-offsets.md)                   | 0 기반 반열린 구간 범위 오프셋 사용             | accepted |
| [0025](0025-use-utf16-code-unit-span-offsets.md)                        | UTF-16 코드 단위 범위 오프셋 사용               | accepted |
| [0026](0026-omit-unreliable-diagnostic-spans.md)                        | 신뢰할 수 없는 진단 범위 생략                   | accepted |
| [0027](0027-use-fixed-v1-input-length-limit.md)                         | 고정된 v1 입력 길이 제한 사용                   | accepted |
| [0028](0028-use-fixed-v1-diagnostic-issue-cap.md)                       | 고정된 v1 진단 이슈 상한 사용                   | accepted |
| [0029](0029-expose-diagnostic-cap-metadata.md)                          | 진단 상한 메타데이터 노출                       | accepted |
| [0030](0030-reserve-resource-options-and-use-internal-v1-constants.md)  | 리소스 옵션 예약 및 내장 v1 상수 사용           | accepted |

### API 정제(ADR-0031–0040)

| ADR                                                                         | 제목                                                  | 상태     |
| --------------------------------------------------------------------------- | ----------------------------------------------------- | -------- |
| [0031](0031-accept-only-single-string-input-in-v1-api.md)                   | v1 API에서 단일 문자열 입력만 수락                    | accepted |
| [0032](0032-treat-non-string-runtime-input-as-programmer-error.md)          | 문자열이 아닌 런타임 입력을 프로그래머 오류로 처리    | accepted |
| [0033](0033-exclude-known-type-registry-from-v1-core-api.md)                | v1 핵심 API에서 알려진 타입 레지스트리 제외           | accepted |
| [0034](0034-exclude-repair-and-warning-modes-from-v1-api.md)                | v1 API에서 수정 및 경고 모드 제외                     | accepted |
| [0035](0035-use-handwritten-scanner-parser-for-v1.md)                       | v1에서 수작업 스캐너/파서 사용                        | accepted |
| [0036](0036-use-typescript-compiler-first-build-without-bundling-for-v1.md) | v1에서 번들링 없는 TypeScript 컴파일러 우선 빌드 사용 | accepted |
| [0037](0037-use-vitest-for-v1-tests.md)                                     | v1 테스트용으로 Vitest 사용                           | accepted |
| [0038](0038-use-oxlint-with-type-aware-linting-for-v1.md)                   | v1용으로 타입 인식 린팅을 동반한 Oxlint 사용          | accepted |
| [0039](0039-use-oxfmt-for-v1-formatting.md)                                 | v1 포맷팅용으로 Oxfmt 사용                            | accepted |
| [0040](0040-use-node-22-lts-and-oxc-aligned-typescript-baselines.md)        | Node 22 LTS 및 Oxc에 적합한 TypeScript 기준선 사용    | accepted |

### 최종 사양 고정(ADR-0041–0049)

| ADR                                                                           | 제목                                       | 상태     |
| ----------------------------------------------------------------------------- | ------------------------------------------ | -------- |
| [0041](0041-pin-v0-1-0-vers-spec-snapshot.md)                                 | v0.1.0 VERS 사양 스냅샷 고정               | accepted |
| [0042](0042-separate-core-and-reserved-issue-codes.md)                        | 핵심 및 예약 이슈 코드 분리                | accepted |
| [0043](0043-use-resource-input-too-long-issue-code.md)                        | resource.input_too_long 이슈 코드 사용     | accepted |
| [0044](0044-use-presence-based-diagnostic-truncation-metadata.md)             | 존재 기반 진단 잘라내기 메타데이터 사용    | accepted |
| [0045](0045-use-v0-1-0-resource-limit-values.md)                              | v0.1.0 리소스 제한 값 사용                 | accepted |
| [0046](0046-separate-official-conformance-and-project-diagnostic-fixtures.md) | 공식 적합성 및 프로젝트 진단 픽스처 분리   | accepted |
| [0047](0047-use-vitest-v8-coverage-and-codecov-reporting.md)                  | Vitest V8 커버리지 및 Codecov 리포팅 사용  | accepted |
| [0048](0048-use-separated-vitest-test-files.md)                               | 분리된 Vitest 테스트 파일 사용             | accepted |
| [0049](0049-use-devengines-package-manager-for-pnpm-pinning.md)               | pnpm 고정에 devEngines.packageManager 사용 | accepted |

## 새 ADR 추가하기

새 결정 기록을 추가할 때는 다음과 같이 작업하세요.

1. 다음 순서의 번호를 사용합니다.
2. [ADR-0000](0000-use-markdown-architectural-decision-records.md)의 MADR 4.0.0 템플릿을 따릅니다.
3. 초기에 `status: proposed`를 설정합니다.
4. 검토 후 상태를 `accepted` 또는 `rejected`로 업데이트합니다.
5. 위의 인덱스 테이블에 ADR을 추가합니다.
6. 새 ADR이 기존 ADR의 결정을 번복하거나 업데이트하는 경우, 영향받는 기존 ADR의 상태를 `superseded by ADR-NNNN`(또는 상황에 맞게 `deprecated`, `updated` 등)으로 업데이트하고 프론트 매터에 역방향 링크를 추가합니다.

> [!WARNING]
> 한번 확정한 ADR들은 영구 보존 문서입니다. 단순 오탈자 교정이나 포맷팅을 제외하고, **절대 승인된 ADR의 본문을 사후에 편집하지 마십시오.** 승인 후 허용되는 유일한 추가 내용 변경은 `status` 필드 업데이트(예: `superseded`, `deprecated`)뿐입니다. 결정이 변경되면 기존 ADR을 다시 쓰는 대신 새 ADR을 작성하십시오.
