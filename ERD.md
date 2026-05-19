# ER 다이어그램 — 영업 일일 보고 시스템

```mermaid
erDiagram
    SALES_STAFF {
        int     id          PK
        string  name
        string  email
        string  role        "STAFF | SUPERVISOR"
        string  department
        datetime created_at
    }

    CUSTOMER {
        int     id          PK
        string  company_name
        string  contact_name
        string  phone
        string  address
        datetime created_at
    }

    DAILY_REPORT {
        int     id              PK
        int     sales_staff_id  FK
        date    report_date
        text    problem
        text    plan
        datetime created_at
        datetime updated_at
    }

    VISIT_RECORD {
        int     id              PK
        int     daily_report_id FK
        int     customer_id     FK
        text    visit_content
        datetime created_at
    }

    COMMENT {
        int     id              PK
        int     daily_report_id FK
        int     author_id       FK
        string  target_type     "PROBLEM | PLAN"
        text    content
        datetime created_at
    }

    SALES_STAFF  ||--o{ DAILY_REPORT  : "작성"
    DAILY_REPORT ||--o{ VISIT_RECORD  : "포함"
    CUSTOMER     ||--o{ VISIT_RECORD  : "방문됨"
    DAILY_REPORT ||--o{ COMMENT       : "달림"
    SALES_STAFF  ||--o{ COMMENT       : "작성"
```

## 제약 조건

| 테이블 | 제약 |
|---|---|
| `DAILY_REPORT` | `(sales_staff_id, report_date)` UNIQUE — 사원당 하루 1건 |
| `COMMENT.author_id` | `SALES_STAFF.role = 'SUPERVISOR'` 인 사람만 작성 가능 |
| `VISIT_RECORD` | `daily_report_id` 한 건당 행 수 제한 없음, 최소 1건 유지 |
