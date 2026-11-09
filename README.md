# Data Analyst: Multi-Agent Analytics Engine

A production-grade, multi-agent data analysis application that allows users to upload CSV files and interact with their data using natural language. The system synthesizes safe DuckDB SQL queries, generates interactive Recharts visualizations, detects statistical anomalies (IQR, Z-Score, Isolation Forest), explains step-by-step reasoning, and enforces strict security guardrails.

---

## Application Overview

The system provides an enterprise-focused analytics workspace:
* **Multi-CSV Ingestion & Schema Profiling:** Upload single or multiple CSVs with automatic schema discovery, null checks, unique value counts, and automatic foreign key detection for cross-table joins.
* **Deterministic Computation (Zero Hallucinations):** Eliminates mathematical hallucinations by delegating calculations to DuckDB rather than relying on generative model arithmetic.
* **LangGraph Multi-Agent Orchestration:** Specialized agents execute in an orchestrated state graph: Supervisor Router, Data Profiler, SQL Analyst, Visualization Specialist, Outlier Detector, and Insight Synthesizer.
* **Statistical Anomaly Detection:** Applies Interquartile Range (IQR), Z-Score, and Isolation Forest algorithms to flag numerical outliers with plain-language explanations.
* **Interactive Visualizations:** Dynamically renders Bar, Line, Area, and Pie charts using Recharts with instant chart-type switching.
* **Security & Guardrails:** AST-based Python sandbox and regex SQL parser preventing destructive statements (`DROP`, `DELETE`, `UPDATE`, `ALTER`, `TRUNCATE`) and prompt injections.
* **PostgreSQL Authentication:** Persistent user accounts, salted bcrypt password hashing, and token-based password reset stored in local or hosted PostgreSQL.
* **OpenRouter LLM Integration:** Managed centrally via environment variables (`.env`) supporting free and enterprise models with automated semantic fallbacks.
* **Compliance & Legal Readiness:** Dedicated Privacy Policy (`/privacy`), Terms of Service (`/terms`), SVG favicon, and zero telemetry on uploaded CSV data rows.

---

## System Architecture

```mermaid
flowchart TD
    User["User / Web Browser"] <-->|"HTTP / JSON"| Frontend["Next.js 14 Frontend"]
    Frontend <-->|"REST API"| Gateway["FastAPI Gateway"]

    subgraph AuthLayer ["Authentication Layer (PostgreSQL)"]
        PG[("PostgreSQL 16 Engine")]
        AuthService["Auth Router (Bcrypt / JWT)"]
    end

    subgraph SecurityLayer ["Security & Guardrails"]
        GuardIn["Input Guardrail: Prompt Injection & Path Traversal"]
        SQLGuard["SQL Guardrail: Destructive Statement Blocker"]
    end

    Gateway <--> AuthService
    AuthService <--> PG
    Gateway --> SecurityLayer

    subgraph LangGraphEngine ["LangGraph Multi-Agent Orchestration"]
        Supervisor["Supervisor / Router Agent"]
        Profiler["Data Profiler & Schema RAG Agent"]
        SQLAgent["SQL & Analytics Agent"]
        VizAgent["Visualization Agent"]
        AnomalyAgent["Statistical Anomaly Agent"]
        Synthesizer["Insight & Explanation Agent"]
    end

    SecurityLayer --> Supervisor
    Supervisor --> Profiler
    Profiler --> SQLAgent
    SQLAgent -->|"Safe Query"| DuckDB[("DuckDB In-Memory Engine")]
    DuckDB -->|"Raw Aggregates"| SQLAgent
    SQLAgent --> VizAgent
    SQLAgent --> AnomalyAgent
    VizAgent --> Synthesizer
    AnomalyAgent --> Synthesizer
    Synthesizer -->|"Structured JSON / Explanation"| Gateway
```

---

## Directory Structure

