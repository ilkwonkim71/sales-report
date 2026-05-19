# API 명세서 — 영업 일일 보고 시스템

## 공통 사항

### Base URL
```
/api/v1
```

### 인증
모든 엔드포인트(로그인 제외)는 요청 헤더에 JWT 토큰이 필요하다.
```
Authorization: Bearer {token}
```

### 공통 응답 형식
```json
{
  "data": { ... },   // 성공 시 응답 데이터
  "error": {         // 실패 시
    "code": "ERROR_CODE",
    "message": "설명"
  }
}
```

### 공통 HTTP 상태 코드

| 코드 | 의미 |
|---|---|
| 200 | 성공 |
| 201 | 생성 성공 |
| 400 | 요청 파라미터 오류 |
| 401 | 미인증 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 409 | 중복 충돌 (같은 날짜 보고서 이미 존재 등) |
| 500 | 서버 오류 |

---

## 1. 인증 (Auth)

### 1-1. 로그인
```
POST /api/v1/auth/login
```

**권한:** 없음 (공개)

**Request Body**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response 200**
```json
{
  "data": {
    "token": "eyJhbGci...",
    "user": {
      "id": 1,
      "name": "홍길동",
      "email": "hong@example.com",
      "role": "STAFF",
      "department": "영업1팀"
    }
  }
}
```

**Error**

| code | 상황 |
|---|---|
| `INVALID_CREDENTIALS` | 이메일 또는 비밀번호 불일치 |

---

### 1-2. 로그아웃
```
POST /api/v1/auth/logout
```

**권한:** 로그인 사용자

**Response 200**
```json
{ "data": null }
```

---

## 2. 일일 보고서 (Reports)

### 2-1. 보고서 목록 조회
```
GET /api/v1/reports
```

**권한:** STAFF(본인 보고서만), SUPERVISOR(전체)

**Query Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `month` | string | N | 조회 월. 형식: `YYYY-MM`. 기본값: 당월 |
| `staff_id` | number | N | SUPERVISOR만 사용 가능. 특정 사원 필터 |

**Response 200**
```json
{
  "data": [
    {
      "id": 10,
      "report_date": "2026-05-19",
      "staff": {
        "id": 1,
        "name": "홍길동"
      },
      "visit_count": 3,
      "has_problem": true,
      "has_plan": true,
      "created_at": "2026-05-19T09:00:00Z"
    }
  ]
}
```

---

### 2-2. 보고서 생성
```
POST /api/v1/reports
```

**권한:** STAFF

**Request Body**
```json
{
  "report_date": "2026-05-19",
  "visits": [
    {
      "customer_id": 5,
      "visit_content": "신규 제품 제안 미팅"
    }
  ],
  "problem": "A사 계약 조건 협의 지연",
  "plan": "B사 담당자에게 견적서 재발송"
}
```

**Response 201**
```json
{
  "data": {
    "id": 10,
    "report_date": "2026-05-19",
    "staff": { "id": 1, "name": "홍길동" },
    "visits": [
      {
        "id": 20,
        "customer": { "id": 5, "company_name": "A주식회사", "contact_name": "김철수" },
        "visit_content": "신규 제품 제안 미팅"
      }
    ],
    "problem": "A사 계약 조건 협의 지연",
    "plan": "B사 담당자에게 견적서 재발송",
    "comments": [],
    "created_at": "2026-05-19T09:00:00Z",
    "updated_at": "2026-05-19T09:00:00Z"
  }
}
```

**Error**

| code | 상황 |
|---|---|
| `REPORT_ALREADY_EXISTS` | 해당 날짜 보고서가 이미 존재 |
| `CUSTOMER_NOT_FOUND` | visits의 customer_id가 존재하지 않음 |

---

### 2-3. 보고서 상세 조회
```
GET /api/v1/reports/:id
```

**권한:** STAFF(본인 보고서만), SUPERVISOR(전체)

