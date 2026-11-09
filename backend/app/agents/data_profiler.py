from app.engine.duckdb_engine import db_engine
from app.models.schemas import TableSchema

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
            context_lines.append(f"\nTable: `{schema.table_name}` ({schema.row_count} rows, {schema.column_count} columns)")
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
                # Filter for likely ID or key columns
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
