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
    ) -> tuple[Optional[str], list[dict[str, Any]], int, Optional[str], list[str]]:
        """
        Generates SQL via LLM (or robust semantic fallback), validates via guardrail, and executes against DuckDB.
        Returns: (sql_query, rows, total_rows, error_message, reasoning_steps)
        """
        reasoning_steps: list[str] = []
        sql_query: Optional[str] = None

        # 1. Check if LLM is accessible
        effective_key = api_key or settings.OPENROUTER_API_KEY
        effective_model = model or settings.OPENROUTER_MODEL

        if effective_key:
            try:
                reasoning_steps.append("Calling OpenRouter LLM to translate natural language intent into SQL...")
                sql_query, steps = SQLAgent._call_llm_for_sql(
                    user_query=user_query,
                    schema_context=schema_context,
                    api_key=effective_key,
                    model=effective_model
                )
                reasoning_steps.extend(steps)
            except Exception as e:
                reasoning_steps.append(f"LLM API call failed or rate-limited ({str(e)}). Falling back to semantic query engine.")
                sql_query, steps = SQLAgent._semantic_fallback_sql(user_query, table_names)
                reasoning_steps.extend(steps)
        else:
            reasoning_steps.append("No OpenRouter API key provided. Activating built-in semantic SQL generator.")
            sql_query, steps = SQLAgent._semantic_fallback_sql(user_query, table_names)
            reasoning_steps.extend(steps)

        if not sql_query:
            return None, [], 0, "Could not determine a valid SQL query for this question.", reasoning_steps

        # 2. Guardrail Validation
        reasoning_steps.append("Validating SQL query through safety guardrails...")
        is_safe, violations = InputGuardrail.validate_sql(sql_query)
        if not is_safe:
            err = f"Guardrail Violation: {'; '.join(violations)}"
            return sql_query, [], 0, err, reasoning_steps

        # 3. Execution in DuckDB
        try:
            reasoning_steps.append(f"Executing query safely in DuckDB engine: {sql_query}")
            rows, total_count = db_engine.execute_query(sql_query, max_rows=settings.MAX_RESULT_ROWS)
            reasoning_steps.append(f"Query returned {total_count} matching rows.")
            return sql_query, rows, total_count, None, reasoning_steps
        except Exception as e:
            err = f"DuckDB Execution Error: {str(e)}"
            reasoning_steps.append(f"Execution failed: {err}")
            return sql_query, [], 0, err, reasoning_steps

    @staticmethod
    def _call_llm_for_sql(
        user_query: str,
        schema_context: str,
        api_key: str,
        model: str
    ) -> tuple[Optional[str], list[str]]:
        client = OpenAI(
            base_url=settings.OPENROUTER_BASE_URL,
            api_key=api_key,
        )

        system_prompt = f"""
You are an expert Data Analyst and DuckDB SQL generator.
Generate a single, clean, valid DuckDB SQL SELECT query that answers the user's question based strictly on the provided schema.

Rules:
1. ONLY return valid DuckDB SQL syntax. Use double quotes for column or table names if needed.
2. Read-only queries only (SELECT or WITH). Never write DROP, DELETE, INSERT, UPDATE, ALTER.
3. For date manipulation in DuckDB, use strftime(col, '%Y-%m') or date_trunc('month', col).
4. If multi-table join is required, use proper JOIN syntax with matching foreign keys.
5. Limit results to 100 unless a specific LIMIT is requested.
6. Provide your response as a JSON object with:
   - "sql": "THE_SQL_QUERY",
   - "reasoning": ["Step 1 explanation", "Step 2 explanation"]

Schema Context:
{schema_context}
"""

        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"User Question: {user_query}"}
            ],
            response_format={"type": "json_object"},
            temperature=0.0
        )

        content = response.choices[0].message.content or "{}"
        data = json.loads(content)
        sql = data.get("sql", "").strip()
        # Clean any accidental markdown code blocks
        sql = re.sub(r"```(sql)?", "", sql).strip()
        steps = data.get("reasoning", ["Generated SQL based on matching columns and aggregations."])
        return sql, steps

    @staticmethod
    def _semantic_fallback_sql(user_query: str, table_names: list[str]) -> tuple[Optional[str], list[str]]:
        """
        Intelligent semantic rules engine for answering standard analysis queries with zero hallucination.
        """
        q = user_query.lower()
        available_tables = [t.table_name for t in db_engine.get_registered_tables_info()]
        
        # Identify primary table
        sales_table = next((t for t in available_tables if "sales" in t or "trans" in t or "order" in t), available_tables[0] if available_tables else "sales_transactions")
        cust_table = next((t for t in available_tables if "cust" in t), "customers")
        prod_table = next((t for t in available_tables if "prod" in t or "item" in t), "products")

        steps = []

        # 1. Highest revenue by region
        if "region" in q and ("highest" in q or "revenue" in q or "sales" in q):
            steps.append("Grouped sales by region and summed total_amount to identify highest revenue generator.")
            sql = f"""
                SELECT region, ROUND(SUM(total_amount), 2) AS total_revenue, COUNT(*) AS transaction_count
                FROM "{sales_table}"
                GROUP BY region
                ORDER BY total_revenue DESC
            """
            return sql.strip(), steps

        # 2. Monthly sales trends
        if ("monthly" in q or "month" in q or "trend" in q) and ("sales" in q or "revenue" in q or "trend" in q):
            steps.append("Extracted monthly period from order_date and aggregated total revenue.")
            sql = f"""
                SELECT strftime('%Y-%m', CAST(order_date AS DATE)) AS sales_month,
                       ROUND(SUM(total_amount), 2) AS monthly_revenue,
                       SUM(quantity) AS total_units_sold
                FROM "{sales_table}"
                GROUP BY sales_month
                ORDER BY sales_month ASC
            """
            return sql.strip(), steps

        # 3. Top five customers
        if ("top" in q or "highest" in q or "best" in q) and ("customer" in q or "client" in q or "buyer" in q):
            steps.append(f"Joined {sales_table} with {cust_table} on customer_id, aggregated total spend, and retrieved top 5.")
            if cust_table in available_tables:
                sql = f"""
                    SELECT c.customer_name, c.segment, c.country,
                           ROUND(SUM(s.total_amount), 2) AS total_spent,
                           COUNT(s.transaction_id) AS total_orders
                    FROM "{sales_table}" s
                    JOIN "{cust_table}" c ON s.customer_id = c.customer_id
                    GROUP BY c.customer_name, c.segment, c.country
                    ORDER BY total_spent DESC
                    LIMIT 5
                """
            else:
                sql = f"""
                    SELECT customer_id, ROUND(SUM(total_amount), 2) AS total_spent, COUNT(*) AS orders
                    FROM "{sales_table}"
                    GROUP BY customer_id
                    ORDER BY total_spent DESC
                    LIMIT 5
                """
            return sql.strip(), steps

        # 4. Underperforming products
        if "underperform" in q or ("low" in q and "product" in q) or "worst" in q or "least sold" in q:
            steps.append(f"Evaluated units sold and revenue per product to spot underperforming inventory items.")
            if prod_table in available_tables:
                sql = f"""
                    SELECT p.product_name, p.category, p.stock_quantity,
                           COALESCE(SUM(s.quantity), 0) AS total_units_sold,
                           ROUND(COALESCE(SUM(s.total_amount), 0), 2) AS total_revenue
                    FROM "{prod_table}" p
                    LEFT JOIN "{sales_table}" s ON p.product_id = s.product_id
                    GROUP BY p.product_name, p.category, p.stock_quantity
                    ORDER BY total_units_sold ASC, total_revenue ASC
                    LIMIT 5
                """
            else:
                sql = f"""
                    SELECT product_id, SUM(quantity) as total_units_sold, ROUND(SUM(total_amount), 2) as total_revenue
                    FROM "{sales_table}"
                    GROUP BY product_id
                    ORDER BY total_units_sold ASC
                    LIMIT 5
                """
            return sql.strip(), steps

        # 5. Generic aggregation / general query
        steps.append(f"Executed general overview query on primary table {sales_table}.")
        sql = f"SELECT * FROM \"{sales_table}\" LIMIT 20"
        return sql, steps
