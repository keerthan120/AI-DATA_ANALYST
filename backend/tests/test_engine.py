import pytest
from pathlib import Path
from app.engine.duckdb_engine import DuckDBEngine

@pytest.fixture
def test_engine(tmp_path: Path):
    engine = DuckDBEngine()
    # Create sample csv
    csv_file = tmp_path / "test_sales.csv"
    csv_file.write_text("id,region,amount\n1,East,100.5\n2,West,250.0\n3,East,300.0\n")
    engine.register_csv("test_sales", csv_file)
    return engine

def test_duckdb_registration_and_inspect(test_engine: DuckDBEngine):
    schema = test_engine.inspect_table("test_sales")
    assert schema.table_name == "test_sales"
    assert schema.row_count == 3
    assert schema.column_count == 3
    col_names = [c.name for c in schema.columns]
    assert "region" in col_names
    assert "amount" in col_names

def test_duckdb_query_execution(test_engine: DuckDBEngine):
    sql = "SELECT region, SUM(amount) as total FROM test_sales GROUP BY region ORDER BY total DESC"
    rows, count = test_engine.execute_query(sql)
    assert count == 2
    assert rows[0]["region"] == "East"
    assert rows[0]["total"] == 400.5
