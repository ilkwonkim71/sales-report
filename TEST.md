# 테스트 명세서 — 영업 일일 보고 시스템

## 테스트 범위 및 구성

| 구분 | 내용 |
|---|---|
| 테스트 대상 | REST API (백엔드) + 화면 동작 (프론트엔드) |
| 테스트 유형 | 기능 테스트, 권한 테스트, 입력 유효성 테스트, 경계값 테스트 |
| 우선순위 | H(High) / M(Medium) / L(Low) |

### 테스트 계정 사전 조건

| 계정 | 역할 | 용도 |
|---|---|---|
| staff1@test.com | STAFF | 영업사원 기본 테스트 |
| staff2@test.com | STAFF | 타 사원 권한 격리 확인 |
| super@test.com | SUPERVISOR | 상급자 기능 테스트 |

---

## 1. 인증 (Auth)

| ID | 테스트 항목 | 전제 조건 | 입력 | 기대 결과 | 우선순위 |
|---|---|---|---|---|---|
| AUTH-001 | 정상 로그인 (STAFF) | staff1 계정 존재 | 올바른 이메일·비밀번호 | 200, JWT 토큰 및 사용자 정보 반환 | H |
| AUTH-002 | 정상 로그인 (SUPERVISOR) | super 계정 존재 | 올바른 이메일·비밀번호 | 200, role: SUPERVISOR | H |
| AUTH-003 | 비밀번호 불일치 | — | 올바른 이메일 + 잘못된 비밀번호 | 401, `INVALID_CREDENTIALS` | H |
| AUTH-004 | 존재하지 않는 이메일 | — | 미등록 이메일 | 401, `INVALID_CREDENTIALS` | H |
| AUTH-005 | 이메일 누락 | — | email 필드 없음 | 400 | M |
| AUTH-006 | 비밀번호 누락 | — | password 필드 없음 | 400 | M |
| AUTH-007 | 토큰 없이 보호 API 호출 | — | Authorization 헤더 없이 GET /reports | 401 | H |
| AUTH-008 | 만료된 토큰으로 API 호출 | — | 만료된 JWT | 401 | H |
| AUTH-009 | 로그아웃 후 토큰 무효화 | 로그인 상태 | 로그아웃 → 동일 토큰으로 재요청 | 401 | M |

---

## 2. 일일 보고서 (Reports)

### 2-1. 보고서 생성

| ID | 테스트 항목 | 전제 조건 | 입력 | 기대 결과 | 우선순위 |
|---|---|---|---|---|---|
| REP-001 | 정상 보고서 생성 | staff1 로그인, 당일 보고서 없음 | 유효한 visits·problem·plan | 201, 생성된 보고서 반환 | H |
| REP-002 | 방문 기록 여러 행 생성 | staff1 로그인, 당일 보고서 없음 | visits 3건 | 201, visits 배열 3건 반환 | H |
| REP-003 | problem·plan 없이 생성 | staff1 로그인 | visits만 포함 | 201, problem·plan null | M |
| REP-004 | 같은 날짜 중복 생성 | staff1 오늘 보고서 존재 | 동일 날짜로 POST | 409, `REPORT_ALREADY_EXISTS` | H |
| REP-005 | 존재하지 않는 customer_id | staff1 로그인 | visits에 없는 customer_id | 400, `CUSTOMER_NOT_FOUND` | H |
| REP-006 | visits 빈 배열 | staff1 로그인 | `"visits": []` | 400 | H |
| REP-007 | SUPERVISOR가 보고서 생성 시도 | super 로그인 | POST /reports | 403 | H |

### 2-2. 보고서 목록 조회

| ID | 테스트 항목 | 전제 조건 | 입력 | 기대 결과 | 우선순위 |
|---|---|---|---|---|---|
| REP-008 | STAFF 본인 보고서 목록 | staff1 보고서 3건, staff2 보고서 2건 | GET /reports (staff1 로그인) | staff1 보고서 3건만 반환 | H |
| REP-009 | SUPERVISOR 전체 목록 | staff1·staff2 보고서 존재 | GET /reports (super 로그인) | 전체 보고서 반환 | H |
| REP-010 | 월 필터 | 5월·6월 보고서 혼재 | `?month=2026-05` | 5월 보고서만 반환 | H |
| REP-011 | SUPERVISOR staff_id 필터 | 다수 사원 보고서 존재 | `?staff_id=1` (super 로그인) | staff1 보고서만 반환 | M |
| REP-012 | STAFF가 staff_id 필터 사용 | staff1 로그인 | `?staff_id=2` | 본인 보고서만 반환 (필터 무시 또는 403) | M |
| REP-013 | 보고서 없는 월 조회 | — | `?month=2020-01` | 빈 배열 반환 | M |

### 2-3. 보고서 상세 조회