**Response 200**
```json
{
  "data": {
    "id": 10,
    "report_date": "2026-05-19",
    "staff": { "id": 1, "name": "홍길동", "department": "영업1팀" },
    "visits": [
      {
        "id": 20,
        "customer": { "id": 5, "company_name": "A주식회사", "contact_name": "김철수" },
        "visit_content": "신규 제품 제안 미팅"
      }
    ],
    "problem": "A사 계약 조건 협의 지연",
    "plan": "B사 담당자에게 견적서 재발송",
    "comments": [
      {
        "id": 30,
        "target_type": "PROBLEM",
        "content": "법무팀에 검토 요청해 보세요.",
        "author": { "id": 2, "name": "이상급" },
        "created_at": "2026-05-19T11:00:00Z"
      }
    ],
    "created_at": "2026-05-19T09:00:00Z",
    "updated_at": "2026-05-19T09:00:00Z"
  }
}
```

---

### 2-4. 보고서 수정
```
PUT /api/v1/reports/:id
```

**권한:** STAFF(본인 보고서만)

**Request Body** — 변경할 필드만 포함
```json
{
  "problem": "수정된 과제 내용",
  "plan": "수정된 내일 계획"
}
```
> 방문 기록 수정은 Visit Record API를 별도로 사용한다.

**Response 200**
```json
{
  "data": {
    "id": 10,
    "problem": "수정된 과제 내용",
    "plan": "수정된 내일 계획",
    "updated_at": "2026-05-19T10:00:00Z"
  }
}
```

---

## 3. 방문 기록 (Visit Records)

### 3-1. 방문 기록 추가
```
POST /api/v1/reports/:reportId/visits
```

**권한:** STAFF(본인 보고서만)

**Request Body**
```json
{
  "customer_id": 6,
  "visit_content": "계약서 서명 완료"
}
```

**Response 201**
```json
{
  "data": {
    "id": 21,
    "customer": { "id": 6, "company_name": "B주식회사", "contact_name": "박영희" },
    "visit_content": "계약서 서명 완료"
  }
}
```

---

### 3-2. 방문 기록 수정
```
PUT /api/v1/reports/:reportId/visits/:visitId
```

**권한:** STAFF(본인 보고서만)

**Request Body**
```json
{
  "customer_id": 6,
  "visit_content": "계약서 서명 및 납기 협의"
}
```

**Response 200**
```json
{
  "data": {
    "id": 21,
    "customer": { "id": 6, "company_name": "B주식회사", "contact_name": "박영희" },
    "visit_content": "계약서 서명 및 납기 협의"
  }
}
```

---

### 3-3. 방문 기록 삭제
```
DELETE /api/v1/reports/:reportId/visits/:visitId
```

**권한:** STAFF(본인 보고서만)

**제약:** 보고서의 마지막 방문 기록은 삭제 불가

**Response 200**
```json
{ "data": null }
```

**Error**

| code | 상황 |
|---|---|
| `LAST_VISIT_CANNOT_DELETE` | 마지막 남은 방문 기록 삭제 시도 |

---

## 4. 댓글 (Comments)

### 4-1. 댓글 등록
```
POST /api/v1/reports/:reportId/comments
```

**권한:** SUPERVISOR

**Request Body**
```json
{
  "target_type": "PROBLEM",
  "content": "법무팀에 검토 요청해 보세요."
}
```

> `target_type`: `PROBLEM` 또는 `PLAN`

**Response 201**
```json
{
  "data": {
    "id": 30,
    "target_type": "PROBLEM",
    "content": "법무팀에 검토 요청해 보세요.",
    "author": { "id": 2, "name": "이상급" },
    "created_at": "2026-05-19T11:00:00Z"
  }
}
```

---

### 4-2. 댓글 삭제
```
DELETE /api/v1/reports/:reportId/comments/:commentId
```

**권한:** SUPERVISOR(본인 댓글만)

**Response 200**
```json
{ "data": null }
```

---

## 5. 고객 마스터 (Customers)

### 5-1. 고객 목록 조회
```
GET /api/v1/customers
```

**권한:** 로그인 사용자

**Query Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `q` | string | N | 회사명 또는 담당자명 부분 검색 |

**Response 200**
```json
{
  "data": [
    {
      "id": 5,
      "company_name": "A주식회사",
      "contact_name": "김철수",
      "phone": "02-1234-5678",
      "address": "서울시 강남구",
      "created_at": "2026-01-10T00:00:00Z"
    }
  ]
}
```

---

### 5-2. 고객 등록
```
POST /api/v1/customers
```

**권한:** SUPERVISOR

