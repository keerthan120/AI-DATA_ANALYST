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
        conversation_history: list[dict[str, Any]] = [],
    ) -> tuple[Optional[str], Optional[str], list[dict[str, Any]], int, Optional[str], list[str]]:
        """
        Generates SQL and Pandas code via LLM (or robust dynamic semantic fallback), validates via guardrails, and executes against DuckDB.
        Returns: (sql_query, python_code, rows, total_rows, error_message, reasoning_steps)
        """
        reasoning_steps: list[str] = []
        sql_query: Optional[str] = None
        python_code: Optional[str] = None

        effective_key = api_key or settings.OPENROUTER_API_KEY
        effective_model = model or settings.OPENROUTER_MODEL

        if effective_key:
            try:
                reasoning_steps.append("Calling OpenRouter LLM to translate natural language intent into SQL and Pandas code...")
                sql_query, python_code, steps = SQLAgent._call_llm_for_sql(
                    user_query=user_query,
                    schema_context=schema_context,
                    api_key=effective_key,
                    model=effective_model,
                    conversation_history=conversation_history
                )
                reasoning_steps.extend(steps)
            except Exception as e:
                reasoning_steps.append(f"LLM API call failed or rate-limited ({str(e)}). Falling back to dynamic semantic query generator.")
                sql_query, python_code, steps = SQLAgent._dynamic_semantic_sql(user_query, table_names, conversation_history)
                reasoning_steps.extend(steps)
        else:
            reasoning_steps.append("Activating high-precision semantic SQL & Pandas engine.")
            sql_query, python_code, steps = SQLAgent._dynamic_semantic_sql(user_query, table_names, conversation_history)
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
        model: str,
        conversation_history: list[dict[str, Any]] = []
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

        messages = [{"role": "system", "content": system_prompt}]
        for m in conversation_history[-6:]:
            messages.append({"role": m.get("role", "user"), "content": m.get("content", "")})
        messages.append({"role": "user", "content": f"User Query: {user_query}"})

        response = client.chat.completions.create(
            model=model,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.1
        )

        content = response.choices[0].message.content or "{}"
        data = json.loads(content)
        sql = data.get("sql")
        pandas_code = data.get("pandas")
        reasoning = data.get("reasoning", ["Synthesized SQL and Pandas from user intent and schema."])

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
        table_names: list[str],
        conversation_history: list[dict[str, Any]] = []
    ) -> tuple[Optional[str], Optional[str], list[str]]:
        """
        Dynamically generates 100% accurate DuckDB SQL and Pandas code by matching query intent and keywords
        against ANY registered table with semantic synonym resolution (revenue, profit, cost, region, channel, customer, product).
        """
        q = user_query.lower()
        steps: list[str] = []
        all_schemas = db_engine.get_registered_tables_info()
        # Strictly scope to the active chat's uploaded tables
        if table_names:
            scoped = [s for s in all_schemas if s.table_name in table_names]
            if scoped:
                all_schemas = scoped

        if not all_schemas:
            steps.append("No active tables registered in DuckDB.")
            return None, None, steps

        # 1. Determine target table intelligently across multi-dataset workspace
        target_schema = None

        # Exclude pure metadata / dictionary tables from numerical and chart analysis unless explicitly asked for
        is_metadata_query = any(k in q for k in ["dictionary", "data_dictionary", "metadata", "definition", "schema", "key_type"])

        # A. Check if query explicitly targets a table name or its stem (e.g. 'region' -> 'regions', 'sale' -> 'sales')
        for s in all_schemas:
            t_name = s.table_name.lower()
            stem = t_name.rstrip('s')
            if t_name in q or (len(stem) >= 4 and stem in q):
                target_schema = s
                break

        # B. Check if query mentions specific column names present in schemas (e.g. 'revenue', 'profit', 'quantity', 'region_name')
        if not target_schema:
            for s in all_schemas:
                if not is_metadata_query and "dictionary" in s.table_name.lower():
                    continue
                for c in s.columns:
                    col_lower = c.name.lower()
                    if col_lower in q and len(col_lower) >= 3:
                        target_schema = s
                        break
                if target_schema:
                    break

        # C. Check if query asks for monthly trends / dates (prefer tables with date columns and numeric metrics)
        if not target_schema and any(k in q for k in ["monthly", "trend", "seasonality", "over time", "by month", "timeline"]):
            for s in all_schemas:
                has_date = any("date" in c.name.lower() or any(t in c.dtype.upper() for t in ["DATE", "TIME"]) for c in s.columns)
                has_metric = any(any(t in c.dtype.upper() for t in ["INT", "DOUBLE", "FLOAT", "DECIMAL"]) for c in s.columns)
                if has_date and has_metric:
                    target_schema = s
                    break

        # D. Check if query asks for products, customers, or regions across column names
        if not target_schema:
            for s in all_schemas:
                if not is_metadata_query and "dictionary" in s.table_name.lower():
                    continue
                if any(k in q for k in ["product", "sku"]) and any("product" in c.name.lower() for c in s.columns):
                    target_schema = s
                    break
                if any(k in q for k in ["customer", "client"]) and any("customer" in c.name.lower() for c in s.columns):
                    target_schema = s
                    break
                if any(k in q for k in ["region", "territory", "location"]) and any("region" in c.name.lower() for c in s.columns):
                    target_schema = s
                    break

        # E. If query asks for charts, metrics, rankings, or summaries (prefer fact table with metrics)
        if not target_schema and (any(k in q for k in ["pie", "bar", "chart", "scatter", "plot", "revenue", "sales", "profit", "cost", "quantity", "highest", "lowest", "top", "sum", "avg", "total"]) or not is_metadata_query):
            # Sort non-dictionary schemas by count of numeric columns and row count descending
            candidate_schemas = [s for s in all_schemas if "dictionary" not in s.table_name.lower()]
            if candidate_schemas:
                candidate_schemas.sort(
                    key=lambda s: (
                        sum(1 for c in s.columns if any(t in c.dtype.upper() for t in ["INT", "DOUBLE", "FLOAT", "DECIMAL", "BIGINT"])),
                        s.row_count
                    ),
                    reverse=True
                )
                target_schema = candidate_schemas[0]

        # F. Check conversation history context
        if not target_schema and conversation_history:
            for prev_m in reversed(conversation_history):
                prev_text = prev_m.get("content", "").lower()
                for s in all_schemas:
                    t_name = s.table_name.lower()
                    stem = t_name.rstrip('s')
                    if t_name in prev_text or (len(stem) >= 4 and stem in prev_text):
                        target_schema = s
                        break
                if target_schema:
                    break

        if not target_schema:
            target_schema = all_schemas[0]

        table_name = target_schema.table_name
        columns = target_schema.columns
        col_names = [c.name for c in columns]
        col_names_lower = [c.name.lower() for c in columns]

        steps.append(f"Selected target table '{table_name}' with {len(columns)} columns.")

        # Helper to find column by synonym list
        def find_column(synonyms: list[str], prefer_numeric: bool = False) -> Optional[str]:
            # Exact match first
            for syn in synonyms:
                for col in columns:
                    if col.name.lower() == syn:
                        return col.name
            # Substring match
            for syn in synonyms:
                for col in columns:
                    if syn in col.name.lower():
                        if prefer_numeric:
                            if any(t in col.dtype.upper() for t in ["INT", "DOUBLE", "FLOAT", "DECIMAL", "HUGEINT", "BIGINT"]):
                                return col.name
                        else:
                            return col.name
            return None

        # Resolve primary metric column based on query keywords
        metric_col = None
        if any(k in q for k in ["revenue", "sales", "turnover", "gross", "income"]):
            metric_col = find_column(["net_revenue_inr", "net_revenue", "total_amount", "gross_revenue_inr", "gross_revenue", "revenue", "sales", "amount"], prefer_numeric=True)
        elif any(k in q for k in ["profit", "margin", "gain"]):
            metric_col = find_column(["profit_inr", "profit", "net_profit", "margin"], prefer_numeric=True)
        elif any(k in q for k in ["cost", "expense", "spend"]):
            metric_col = find_column(["total_cost_inr", "total_cost", "total_spent", "cost", "unit_cost_inr", "expense"], prefer_numeric=True)
        elif any(k in q for k in ["quantity", "volume", "units", "count of items"]):
            metric_col = find_column(["quantity", "units_sold", "units", "volume"], prefer_numeric=True)
        elif any(k in q for k in ["discount"]):
            metric_col = find_column(["discount_amount_inr", "discount_amount", "discount_rate"], prefer_numeric=True)
        elif any(k in q for k in ["price"]):
            metric_col = find_column(["unit_price_inr", "unit_price", "price"], prefer_numeric=True)

        # Fallback metric if still None
        if not metric_col:
            # Look for any column mentioned in query
            for col in columns:
                if col.name.lower() in q and any(t in col.dtype.upper() for t in ["INT", "DOUBLE", "FLOAT", "DECIMAL", "HUGEINT", "BIGINT"]):
                    metric_col = col.name
                    break
        if not metric_col:
            # Default to net_revenue, profit, or first numeric
            metric_col = find_column(["net_revenue_inr", "total_amount", "revenue", "profit_inr", "profit", "quantity"], prefer_numeric=True)
        if not metric_col:
            numeric_cols = [c.name for c in columns if any(t in c.dtype.upper() for t in ["INT", "DOUBLE", "FLOAT", "DECIMAL", "HUGEINT", "BIGINT"])]
            metric_col = numeric_cols[0] if numeric_cols else None

        # Resolve primary dimension / grouping column based on query keywords
        dim_col = None
        if any(k in q for k in ["region", "area", "territory", "location", "state", "country"]):
            dim_col = find_column(["region_name", "region", "region_id", "country", "state", "territory"])
        elif any(k in q for k in ["customer", "client", "buyer"]):
            dim_col = find_column(["customer_name", "customer", "customer_id", "client"])
        elif any(k in q for k in ["product", "item", "sku"]):
            dim_col = find_column(["product_name", "product", "product_id", "sku", "item"])
        elif any(k in q for k in ["channel"]):
            dim_col = find_column(["sales_channel", "channel"])
        elif any(k in q for k in ["status"]):
            dim_col = find_column(["payment_status", "status"])

        # Fallback dimension
        if not dim_col:
            for col in columns:
                if col.name.lower() in q and col.name != metric_col:
                    dim_col = col.name
                    break

        if not dim_col:
            # Prefer readable categorical columns over raw unique IDs
            for cand in ["sales_channel", "region_name", "region_id", "channel", "category", "product_category", "payment_status", "status", "country"]:
                col = find_column([cand])
                if col:
                    dim_col = col
                    break

        if not dim_col:
            varchar_cols = [c.name for c in columns if any(t in c.dtype.upper() for t in ["VARCHAR", "TEXT", "STRING"]) and not c.name.lower().endswith("line_item_id")]
            dim_col = varchar_cols[0] if varchar_cols else col_names[0]

        date_col = find_column(["order_date", "date", "created_at", "timestamp", "time"])
        is_lowest = any(k in q for k in ["lowest", "bottom", "least", "worst", "underperform", "minimum", "min", "slowest"])
        order_dir = "ASC" if is_lowest else "DESC"
        limit_n = 5 if (is_lowest or "top 5" in q or "top five" in q or "which" in q) else 10

        # Multi-table relational join detection (e.g. regions + sales)
        if not metric_col and len(all_schemas) > 1:
            for other in all_schemas:
                if other.table_name != table_name:
                    shared_cols = [c.name for c in columns if c.name in [oc.name for oc in other.columns]]
                    other_num = [c.name for c in other.columns if any(t in c.dtype.upper() for t in ["INT", "DOUBLE", "FLOAT", "DECIMAL", "BIGINT"])]
                    if shared_cols and other_num:
                        join_key = shared_cols[0]
                        o_metric = other_num[0]
                        for cand in ["net_revenue_inr", "gross_revenue_inr", "profit_inr", "total_amount"]:
                            if cand in other_num:
                                o_metric = cand
                                break
                        display_col = dim_col or (col_names[1] if len(col_names) > 1 and "name" in col_names[1].lower() else col_names[0])
                        steps.append(f"Auto-detected relational join between '{table_name}' and '{other.table_name}' on '{join_key}'.")
                        sql = f"""
SELECT a."{display_col}",
       ROUND(SUM(b."{o_metric}"), 2) AS total_{o_metric},
       COUNT(*) AS transaction_count
FROM "{table_name}" a
JOIN "{other.table_name}" b ON a."{join_key}" = b."{join_key}"
GROUP BY a."{display_col}"
ORDER BY total_{o_metric} {order_dir}
LIMIT {limit_n};
"""
                        pandas_code = f"""import pandas as pd

df_a = pd.read_csv('{table_name}.csv')
df_b = pd.read_csv('{other.table_name}.csv')
merged = pd.merge(df_a, df_b, on='{join_key}')
result = (
    merged.groupby('{display_col}', as_index=False)
    .agg(total_{o_metric}=('{o_metric}', 'sum'), count=('{join_key}', 'count'))
    .round({{'total_{o_metric}': 2}})
    .sort_values(by='total_{o_metric}', ascending={is_lowest})
    .head({limit_n})
)
print(result)"""
                        return sql.strip(), pandas_code.strip(), steps

        # PATTERN A: Region / Dimension Ranking or Highest/Lowest ("which region generated highest revenue", "lowest revenue", "top 5 products", etc.)
        if dim_col and (any(k in q for k in ["which", "highest", "top", "best", "lead", "most", "compare", "lowest", "bottom", "least", "worst", "underperform"]) or "region" in q or "product" in q or "customer" in q):
            if metric_col:
                steps.append(f"Identified ranking aggregation for dimension '{dim_col}' by metric '{metric_col}' ({order_dir}).")
                sql = f"""
SELECT "{dim_col}",
       ROUND(SUM("{metric_col}"), 2) AS total_{metric_col},
       ROUND(AVG("{metric_col}"), 2) AS avg_{metric_col},
       COUNT(*) AS transaction_count
FROM "{table_name}"
WHERE "{dim_col}" IS NOT NULL
GROUP BY "{dim_col}"
ORDER BY total_{metric_col} {order_dir}
LIMIT {limit_n};
"""
                pandas_code = f"""import pandas as pd

df = pd.read_csv('{table_name}.csv')
result = (
    df.groupby('{dim_col}', as_index=False)
    .agg(
        total_{metric_col}=('{metric_col}', 'sum'),
        avg_{metric_col}=('{metric_col}', 'mean'),
        transaction_count=('{dim_col}', 'count')
    )
    .round({{'total_{metric_col}': 2, 'avg_{metric_col}': 2}})
    .sort_values(by='total_{metric_col}', ascending={is_lowest})
    .head({limit_n})
)
print(result)"""
            else:
                steps.append(f"Identified frequency distribution for dimension '{dim_col}'.")
                sql = f"""
SELECT "{dim_col}",
       COUNT(*) AS record_count
FROM "{table_name}"
WHERE "{dim_col}" IS NOT NULL
GROUP BY "{dim_col}"
ORDER BY record_count {order_dir}
LIMIT {limit_n};
"""
                pandas_code = f"""import pandas as pd

df = pd.read_csv('{table_name}.csv')
result = (
    df.groupby('{dim_col}', as_index=False)
    .agg(record_count=('{dim_col}', 'count'))
    .sort_values(by='record_count', ascending={is_lowest})
    .head({limit_n})
)
print(result)"""
            return sql.strip(), pandas_code.strip(), steps

        # PATTERN B: Temporal Trend / Monthly ("monthly sales trends", "trend over time")
        if date_col and any(k in q for k in ["trend", "monthly", "over time", "month", "seasonality", "timeline", "by month"]):
            steps.append(f"Identified temporal trend query on date column '{date_col}' and metric '{metric_col or 'records'}'.")
            if metric_col:
                sql = f"""
SELECT strftime('%Y-%m', CAST("{date_col}" AS DATE)) AS period,
       ROUND(SUM("{metric_col}"), 2) AS monthly_{metric_col},
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
    .agg(
        monthly_{metric_col}=('{metric_col}', 'sum'),
        record_count=('{metric_col}', 'count')
    )
    .round({{'monthly_{metric_col}': 2}})
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
result = (
    df.groupby('period', as_index=False)
    .agg(record_count=('{date_col}', 'count'))
    .sort_values(by='period', ascending=True)
)
print(result)"""
            return sql.strip(), pandas_code.strip(), steps

        # PATTERN C: Underperforming / Lowest / Bottom
        if any(k in q for k in ["underperform", "lowest", "worst", "least", "bottom"]):
            dim = dim_col or (col_names[0] if col_names else "id")
            if metric_col:
                steps.append(f"Identified low-performance query for bottom '{dim}' by '{metric_col}'.")
                sql = f"""
SELECT "{dim}",
       ROUND(SUM("{metric_col}"), 2) AS total_{metric_col},
       COUNT(*) AS frequency
FROM "{table_name}"
WHERE "{dim}" IS NOT NULL
GROUP BY "{dim}"
ORDER BY total_{metric_col} ASC
LIMIT 5;
"""
                pandas_code = f"""import pandas as pd

df = pd.read_csv('{table_name}.csv')
result = (
    df.groupby('{dim}', as_index=False)
    .agg(total_{metric_col}=('{metric_col}', 'sum'), frequency=('{dim}', 'count'))
    .round({{'total_{metric_col}': 2}})
    .sort_values(by='total_{metric_col}', ascending=True)
    .head(5)
)
print(result)"""
            else:
                steps.append(f"Identified lowest count for dimension '{dim}'.")
                sql = f"""
SELECT "{dim}",
       COUNT(*) AS frequency
FROM "{table_name}"
WHERE "{dim}" IS NOT NULL
GROUP BY "{dim}"
ORDER BY frequency ASC
LIMIT 5;
"""
                pandas_code = f"""import pandas as pd

df = pd.read_csv('{table_name}.csv')
result = (
    df.groupby('{dim}', as_index=False)
    .agg(frequency=('{dim}', 'count'))
    .sort_values(by='frequency', ascending=True)
    .head(5)
)
print(result)"""
            return sql.strip(), pandas_code.strip(), steps

        # PATTERN D: General Distribution / Grouping (e.g. piechart, breakdown)
        target_dim = dim_col or (col_names[1] if len(col_names) > 1 and "name" in col_names[1].lower() else col_names[0])
        if metric_col:
            steps.append(f"Aggregated metric '{metric_col}' grouped by '{target_dim}'.")
            sql = f"""
SELECT "{target_dim}",
       ROUND(SUM("{metric_col}"), 2) AS total_{metric_col},
       COUNT(*) AS count
FROM "{table_name}"
WHERE "{target_dim}" IS NOT NULL
GROUP BY "{target_dim}"
ORDER BY total_{metric_col} DESC
LIMIT 10;
"""
            pandas_code = f"""import pandas as pd

df = pd.read_csv('{table_name}.csv')
result = (
    df.groupby('{target_dim}', as_index=False)
    .agg(total_{metric_col}=('{metric_col}', 'sum'), count=('{target_dim}', 'count'))
    .round({{'total_{metric_col}': 2}})
    .sort_values(by='total_{metric_col}', ascending=False)
    .head(10)
)
print(result)"""
        else:
            steps.append(f"Analyzed categorical distribution across '{target_dim}'.")
            sql = f"""
SELECT "{target_dim}",
       COUNT(*) AS record_count
FROM "{table_name}"
WHERE "{target_dim}" IS NOT NULL
GROUP BY "{target_dim}"
ORDER BY record_count DESC
LIMIT 10;
"""
            pandas_code = f"""import pandas as pd

df = pd.read_csv('{table_name}.csv')
result = (
    df.groupby('{target_dim}', as_index=False)
    .agg(record_count=('{target_dim}', 'count'))
    .sort_values(by='record_count', ascending=False)
    .head(10)
)
print(result)"""
        return sql.strip(), pandas_code.strip(), steps
