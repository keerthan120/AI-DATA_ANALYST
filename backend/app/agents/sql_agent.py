import json
import re
from typing import Optional, Any
from openai import OpenAI
from app.config import settings
from app.engine.duckdb_engine import db_engine
from app.guardrails.input_guard import InputGuardrail

class SQLAgent:
    @staticmethod
    def generate_and_execute_sql(
        user_query: str,
        schema_context: str,
        table_names: list[str],
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ) -> tuple[Optional[str], Optional[str], list[dict[str, Any]], int, Optional[str], list[str]]:
        """
        Generates SQL and Pandas code via LLM (or robust dynamic semantic fallback), validates via guardrails, and executes against DuckDB.
        Returns: (sql_query, python_code, rows, total_rows, error_message, reasoning_steps)
        """
        reasoning_steps: list[str] = []
        sql_query: Optional[str] = None
        python_code: Optional[str] = None

        # 1. Check if LLM is accessible
        effective_key = api_key or settings.OPENROUTER_API_KEY
        effective_model = model or settings.OPENROUTER_MODEL

        if effective_key:
            try:
                reasoning_steps.append("Calling OpenRouter LLM to translate natural language intent into SQL and Pandas code...")
                sql_query, python_code, steps = SQLAgent._call_llm_for_sql(
                    user_query=user_query,
                    schema_context=schema_context,
                    api_key=effective_key,
                    model=effective_model
                )
                reasoning_steps.extend(steps)
            except Exception as e:
                reasoning_steps.append(f"LLM API call failed or rate-limited ({str(e)}). Falling back to dynamic semantic query generator.")
                sql_query, python_code, steps = SQLAgent._dynamic_semantic_sql(user_query, table_names)
                reasoning_steps.extend(steps)
        else:
            reasoning_steps.append("No OpenRouter API key provided. Activating dynamic semantic SQL & Pandas generator.")
            sql_query, python_code, steps = SQLAgent._dynamic_semantic_sql(user_query, table_names)
            reasoning_steps.extend(steps)

        if not sql_query:
            return None, None, [], 0, "Could not determine a valid SQL query for this question.", reasoning_steps

        # 2. Guardrail Validation
        reasoning_steps.append("Validating SQL query through safety guardrails...")
        is_safe, violations = InputGuardrail.validate_sql(sql_query)
        if not is_safe:
            err = f"Guardrail Violation: {'; '.join(violations)}"
            return sql_query, python_code, [], 0, err, reasoning_steps

        # 3. Execution in DuckDB
        try:
            reasoning_steps.append(f"Executing query safely in DuckDB engine: {sql_query}")
            rows, total_count = db_engine.execute_query(sql_query, max_rows=settings.MAX_RESULT_ROWS)
            reasoning_steps.append(f"Query returned {total_count} matching rows.")
            return sql_query, python_code, rows, total_count, None, reasoning_steps
        except Exception as e:
            err = f"DuckDB Execution Error: {str(e)}"
            reasoning_steps.append(f"Execution failed: {err}")
            return sql_query, python_code, [], 0, err, reasoning_steps

    @staticmethod
    def _call_llm_for_sql(
        user_query: str,
        schema_context: str,
        api_key: str,
        model: str
    ) -> tuple[Optional[str], Optional[str], list[str]]:
        client = OpenAI(
            base_url=settings.OPENROUTER_BASE_URL,
            api_key=api_key,
        )

        system_prompt = f"""
You are an expert Data Analyst, DuckDB SQL generator, and Pandas Python programmer.
Generate a valid DuckDB SQL SELECT query and equivalent idiomatic Pandas Python code that answers the user's question based strictly on the provided schema.

Rules:
1. ONLY return valid DuckDB SQL syntax and valid Python/Pandas code.
2. Read-only queries only (SELECT or WITH). Never write DROP, DELETE, INSERT, UPDATE, ALTER.
3. For date manipulation in DuckDB, use strftime(col, '%Y-%m') or date_trunc('month', col).
4. If multi-table join is required, use proper JOIN syntax with matching foreign keys.
5. Limit results to 100 unless a specific LIMIT is requested.
6. Provide your response as a strict JSON object with:
   - "sql": "THE_DUCKDB_SQL_QUERY",
   - "pandas": "THE_EQUIVALENT_PANDAS_PYTHON_CODE",
   - "reasoning": ["Step 1 explanation", "Step 2 explanation"]

Schema Context:
{schema_context}
"""

        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"User Query: {user_query}"}
            ],
            response_format={"type": "json_object"},
            temperature=0.1
        )

        content = response.choices[0].message.content or "{}"
        data = json.loads(content)
        sql = data.get("sql")
        pandas_code = data.get("pandas")
        reasoning = data.get("reasoning", ["Synthesized SQL and Pandas from user intent and schema."])

        # Clean markdown wrappers if present
        if sql:
            sql = re.sub(r"^```sql\s*", "", sql, flags=re.MULTILINE)
            sql = re.sub(r"```$", "", sql, flags=re.MULTILINE).strip()
        if pandas_code:
            pandas_code = re.sub(r"^```python\s*", "", pandas_code, flags=re.MULTILINE)
            pandas_code = re.sub(r"```$", "", pandas_code, flags=re.MULTILINE).strip()

        return sql, pandas_code, reasoning

    @staticmethod
    def _dynamic_semantic_sql(
        user_query: str,
        table_names: list[str]
    ) -> tuple[Optional[str], Optional[str], list[str]]:
        """
        Dynamically generates valid DuckDB SQL and Pandas code by matching query intent and keywords
        against ANY registered table and its actual column types (numeric, categorical, temporal).
        Works seamlessly for arbitrary user-uploaded CSV files.
        """
        q = user_query.lower()
        steps: list[str] = []
        all_schemas = db_engine.get_registered_tables_info()

        if not all_schemas:
            steps.append("No active tables registered in DuckDB.")
            return None, None, steps

        # 1. Determine target table
        target_schema = None
        if table_names:
            for s in all_schemas:
                if s.table_name in table_names:
                    target_schema = s
                    break
        if not target_schema:
            for s in all_schemas:
                if s.table_name.lower() in q:
                    target_schema = s
                    break
        if not target_schema:
            target_schema = all_schemas[0]

        table_name = target_schema.table_name
        steps.append(f"Selected target table '{table_name}' with {len(target_schema.columns)} columns.")

        # Classify columns of the target table
        columns = target_schema.columns
        numeric_cols = [c.name for c in columns if any(t in c.dtype.upper() for t in ["INT", "DOUBLE", "FLOAT", "DECIMAL", "HUGEINT", "BIGINT"])]
        date_cols = [c.name for c in columns if any(t in c.dtype.upper() for t in ["DATE", "TIME", "TIMESTAMP"]) or "date" in c.name.lower() or "time" in c.name.lower() or "year" in c.name.lower() or "month" in c.name.lower()]
        cat_cols = [c.name for c in columns if c.name not in numeric_cols and c.name not in date_cols]

        # Match columns mentioned in query
        matched_nums = [c for c in numeric_cols if c.lower() in q]
        matched_cats = [c for c in cat_cols if c.lower() in q]
        matched_dates = [c for c in date_cols if c.lower() in q]

        # Select primary metric and dimension
        metric_col = matched_nums[0] if matched_nums else (numeric_cols[0] if numeric_cols else None)
        dim_col = matched_cats[0] if matched_cats else (cat_cols[0] if cat_cols else (columns[0].name if columns else "*"))
        date_col = matched_dates[0] if matched_dates else (date_cols[0] if date_cols else None)

        # Pattern 1: Temporal / Trend query
        if date_col and any(k in q for k in ["trend", "monthly", "over time", "seasonality", "timeline", "by month", "by date", "by year"]):
            steps.append(f"Identified temporal trend query on date column '{date_col}' and metric '{metric_col}'.")
            if metric_col:
                sql = f"""
SELECT strftime('%Y-%m', CAST("{date_col}" AS DATE)) AS period,
       ROUND(SUM("{metric_col}"), 2) AS total_{metric_col},
       COUNT(*) AS record_count
FROM "{table_name}"
WHERE "{date_col}" IS NOT NULL
GROUP BY period
ORDER BY period ASC;
"""
                pandas_code = f"""import pandas as pd

df = pd.read_csv('{table_name}.csv')
df['period'] = pd.to_datetime(df['{date_col}']).dt.strftime('%Y-%m')
result = (
    df.groupby('period', as_index=False)
    .agg(total_{metric_col}=('{metric_col}', 'sum'), record_count=('{metric_col}', 'count'))
    .round({{'total_{metric_col}': 2}})
    .sort_values(by='period', ascending=True)
)
print(result)"""
            else:
                sql = f"""
SELECT strftime('%Y-%m', CAST("{date_col}" AS DATE)) AS period,
       COUNT(*) AS record_count
FROM "{table_name}"
WHERE "{date_col}" IS NOT NULL
GROUP BY period
ORDER BY period ASC;
"""
                pandas_code = f"""import pandas as pd

df = pd.read_csv('{table_name}.csv')
df['period'] = pd.to_datetime(df['{date_col}']).dt.strftime('%Y-%m')
result = df.groupby('period', as_index=False).size().rename(columns={{'size': 'record_count'}})
print(result)"""
            return sql.strip(), pandas_code.strip(), steps

        # Pattern 2: Top / Ranking / Highest query
        if any(k in q for k in ["top", "highest", "best", "leading", "most", "largest", "maximum"]):
            limit_n = 5
            limit_match = re.search(r"top\s+(\d+)", q)
            if limit_match:
                limit_n = int(limit_match.group(1))

            steps.append(f"Identified ranking query for top {limit_n} '{dim_col}' by '{metric_col or 'count'}'.")
            if metric_col:
                sql = f"""
SELECT "{dim_col}",
       ROUND(SUM("{metric_col}"), 2) AS total_{metric_col},
       COUNT(*) AS frequency
FROM "{table_name}"
WHERE "{dim_col}" IS NOT NULL
GROUP BY "{dim_col}"
ORDER BY total_{metric_col} DESC
LIMIT {limit_n};
"""
                pandas_code = f"""import pandas as pd

df = pd.read_csv('{table_name}.csv')
result = (
    df.groupby('{dim_col}', as_index=False)
    .agg(total_{metric_col}=('{metric_col}', 'sum'), frequency=('{dim_col}', 'count'))
    .round({{'total_{metric_col}': 2}})
    .sort_values(by='total_{metric_col}', ascending=False)
    .head({limit_n})
)
print(result)"""
            else:
                sql = f"""
SELECT "{dim_col}",
       COUNT(*) AS frequency
FROM "{table_name}"
WHERE "{dim_col}" IS NOT NULL
GROUP BY "{dim_col}"
ORDER BY frequency DESC
LIMIT {limit_n};
"""
                pandas_code = f"""import pandas as pd

df = pd.read_csv('{table_name}.csv')
result = df['{dim_col}'].value_counts().reset_index().head({limit_n})
print(result)"""
            return sql.strip(), pandas_code.strip(), steps

        # Pattern 3: Underperforming / Lowest / Worst query
        if any(k in q for k in ["underperform", "lowest", "worst", "least", "bottom", "minimum", "slow"]):
            steps.append(f"Identified low-performance query for bottom '{dim_col}' by '{metric_col or 'count'}'.")
            if metric_col:
                sql = f"""
SELECT "{dim_col}",
       ROUND(SUM("{metric_col}"), 2) AS total_{metric_col},
       COUNT(*) AS frequency
FROM "{table_name}"
WHERE "{dim_col}" IS NOT NULL
GROUP BY "{dim_col}"
ORDER BY total_{metric_col} ASC
LIMIT 5;
"""
                pandas_code = f"""import pandas as pd

df = pd.read_csv('{table_name}.csv')
result = (
    df.groupby('{dim_col}', as_index=False)
    .agg(total_{metric_col}=('{metric_col}', 'sum'), frequency=('{dim_col}', 'count'))
    .round({{'total_{metric_col}': 2}})
    .sort_values(by='total_{metric_col}', ascending=True)
    .head(5)
)
print(result)"""
            else:
                sql = f"""
SELECT "{dim_col}",
       COUNT(*) AS frequency
FROM "{table_name}"
WHERE "{dim_col}" IS NOT NULL
GROUP BY "{dim_col}"
ORDER BY frequency ASC
LIMIT 5;
"""
                pandas_code = f"""import pandas as pd

df = pd.read_csv('{table_name}.csv')
result = df['{dim_col}'].value_counts().reset_index().sort_values(by='count', ascending=True).head(5)
print(result)"""
            return sql.strip(), pandas_code.strip(), steps

        # Pattern 4: Grouping / Aggregation / Distribution query
        if metric_col and dim_col:
            steps.append(f"Aggregated metric '{metric_col}' grouped by dimension '{dim_col}'.")
            sql = f"""
SELECT "{dim_col}",
       ROUND(SUM("{metric_col}"), 2) AS total_{metric_col},
       ROUND(AVG("{metric_col}"), 2) AS avg_{metric_col},
       COUNT(*) AS count
FROM "{table_name}"
WHERE "{dim_col}" IS NOT NULL
GROUP BY "{dim_col}"
ORDER BY total_{metric_col} DESC
LIMIT 10;
"""
            pandas_code = f"""import pandas as pd

df = pd.read_csv('{table_name}.csv')
result = (
    df.groupby('{dim_col}', as_index=False)
    .agg(
        total_{metric_col}=('{metric_col}', 'sum'),
        avg_{metric_col}=('{metric_col}', 'mean'),
        count=('{metric_col}', 'count')
    )
    .round({{'total_{metric_col}': 2, 'avg_{metric_col}': 2}})
    .sort_values(by='total_{metric_col}', ascending=False)
    .head(10)
)
print(result)"""
            return sql.strip(), pandas_code.strip(), steps

        # Pattern 5: Default table inspection
        steps.append(f"Defaulting to preview query for table '{table_name}'.")
        sql = f"SELECT * FROM \"{table_name}\" LIMIT 10;"
        pandas_code = f"""import pandas as pd

df = pd.read_csv('{table_name}.csv')
print(df.head(10))"""
        return sql.strip(), pandas_code.strip(), steps