**Request Body**
```json
{
  "company_name": "C주식회사",
  "contact_name": "최담당",
  "phone": "031-000-0000",
  "address": "경기도 성남시"
}
```

**Response 201**
```json
{
  "data": {
    "id": 7,
    "company_name": "C주식회사",
    "contact_name": "최담당",
    "phone": "031-000-0000",
    "address": "경기도 성남시",
    "created_at": "2026-05-19T09:00:00Z"
  }
}
```

---

### 5-3. 고객 수정
```
PUT /api/v1/customers/:id
```

**권한:** SUPERVISOR

**Request Body** — 변경할 필드만 포함
```json
{
  "phone": "031-111-2222"
}
```

**Response 200**
```json
{
  "data": {
    "id": 7,
    "company_name": "C주식회사",
    "contact_name": "최담당",
    "phone": "031-111-2222",
    "address": "경기도 성남시",
    "created_at": "2026-05-19T09:00:00Z"
  }
}
```

---

## 6. 영업사원 마스터 (Staff)

### 6-1. 영업사원 목록 조회
```
GET /api/v1/staff
```

**권한:** SUPERVISOR

**Query Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `q` | string | N | 이름 또는 이메일 부분 검색 |

**Response 200**
```json
{
  "data": [
    {
      "id": 1,
      "name": "홍길동",
      "email": "hong@example.com",
      "role": "STAFF",
      "department": "영업1팀",
      "created_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

---

### 6-2. 영업사원 등록
```
POST /api/v1/staff
```

**권한:** SUPERVISOR

**Request Body**
```json
{
  "name": "신입사원",
  "email": "new@example.com",
  "password": "초기비밀번호",
  "role": "STAFF",
  "department": "영업2팀"
}
```

**Response 201**
```json
{
  "data": {
    "id": 10,
    "name": "신입사원",
    "email": "new@example.com",
    "role": "STAFF",
    "department": "영업2팀",
    "created_at": "2026-05-19T09:00:00Z"
  }
}
```

**Error**

| code | 상황 |
|---|---|
| `EMAIL_ALREADY_EXISTS` | 이미 등록된 이메일 |

---

### 6-3. 영업사원 수정
```
PUT /api/v1/staff/:id
```

**권한:** SUPERVISOR

**Request Body** — 변경할 필드만 포함 (password는 재설정 시에만 포함)
```json
{
  "department": "영업1팀",
  "role": "SUPERVISOR"
}
```

**Response 200**
```json
{
  "data": {
    "id": 10,
    "name": "신입사원",
    "email": "new@example.com",
    "role": "SUPERVISOR",
    "department": "영업1팀",
    "created_at": "2026-05-19T09:00:00Z"
  }
}
```

---

## 엔드포인트 요약

| 메서드 | 경로 | 설명 | 권한 |
|---|---|---|---|
| POST | `/auth/login` | 로그인 | 공개 |
| POST | `/auth/logout` | 로그아웃 | 로그인 |
| GET | `/reports` | 보고서 목록 | 로그인 |
| POST | `/reports` | 보고서 생성 | STAFF |
| GET | `/reports/:id` | 보고서 상세 | 로그인 |
| PUT | `/reports/:id` | 보고서 수정 | STAFF(본인) |
| POST | `/reports/:reportId/visits` | 방문 기록 추가 | STAFF(본인) |
| PUT | `/reports/:reportId/visits/:visitId` | 방문 기록 수정 | STAFF(본인) |
| DELETE | `/reports/:reportId/visits/:visitId` | 방문 기록 삭제 | STAFF(본인) |
| POST | `/reports/:reportId/comments` | 댓글 등록 | SUPERVISOR |
| DELETE | `/reports/:reportId/comments/:commentId` | 댓글 삭제 | SUPERVISOR(본인) |
| GET | `/customers` | 고객 목록 | 로그인 |
| POST | `/customers` | 고객 등록 | SUPERVISOR |
| PUT | `/customers/:id` | 고객 수정 | SUPERVISOR |
| GET | `/staff` | 영업사원 목록 | SUPERVISOR |
| POST | `/staff` | 영업사원 등록 | SUPERVISOR |
| PUT | `/staff/:id` | 영업사원 수정 | SUPERVISOR |