| ID | 테스트 항목 | 전제 조건 | 입력 | 기대 결과 | 우선순위 |
|---|---|---|---|---|---|
| REP-014 | STAFF 본인 보고서 상세 | staff1 보고서 존재 | GET /reports/:id (staff1 로그인) | 200, 전체 상세 반환 | H |
| REP-015 | STAFF가 타인 보고서 상세 조회 | staff2 보고서 존재 | GET /reports/:id (staff1 로그인) | 403 | H |
| REP-016 | SUPERVISOR가 모든 보고서 조회 | staff1 보고서 존재 | GET /reports/:id (super 로그인) | 200 | H |
| REP-017 | 존재하지 않는 보고서 조회 | — | GET /reports/99999 | 404 | M |

### 2-4. 보고서 수정

| ID | 테스트 항목 | 전제 조건 | 입력 | 기대 결과 | 우선순위 |
|---|---|---|---|---|---|
| REP-018 | problem 수정 | staff1 보고서 존재 | `{ "problem": "수정 내용" }` | 200, problem 반영 | H |
| REP-019 | plan 수정 | staff1 보고서 존재 | `{ "plan": "수정 내용" }` | 200, plan 반영 | H |
| REP-020 | STAFF가 타인 보고서 수정 | staff2 보고서 존재 | PUT /reports/:id (staff1 로그인) | 403 | H |
| REP-021 | SUPERVISOR가 보고서 수정 | staff1 보고서 존재 | PUT /reports/:id (super 로그인) | 403 | H |

---

## 3. 방문 기록 (Visit Records)

| ID | 테스트 항목 | 전제 조건 | 입력 | 기대 결과 | 우선순위 |
|---|---|---|---|---|---|
| VIS-001 | 방문 기록 추가 | staff1 보고서 존재 (1건) | 유효한 customer_id·visit_content | 201, 추가된 방문 기록 반환 | H |
| VIS-002 | 방문 기록 수정 | staff1 보고서에 방문 기록 존재 | 변경된 visit_content | 200, 수정 내용 반영 | H |
| VIS-003 | 방문 기록 삭제 (2건 이상) | staff1 보고서에 방문 기록 2건 | DELETE 1건 | 200, 1건 삭제 | H |
| VIS-004 | 마지막 방문 기록 삭제 시도 | staff1 보고서에 방문 기록 1건 | DELETE | 400, `LAST_VISIT_CANNOT_DELETE` | H |
| VIS-005 | STAFF가 타인 보고서에 방문 기록 추가 | staff2 보고서 존재 | POST (staff1 로그인) | 403 | H |
| VIS-006 | SUPERVISOR가 방문 기록 추가 시도 | 보고서 존재 | POST (super 로그인) | 403 | H |
| VIS-007 | 존재하지 않는 customer_id로 추가 | staff1 보고서 존재 | 없는 customer_id | 400, `CUSTOMER_NOT_FOUND` | H |
| VIS-008 | visit_content 빈 문자열 | staff1 보고서 존재 | `"visit_content": ""` | 400 | M |
| VIS-009 | 존재하지 않는 visitId 수정 | staff1 보고서 존재 | PUT /visits/99999 | 404 | M |

---

## 4. 댓글 (Comments)

| ID | 테스트 항목 | 전제 조건 | 입력 | 기대 결과 | 우선순위 |
|---|---|---|---|---|---|
| COM-001 | PROBLEM에 댓글 등록 | super 로그인, 보고서 존재 | `target_type: "PROBLEM"` | 201, 댓글 반환 | H |
| COM-002 | PLAN에 댓글 등록 | super 로그인, 보고서 존재 | `target_type: "PLAN"` | 201, 댓글 반환 | H |
| COM-003 | 같은 보고서에 댓글 여러 개 등록 | super 로그인 | PROBLEM 1건 + PLAN 1건 | 각각 201, 독립적으로 저장 | M |
| COM-004 | STAFF가 댓글 등록 시도 | staff1 로그인 | POST /comments | 403 | H |
| COM-005 | 본인 댓글 삭제 | super 로그인, 본인 댓글 존재 | DELETE /comments/:id | 200 | M |
| COM-006 | 타인 댓글 삭제 시도 | super2 계정으로 super1 댓글 삭제 | DELETE | 403 | M |
| COM-007 | 잘못된 target_type | super 로그인 | `target_type: "INVALID"` | 400 | M |
| COM-008 | content 빈 문자열 | super 로그인 | `"content": ""` | 400 | M |
| COM-009 | 존재하지 않는 보고서에 댓글 | super 로그인 | POST /reports/99999/comments | 404 | M |

---

## 5. 고객 마스터 (Customers)

| ID | 테스트 항목 | 전제 조건 | 입력 | 기대 결과 | 우선순위 |
|---|---|---|---|---|---|
| CUS-001 | 고객 목록 전체 조회 | 고객 5건 등록 | GET /customers (staff1 로그인) | 200, 5건 반환 | H |
| CUS-002 | 회사명으로 검색 | 고객 다수 등록 | `?q=A주식회사` | 이름에 "A주식회사" 포함된 고객만 반환 | H |
| CUS-003 | 담당자명으로 검색 | 고객 다수 등록 | `?q=김철수` | 담당자명 일치 고객 반환 | H |
| CUS-004 | 검색 결과 없음 | — | `?q=없는이름` | 빈 배열 반환 | M |
| CUS-005 | SUPERVISOR 고객 등록 | super 로그인 | 유효한 고객 정보 | 201, 등록된 고객 반환 | H |
| CUS-006 | STAFF 고객 등록 시도 | staff1 로그인 | POST /customers | 403 | H |
| CUS-007 | company_name 누락 | super 로그인 | company_name 없는 body | 400 | H |
| CUS-008 | contact_name 누락 | super 로그인 | contact_name 없는 body | 400 | H |
| CUS-009 | 고객 정보 수정 | super 로그인, 고객 존재 | phone 변경 | 200, 수정된 고객 정보 반환 | H |
| CUS-010 | STAFF 고객 수정 시도 | staff1 로그인 | PUT /customers/:id | 403 | H |
| CUS-011 | 존재하지 않는 고객 수정 | super 로그인 | PUT /customers/99999 | 404 | M |

