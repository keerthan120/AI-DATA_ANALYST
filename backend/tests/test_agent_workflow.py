import pytest
from pathlib import Path
from app.config import settings
from app.engine.duckdb_engine import db_engine
from app.agents.graph import agent_graph
from app.models.schemas import UserRole, ChartType

@pytest.fixture(scope="module", autouse=True)
def setup_sample_data():
    sample_files = ["sales_transactions.csv", "customers.csv", "products.csv"]
    for fname in sample_files:
        fpath = settings.SAMPLE_DATA_DIR / fname
        if fpath.exists():
            t_name = Path(fname).stem
            db_engine.register_csv(t_name, fpath)

def test_highest_revenue_by_region():
    state = {
        "session_id": "test-session",
        "message": "Which region generated the highest revenue?",
        "table_names": ["sales_transactions"],
        "user_role": UserRole.ADMIN,
        "conversation_history": []
    }
    result = agent_graph.invoke(state)
    assert result["guardrail_status"]["passed"] is True
    assert "region" in result["natural_language_answer"].lower()
    assert len(result["data_results"]) > 0
    assert result["chart"] is not None
    assert result["chart"].type in [ChartType.BAR, ChartType.PIE]

def test_monthly_sales_trends():
    state = {
        "session_id": "test-session",
        "message": "Show monthly sales trends",
        "table_names": ["sales_transactions"],
        "user_role": UserRole.ADMIN,
        "conversation_history": []
    }
    result = agent_graph.invoke(state)
    assert result["guardrail_status"]["passed"] is True
    assert len(result["data_results"]) > 0
    assert result["chart"] is not None
    assert result["chart"].type == ChartType.LINE

def test_top_five_customers_multi_table_join():
    state = {
        "session_id": "test-session",
        "message": "What are the top five customers?",
        "table_names": ["sales_transactions", "customers"],
        "user_role": UserRole.ADMIN,
        "conversation_history": []
    }
    result = agent_graph.invoke(state)
    assert result["guardrail_status"]["passed"] is True
    assert len(result["data_results"]) <= 5
    assert len(result["insights"]) > 0

def test_underperforming_products():
    state = {
        "session_id": "test-session",
        "message": "Which products are underperforming?",
        "table_names": ["sales_transactions", "products"],
        "user_role": UserRole.ADMIN,
        "conversation_history": []
    }
    result = agent_graph.invoke(state)
    assert result["guardrail_status"]["passed"] is True
    assert len(result["data_results"]) > 0

def test_detect_anomalies_workflow():
    state = {
        "session_id": "test-session",
        "message": "Detect anomalies in the dataset.",
        "table_names": ["sales_transactions"],
        "user_role": UserRole.ADMIN,
        "conversation_history": []
    }
    result = agent_graph.invoke(state)
    assert result["guardrail_status"]["passed"] is True
    assert len(result["anomalies"]) > 0
    # Anomaly explanations must exist
    assert any(a.explanation for a in result["anomalies"])

