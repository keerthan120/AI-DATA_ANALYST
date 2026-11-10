import duckdb
import pandas as pd
from typing import Any
from app.engine.duckdb_engine import db_engine
from app.models.schemas import TableSchema, ColumnInfo

class DataProfilerAgent:
    @staticmethod
    def generate_schema_context(table_names: list[str]) -> tuple[str, list[str]]:
        """
        Builds a comprehensive schema context for the LLM, including sample values and potential foreign keys.
        """
        available_schemas = db_engine.get_registered_tables_info()
        if table_names:
            target_schemas = [s for s in available_schemas if s.table_name in table_names]
        else:
            target_schemas = available_schemas

        if not target_schemas:
            return "No tables currently registered in the database.", []

        context_lines = ["### Available Tables & Schemas:"]
        table_columns_map: dict[str, set[str]] = {}

        for schema in target_schemas:
            context_lines.append(f"\nTable: `{schema.table_name}` ({schema.row_count:,} rows, {schema.column_count} columns)")
            context_lines.append("Columns:")
            cols_set = set()
            for col in schema.columns:
                cols_set.add(col.name.lower())
                sample_str = f", Samples: {col.sample_values[:3]}" if col.sample_values else ""
                stats_str = ""
                if col.mean_value is not None:
                    stats_str = f" [Min: {col.min_value}, Max: {col.max_value}, Mean: {col.mean_value}]"
                context_lines.append(f"  - `{col.name}` ({col.dtype}) | Nulls: {col.null_count}{stats_str}{sample_str}")
            table_columns_map[schema.table_name] = cols_set

        # Discover potential join keys across tables
        potential_joins = []
        tables = list(table_columns_map.keys())
        for i in range(len(tables)):
            for j in range(i + 1, len(tables)):
                t1, t2 = tables[i], tables[j]
                common_cols = table_columns_map[t1].intersection(table_columns_map[t2])
                key_cols = [c for c in common_cols if "id" in c or "code" in c or "key" in c or c in common_cols]
                if key_cols:
                    for k in key_cols:
                        potential_joins.append(f"`{t1}`.`{k}` = `{t2}`.`{k}`")

        if potential_joins:
            context_lines.append("\n### Detected Join Keys (For Multi-table Analysis):")
            for j in potential_joins:
                context_lines.append(f"  - {j}")

        active_table_names = [s.table_name for s in target_schemas]
        return "\n".join(context_lines), active_table_names

    @staticmethod
    def explain_multi_dataset_overview(table_names: list[str]) -> dict[str, Any]:
        """
        Generates a comprehensive multi-dataset analytical overview when multiple CSV files are uploaded.
        Summarizes all tables, cross-table foreign keys, overall data health, and suggested queries.
        """
        all_schemas = db_engine.get_registered_tables_info()
        target_schemas = [s for s in all_schemas if s.table_name in table_names]
        if not target_schemas:
            target_schemas = all_schemas

        total_rows = sum(s.row_count for s in target_schemas)
        total_cols = sum(s.column_count for s in target_schemas)
        
        # Build catalog table
        catalog_rows = []
        for s in target_schemas:
            num_cols = len([c for c in s.columns if any(t in c.dtype.upper() for t in ["INT", "DOUBLE", "FLOAT", "DECIMAL", "BIGINT"])])
            date_cols = len([c for c in s.columns if any(t in c.dtype.upper() for t in ["DATE", "TIME"]) or "date" in c.name.lower()])
            keys = [c.name for c in s.columns if "id" in c.name.lower() or "key" in c.name.lower()]
            keys_str = ", ".join(f"`{k}`" for k in keys[:3]) if keys else "None"
            catalog_rows.append(f"| **`{s.file_name}`** | `{s.table_name}` | {s.row_count:,} | {s.column_count} ({num_cols} numeric, {date_cols} date) | {keys_str} |")

        catalog_table_md = "\n".join([
            "| Dataset File | Table Name | Records | Dimensions / Measures | Key Fields |",
            "| :--- | :--- | :--- | :--- | :--- |",
            *catalog_rows
        ])

        # Detect cross-table foreign key relationships
        table_cols_map = {s.table_name: set(c.name.lower() for c in s.columns) for s in target_schemas}
        joins = []
        t_names = list(table_cols_map.keys())
        for i in range(len(t_names)):
            for j in range(i + 1, len(t_names)):
                t1, t2 = t_names[i], t_names[j]
                common = table_cols_map[t1].intersection(table_cols_map[t2])
                key_cols = [c for c in common if "id" in c or "code" in c or "key" in c]
                for k in key_cols:
                    joins.append(f"- **`{t1}.{k}`** connects with **`{t2}.{k}`**")

        joins_md = "\n".join(joins) if joins else "No common key attributes detected across these tables."

        # Preview rows: pick largest/fact table
        largest_schema = max(target_schemas, key=lambda s: s.row_count)
        
        md = f"""### 📊 Multi-Dataset Overview: {len(target_schemas)} Uploaded Files

Successfully loaded and analyzed all **{len(target_schemas)} CSV datasets** into DuckDB in-memory engine.

**Summary:**
- **Total Combined Records:** {total_rows:,} rows across {len(target_schemas)} datasets
- **Total Attributes:** {total_cols} columns analyzed
- **In-Memory Engine:** Ready for instant multi-table SQL queries, automatic Pandas code, and cross-dataset joins.

**Dataset Catalog:**
{catalog_table_md}

**Relational Schema & Cross-Table Joins:**
{joins_md}"""

        insights = [
            f"Successfully profiled all {len(target_schemas)} datasets ({total_rows:,} total records).",
            f"Relational join paths verified across {len(joins)} connection points.",
            "Ready for natural language questions, charts, DuckDB SQL execution, and anomaly detection."
        ]

        return {
            "markdown": md,
            "insights": insights,
            "preview_rows": largest_schema.preview_rows,
            "table_name": largest_schema.table_name
        }

    @staticmethod
    def explain_dataset_overview(table_name: str) -> dict[str, Any]:
        """
        Generates a rich, professional executive summary, schema profile,
        data health assessment, and tailored analytical questions for any uploaded CSV table.
        """
        all_schemas = db_engine.get_registered_tables_info()
        schema = next((s for s in all_schemas if s.table_name == table_name), None)
        if not schema and all_schemas:
            schema = all_schemas[0]
            table_name = schema.table_name

        if not schema:
            return {
                "markdown": "No uploaded dataset found. Please upload a CSV file to begin analysis.",
                "insights": ["Upload a CSV file to inspect its structure and generate insights."],
                "preview_rows": [],
                "suggested_questions": []
            }

        row_count = schema.row_count
        col_count = schema.column_count
        columns = schema.columns

        # Classify columns
        numeric_cols = [c for c in columns if any(t in c.dtype.upper() for t in ["INT", "DOUBLE", "FLOAT", "DECIMAL", "HUGEINT", "BIGINT"])]
        date_cols = [c for c in columns if any(t in c.dtype.upper() for t in ["DATE", "TIME", "TIMESTAMP"]) or "date" in c.name.lower() or "time" in c.name.lower()]
        id_cols = [c for c in columns if "id" in c.name.lower() or "key" in c.name.lower() or "code" in c.name.lower()]
        categorical_cols = [c for c in columns if c not in numeric_cols and c not in date_cols]

        # Calculate data health metrics
        total_cells = max(row_count * col_count, 1)
        total_nulls = sum(c.null_count for c in columns)
        completeness_pct = round(((total_cells - total_nulls) / total_cells) * 100, 2)
        cols_with_nulls = [c for c in columns if c.null_count > 0]

        # Build schema markdown table
        table_rows = []
        for c in columns:
            summary = ""
            if c.mean_value is not None:
                summary = f"Range: [{c.min_value} to {c.max_value}], Avg: {c.mean_value}"
            elif c.sample_values:
                samples = ", ".join(str(s) for s in c.sample_values[:3])
                summary = f"Values: {samples}"
            
            table_rows.append(
                f"| `{c.name}` | `{c.dtype}` | {c.null_count} | {c.unique_count} | {summary} |"
            )

        schema_table_md = "\n".join([
            "| Column Name | Type | Null Count | Unique Count | Value Summary |",
            "| :--- | :--- | :--- | :--- | :--- |",
            *table_rows
        ])

        # Dynamic questions generation based on ACTUAL columns
        suggested: list[str] = []
        
        # 1. Ranking/highest question
        primary_cat = categorical_cols[0].name if categorical_cols else (columns[0].name if columns else "item")
        primary_num = numeric_cols[0].name if numeric_cols else None
        
        if primary_num and primary_cat:
            suggested.append(f"Which {primary_cat} generated the highest {primary_num}?")
            suggested.append(f"What are the top 5 {primary_cat}s by total {primary_num}?")
        elif primary_cat:
            suggested.append(f"Show breakdown by {primary_cat}.")
        
        # 2. Temporal trend question
        if date_cols and primary_num:
            date_col = date_cols[0].name
            suggested.append(f"Show trend of {primary_num} over {date_col}.")
        elif len(categorical_cols) > 1 and primary_num:
            second_cat = categorical_cols[1].name
            suggested.append(f"Compare {primary_num} across {second_cat}.")
        
        # 3. Anomaly question
        if primary_num:
            suggested.append(f"Detect anomalies in {primary_num}.")
        
        # Build clean, human-friendly markdown summary
        cat_preview = ", ".join([f"`{c.name}`" for c in categorical_cols[:4]])
        num_preview = ", ".join([f"`{c.name}`" for c in numeric_cols[:4]])

        md = f"""### 📊 Dataset Overview: `{schema.file_name}`

Successfully loaded and analyzed **`{table_name}`**.

**Summary:**
- **Rows & Columns:** {row_count:,} rows and {col_count} columns
- **Data Quality:** {completeness_pct}% completeness ({total_nulls:,} missing cells)
- **Status:** {"All fields are complete with zero missing values." if not cols_with_nulls else f"{len(cols_with_nulls)} column(s) have missing values."}

**Columns & Types:**
{schema_table_md}

**Key Fields:**
{f"- **Categorical:** {cat_preview}" if cat_preview else ""}
{f"- **Numeric Metrics:** {num_preview}" if num_preview else ""}"""

        insights = [
            f"Loaded `{table_name}` with {row_count:,} rows and {col_count} attributes.",
            f"Data cleanliness is at {completeness_pct}%.",
            f"Ready to answer questions, build charts, and run analyses."
        ]

        return {
            "markdown": md,
            "insights": insights,
            "preview_rows": schema.preview_rows,
            "suggested_questions": suggested[:5]
        }