---

## 6. 영업사원 마스터 (Staff)

| ID | 테스트 항목 | 전제 조건 | 입력 | 기대 결과 | 우선순위 |
|---|---|---|---|---|---|
| STF-001 | 영업사원 목록 조회 | super 로그인, 사원 다수 존재 | GET /staff | 200, 전체 사원 목록 | H |
| STF-002 | STAFF가 사원 목록 조회 | staff1 로그인 | GET /staff | 403 | H |
| STF-003 | 이름으로 검색 | super 로그인 | `?q=홍길동` | 이름 일치 사원 반환 | M |
| STF-004 | 영업사원 등록 | super 로그인 | 유효한 사원 정보 | 201, 등록된 사원 반환 (password 미포함) | H |
| STF-005 | 중복 이메일 등록 | 이미 등록된 이메일 | 동일 email로 POST | 409, `EMAIL_ALREADY_EXISTS` | H |
| STF-006 | STAFF가 사원 등록 시도 | staff1 로그인 | POST /staff | 403 | H |
| STF-007 | 필수 항목 누락 (name) | super 로그인 | name 없는 body | 400 | H |
| STF-008 | 필수 항목 누락 (email) | super 로그인 | email 없는 body | 400 | H |
| STF-009 | 필수 항목 누락 (password) | super 로그인 | password 없는 body | 400 | H |
| STF-010 | 사원 정보 수정 (부서 변경) | super 로그인, 사원 존재 | department 변경 | 200, 수정된 사원 정보 | H |
| STF-011 | 역할 STAFF → SUPERVISOR 변경 | super 로그인, STAFF 사원 존재 | `{ "role": "SUPERVISOR" }` | 200, role 반영 | M |
| STF-012 | STAFF가 사원 수정 시도 | staff1 로그인 | PUT /staff/:id | 403 | H |
| STF-013 | 응답에 password 미포함 확인 | super 로그인, 사원 존재 | GET /staff | 응답 JSON에 password 필드 없음 | H |

---

## 7. 통합 시나리오

보고서 생성부터 댓글까지 전체 흐름을 검증한다.

### SCN-001 · 영업사원 일일 업무 흐름

| 단계 | 조작 | 기대 결과 |
|---|---|---|
| 1 | staff1 로그인 | JWT 발급 |
| 2 | 오늘 보고서 작성 (visits 2건, problem, plan 포함) | 201, 보고서 생성 |
| 3 | 방문 기록 1건 추가 | 201, visits 총 3건 |
| 4 | 방문 기록 1건 삭제 | 200, visits 총 2건 |
| 5 | problem 내용 수정 | 200, 수정 반영 |
| 6 | 보고서 상세 조회 | visits 2건, 수정된 problem 확인 |

### SCN-002 · 상급자 검토 흐름

| 단계 | 조작 | 기대 결과 |
|---|---|---|
| 1 | super 로그인 | JWT 발급 |
| 2 | 보고서 목록 조회 (전체) | 전 사원 보고서 확인 |
| 3 | staff1 보고서 상세 조회 | visits·problem·plan 확인 |
| 4 | PROBLEM에 댓글 등록 | 201, 댓글 반환 |
| 5 | PLAN에 댓글 등록 | 201, 댓글 반환 |
| 6 | 보고서 상세 재조회 | comments 2건 포함 확인 |

### SCN-003 · 권한 격리 검증

| 단계 | 조작 | 기대 결과 |
|---|---|---|
| 1 | staff1 로그인 | JWT 발급 |
| 2 | staff2 보고서 상세 조회 | 403 |
| 3 | staff2 보고서에 방문 기록 추가 | 403 |
| 4 | 고객 마스터 등록 | 403 |
| 5 | 영업사원 목록 조회 | 403 |

---

## 테스트 케이스 요약

| 도메인 | 케이스 수 | H | M | L |
|---|---|---|---|---|
| 인증 | 9 | 6 | 3 | 0 |
| 보고서 | 21 | 14 | 7 | 0 |
| 방문 기록 | 9 | 7 | 2 | 0 |
| 댓글 | 9 | 3 | 6 | 0 |
| 고객 마스터 | 11 | 8 | 3 | 0 |
| 영업사원 마스터 | 13 | 10 | 3 | 0 |
| 통합 시나리오 | 3건 (17단계) | — | — | — |
| **합계** | **72 + 3시나리오** | **48** | **24** | **0** |