```
DATA/
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── state.py              # LangGraph AgentState TypedDict
│   │   │   ├── graph.py              # Multi-agent compiled StateGraph
│   │   │   ├── data_profiler.py      # Schema profiler & join key detector
│   │   │   ├── sql_agent.py          # SQL generator & safe executor
│   │   │   ├── viz_agent.py          # Visualization spec generator
│   │   │   ├── anomaly_agent.py      # IQR, Z-Score & Isolation Forest
│   │   │   └── insight_agent.py      # Executive synthesizer
│   │   ├── db/
│   │   │   ├── session.py            # SQLAlchemy PostgreSQL connection
│   │   │   └── models.py             # User and Auth database models
│   │   ├── engine/
│   │   │   ├── duckdb_engine.py      # In-memory DuckDB query runner
│   │   │   └── sandbox.py            # AST Python safe execution sandbox
│   │   ├── guardrails/
│   │   │   └── input_guard.py        # SQL injection & prompt guardrail
│   │   ├── models/
│   │   │   └── schemas.py            # Pydantic schemas for API & Agents
│   │   ├── routers/
│   │   │   ├── auth.py               # User registration, login, password reset
│   │   │   ├── upload.py             # CSV upload & table profiling
│   │   │   └── chat.py               # Natural language analysis endpoint
│   │   ├── config.py                 # Application settings & OpenRouter configuration
│   │   └── main.py                   # FastAPI application entrypoint
│   ├── tests/
│   │   ├── test_auth.py              # PostgreSQL authentication tests
│   │   ├── test_engine.py            # DuckDB engine tests
│   │   ├── test_guardrails.py        # Security guardrails tests
│   │   ├── test_anomaly.py           # Anomaly detection tests
│   │   └── test_agent_workflow.py    # End-to-end multi-agent integration tests
│   ├── requirements.txt              # Python dependencies
│   ├── run_tests.py                  # Pytest test runner
│   └── Dockerfile                    # Backend containerization
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx            # Next.js root layout with SVG favicon
│   │   │   ├── page.tsx              # Main analytics console
│   │   │   ├── privacy/page.tsx      # Privacy Policy document
│   │   │   ├── terms/page.tsx        # Terms of Service document
│   │   │   ├── icon.svg              # Minimalist database favicon
│   │   │   └── globals.css           # Tailwind CSS styles
│   │   ├── components/
│   │   │   ├── Header.tsx            # Navigation header with Auth profile controls
│   │   │   ├── AuthModal.tsx         # Sign in, registration, password reset modal
│   │   │   ├── FileUpload.tsx        # Multi-CSV ingestion zone
│   │   │   ├── DataPreview.tsx       # Schema inspector & data table preview
│   │   │   ├── ChatInterface.tsx     # Natural language analytics interface
│   │   │   ├── ChartViewer.tsx       # Recharts data visualizer (neutral palette)
│   │   │   ├── AnomalyViewer.tsx     # Statistical outlier cards & explanations
│   │   │   └── ReasoningViewer.tsx   # Step-by-step execution graph accordion
│   │   ├── lib/
│   │   │   └── api.ts                # Typed HTTP client for backend endpoints
│   │   └── types/
│   │       └── index.ts              # TypeScript interfaces
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile                    # Frontend containerization
├── docker-compose.yml                # Multi-service container orchestration
├── pytest.ini                        # Pytest configuration
├── .env                              # Environment variables (OpenRouter & Database)
└── README.md                         # Documentation
```

---

## Installation & Setup

### Prerequisites
* Python 3.11 or higher
* Node.js 18 or higher with npm
* PostgreSQL 14 or higher (or Docker)

### 1. Database Configuration
Ensure PostgreSQL is running locally on port 5432:
```sql
CREATE DATABASE data_analyst;
```
Default connection string configured in `.env`:
```env
DATABASE_URL=postgresql://postgres:4321@localhost:5432/data_analyst
```
If PostgreSQL is unreachable, the system automatically falls back to an embedded SQLite database (`sqlite:///./data_analyst_auth.db`) so the application never halts.

### 2. OpenRouter API Key Configuration
Configure your OpenRouter API key inside `.env` in the root directory:
```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free
OPENROUTER_FALLBACK_MODEL=meta-llama/llama-3.3-70b-instruct:free
```
The API key is handled strictly server-side and never exposed to the client browser.

### 3. Backend Startup
```bash
# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Run FastAPI backend
python start_backend.py
```
The backend starts at `http://127.0.0.1:8000`. Interactive OpenAPI documentation is available at `http://127.0.0.1:8000/docs`.

### 4. Frontend Startup
```bash
cd frontend
npm install
npm run dev
```
Open your browser at `http://localhost:3000`.

---

## Docker Compose Deployment

Run the complete stack (PostgreSQL, FastAPI Backend, Next.js Frontend) with a single command:
```bash
docker-compose up --build
```
* Frontend: `http://localhost:3000`
* Backend API: `http://localhost:8000`
* Swagger Documentation: `http://localhost:8000/docs`

---

## Automated Verification & Testing

