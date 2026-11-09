import duckdb
import pandas as pd
from pathlib import Path
from typing import Any, Optional
from app.models.schemas import TableSchema, ColumnInfo

class DuckDBEngine:
    def __init__(self):
        # In-memory database instance
        self.conn = duckdb.connect(database=":memory:")
        self.registered_tables: dict[str, str] = {} # table_name -> file_path
        self.auto_register_uploads()

    def auto_register_uploads(self):
        """Scans the upload directory and automatically registers all existing CSV files."""
        try:
            from app.config import settings
            upload_dir = Path(settings.UPLOAD_DIR)
            if upload_dir.exists():
                for f in upload_dir.glob("*.csv"):
                    safe_name = f.stem.replace("-", "_").replace(" ", "_")
                    if safe_name not in self.registered_tables:
                        try:
                            self.register_csv(safe_name, f)
                        except Exception:
                            pass
        except Exception:
            pass

    def ensure_table(self, table_name: str) -> bool:
        """Ensures a table is registered, checking disk if necessary."""
        if table_name in self.registered_tables:
            return True
        self.auto_register_uploads()
        return table_name in self.registered_tables

    def register_csv(self, table_name: str, file_path: str | Path) -> TableSchema:
        """
        Registers a CSV file as a queryable view in DuckDB.
        """
        clean_path = str(Path(file_path).resolve()).replace("\\", "/")
        # Sanitize table name
        safe_table_name = "".join(c if c.isalnum() or c == "_" else "_" for c in table_name)
        
        create_view_sql = f"CREATE OR REPLACE VIEW \"{safe_table_name}\" AS SELECT * FROM read_csv_auto('{clean_path}', header=True);"
        self.conn.execute(create_view_sql)
        self.registered_tables[safe_table_name] = clean_path
        
        return self.inspect_table(safe_table_name, file_path=clean_path)

    def inspect_table(self, table_name: str, file_path: Optional[str] = None) -> TableSchema:
        """
        Profiles the schema and summary statistics for a registered table.
        """
        self.ensure_table(table_name)
        # Get column info
        describe_df = self.conn.execute(f"DESCRIBE \"{table_name}\"").fetchdf()
        row_count = self.conn.execute(f"SELECT COUNT(*) FROM \"{table_name}\"").fetchone()[0]
        
        columns: list[ColumnInfo] = []
        for _, row in describe_df.iterrows():
            col_name = row["column_name"]
            col_type = row["column_type"]
            
            # Null count & Unique count
            stats_query = f"""
                SELECT 
                    COUNT(*) - COUNT("{col_name}") as null_count,
                    COUNT(DISTINCT "{col_name}") as unique_count
                FROM "{table_name}"
            """
            stats = self.conn.execute(stats_query).fetchone()
            null_count = stats[0] if stats else 0
            unique_count = stats[1] if stats else 0
            
            # Numeric stats if applicable
            min_val, max_val, mean_val = None, None, None
            is_numeric = any(t in col_type.upper() for t in ["INT", "DOUBLE", "FLOAT", "DECIMAL", "HUGEINT"])
            if is_numeric and row_count > 0:
                try:
                    num_stats = self.conn.execute(f"""
                        SELECT 
                            MIN("{col_name}") as min_val,
                            MAX("{col_name}") as max_val,
                            AVG("{col_name}") as mean_val
                        FROM "{table_name}"
                    """).fetchone()
                    if num_stats:
                        min_val = num_stats[0]
                        max_val = num_stats[1]
                        mean_val = round(float(num_stats[2]), 2) if num_stats[2] is not None else None
                except Exception:
                    pass

            # Sample values
            try:
                sample_rows = self.conn.execute(
                    f"SELECT DISTINCT \"{col_name}\" FROM \"{table_name}\" WHERE \"{col_name}\" IS NOT NULL LIMIT 5"
                ).fetchall()
                sample_values = [r[0] for r in sample_rows]
            except Exception:
                sample_values = []

            columns.append(ColumnInfo(
                name=col_name,
                dtype=col_type,
                null_count=null_count,
                unique_count=unique_count,
                sample_values=sample_values,
                min_value=min_val,
                max_value=max_val,
                mean_value=mean_val
            ))

        # Preview rows
        preview_df = self.conn.execute(f"SELECT * FROM \"{table_name}\" LIMIT 10").fetchdf()
        # Convert any timestamps/dates to string for JSON serialization
        preview_rows = preview_df.map(lambda x: str(x) if pd.notna(x) and not isinstance(x, (int, float, bool, str)) else x).to_dict(orient="records")

        return TableSchema(
            table_name=table_name,
            file_name=Path(file_path or self.registered_tables.get(table_name, table_name)).name,
            file_path=file_path or self.registered_tables.get(table_name, ""),
            row_count=row_count,
            column_count=len(columns),
            columns=columns,
            preview_rows=preview_rows
        )

    def execute_query(self, sql: str, max_rows: int = 500) -> tuple[list[dict[str, Any]], int]:
        """
        Executes a SELECT query and returns rows as dicts and total row count.
        """
        # Execute query
        rel = self.conn.execute(sql)
        df = rel.fetchdf()
        total_rows = len(df)
        
        if total_rows > max_rows:
            df = df.head(max_rows)
            
        # Clean timestamps and non-serializable types
        df_clean = df.map(lambda x: str(x) if pd.notna(x) and not isinstance(x, (int, float, bool, str)) else x)
        records = df_clean.to_dict(orient="records")
        return records, total_rows

    def get_registered_tables_info(self) -> list[TableSchema]:
        """Returns schemas for all currently registered tables."""
        self.auto_register_uploads()
        return [self.inspect_table(t) for t in self.registered_tables]

    def get_dataframe(self, table_name: str) -> pd.DataFrame:
        """Returns table as a Pandas DataFrame for statistical anomaly detection."""
        self.ensure_table(table_name)
        return self.conn.execute(f"SELECT * FROM \"{table_name}\"").fetchdf()

# Global singleton engine
db_engine = DuckDBEngine()

