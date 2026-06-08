# 문서

이 디렉터리는 `vers-js`의 설계 문서와 아키텍처 사양을 담고 있습니다.

## 구조

```
docs/
├── architecture/    # 구현 사양
├── decisions/       # 아키텍처 의사결정 기록(ADR)
└── README.md        # 이 파일
```

## 아키텍처 사양

[`architecture/`](architecture/) 디렉터리에는 유효한 아키텍처 의사결정들로부터 산출한 구체적인 구현 명세가 있습니다.

핵심 사양:

- **[범위 및 불변 조건](architecture/scope-and-invariants.md)**: v0.1.0 구현 경계
- **[공개 API](architecture/public-api.md)**: 정확한 함수 시그니처와 Result 형태
- **[빌드 및 테스트](architecture/build-and-test.md)**: 패키지 스캐폴드 및 검증 아키텍처
- **[데이터 모델 및 정규 출력](architecture/data-model-and-canonical-output.md)**: 파싱한 구문 메타데이터
- **[문자 인코딩](architecture/character-encoding.md)**: 퍼센트 디코딩 및 UTF-8 처리
- **[파서 단계](architecture/parser-phases.md)**: 스캐너/파서 실행 계약
- **[진단](architecture/diagnostics.md)**: 이슈 코드, 범위, 메타데이터
- **[픽스처(fixtures)](architecture/fixtures.md)**: 적합성 픽스처 처리
- **[리소스 제한](architecture/resource-limits.md)**: 입력 길이 및 진단 상한

## 아키텍처 결정 기록

[`decisions/`](decisions/) 디렉터리에는 [MADR 4.0.0](https://adr.github.io/madr/) 형식의 아키텍처 의사결정 기록들(ADRs)이 있습니다. 각 기록은 주요 아키텍처 결정과 그 맥락, 고려한 선택지들, 그리고 결정 결과를 문서화한 것입니다.

주요 결정 예시:

- **ADR-0001**: VERS 라이브러리에 TypeScript 사용
- **ADR-0004**: Result 중심 함수형 공개 API
- **ADR-0011**: ESM 전용 패키지 출시
- **ADR-0035**: v1용 수작업 스캐너/파서 사용

## 워크플로우

이 프로젝트는 **SDD(Spec-Driven Development, 사양 주도 개발)** 방법론을 따릅니다.

권장하는 문서 열람 및 작업 순서는 다음과 같습니다:

1. **의사결정 맥락**: ADR들을 통해 특정 아키텍처가 선택된 *이유*를 이해합니다.
2. **기술 명세**: 아키텍처 사양을 통해 *정확한 관측 가능한 동작*을 정의합니다.
3. **구현**: 사양에 따라 라이브러리와 테스트를 구현합니다.