The repository includes a comprehensive Pytest test suite covering DuckDB queries, multi-agent workflows, statistical outlier detectors, security guardrails, and PostgreSQL authentication:

```bash
.\venv\Scripts\python.exe backend/run_tests.py
```

Test Results Summary:
```
backend/tests/test_agent_workflow.py::test_highest_revenue_by_region PASSED
backend/tests/test_agent_workflow.py::test_monthly_sales_trends PASSED
backend/tests/test_agent_workflow.py::test_top_five_customers_multi_table_join PASSED
backend/tests/test_agent_workflow.py::test_underperforming_products PASSED
backend/tests/test_agent_workflow.py::test_detect_anomalies_workflow PASSED
backend/tests/test_anomaly.py::test_anomaly_detection_iqr_and_zscore PASSED
backend/tests/test_auth.py::test_auth_registration_and_login PASSED
backend/tests/test_auth.py::test_auth_forgot_and_reset_password PASSED
backend/tests/test_engine.py::test_duckdb_registration_and_inspect PASSED
backend/tests/test_engine.py::test_duckdb_query_execution PASSED
backend/tests/test_guardrails.py::test_sql_guardrail_blocks_destructive_commands PASSED
backend/tests/test_guardrails.py::test_sql_guardrail_permits_read_only_queries PASSED
backend/tests/test_guardrails.py::test_prompt_injection_guardrail PASSED

============================= 13 passed in 22.65s =============================
```

Frontend production verification:
```bash
cd frontend
npm run build
```
Generates 100% static and dynamic optimized routes without errors or warnings.

---

## Custom Domain Deployment Guide

To deploy this application to production with a custom domain (e.g. `analytics.yourdomain.com`):

### 1. DNS Configuration
Add the following DNS records at your domain registrar:
* **Type:** `A` | **Name:** `analytics` (or `@` for apex) | **Value:** `<YOUR_SERVER_PUBLIC_IP>` | **TTL:** `300`
* **Type:** `CNAME` | **Name:** `www.analytics` | **Value:** `analytics.yourdomain.com` | **TTL:** `300`

### 2. Reverse Proxy Setup (Nginx)
Create `/etc/nginx/sites-available/analytics.yourdomain.com`:
```nginx
server {
    listen 80;
    server_name analytics.yourdomain.com;

    # Next.js Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # FastAPI Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the configuration and obtain a free Let's Encrypt SSL certificate:
```bash
sudo ln -s /etc/nginx/sites-available/analytics.yourdomain.com /etc/nginx/sites-enabled/
sudo certbot --nginx -d analytics.yourdomain.com
```

### 3. Alternative: Caddyfile (Automatic SSL)
```caddy
analytics.yourdomain.com {
    handle /api/* {
        reverse_proxy 127.0.0.1:8000
    }
    handle {
        reverse_proxy 127.0.0.1:3000
    }
}
```

---

## Example Queries

| Objective | Example Prompt | Expected Behavior |
| :--- | :--- | :--- |
| **Aggregations** | "Which region generated the highest revenue?" | Computes revenue grouped by region; renders Bar Chart. |
| **Time Trends** | "Show monthly sales trends." | Aggregates volume by month; renders interactive Line Chart. |
| **Underperformers** | "Which products are underperforming?" | Identifies lowest-volume items; outlines turnover metrics. |
| **Multi-Table Joins** | "What are the top five customers?" | Automatically joins customer and transaction tables on ID. |
| **Anomaly Detection** | "Detect anomalies in the dataset." | Runs IQR and Z-Score routines; flags numerical outliers. |
| **SQL Generation** | "Generate SQL for this analysis." | Produces formatted DuckDB SQL with explanation of clauses. |

---

## Technical Notes & Implementation Decisions

1. **In-Memory DuckDB Engine:** Uploaded CSV files are registered into in-memory DuckDB virtual tables. This provides sub-millisecond execution times for millions of rows without disk bloat or residual file leaks.
2. **Deterministic Code-First Execution:** LLM reasoning is strictly segregated into SQL generation and result interpretation. Aggregations, rankings, and mathematical calculations are executed by the database engine, preventing numerical hallucinations.
3. **Graceful Authentication Fallback:** The backend connects to PostgreSQL 16 by default and falls back gracefully to SQLite if the database server is undergoing maintenance.
4. **Zero-Telemetry Privacy:** Uploaded datasets are never transmitted to third parties or used for model training. Only aggregated column statistics and necessary schema definitions are referenced during query synthesis.
