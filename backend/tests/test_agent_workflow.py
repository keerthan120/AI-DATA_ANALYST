import pytest
from pathlib import Path
from app.engine.duckdb_engine import db_engine
from app.agents.graph import agent_graph
from app.models.schemas import ChartType

@pytest.fixture(scope="module", autouse=True)
def setup_test_tables(tmp_path_factory):
    temp_dir = tmp_path_factory.mktemp("test_data")
    
    # 1. sales_transactions
    sales_csv = temp_dir / "sales_transactions.csv"
    sales_csv.write_text(
        "transaction_id,customer_id,product_id,order_date,quantity,unit_price,total_amount,region,payment_method\n"
        "TX101,C001,P101,2024-01-15,5,100.0,500.0,East,Credit Card\n"
        "TX102,C002,P102,2024-03-20,2,50.0,100.0,West,Wire Transfer\n"
        "TX103,C001,P101,2024-05-10,10,100.0,1000.0,East,Credit Card\n"
        "TX104,C003,P103,2024-11-25,1,200.0,200.0,North,ACH\n"
        "TX999,C001,P101,2024-06-15,80,100.0,8000.0,East,Wire Transfer\n" # Outlier
    )
    db_engine.register_csv("sales_transactions", sales_csv)

    # 2. customers
    cust_csv = temp_dir / "customers.csv"
    cust_csv.write_text(
        "customer_id,customer_name,email,segment,country,signup_date\n"
        "C001,Acme Enterprise,acme@ent.com,Corporate,USA,2023-01-01\n"
        "C002,Nova Corp,nova@corp.com,Enterprise,Canada,2023-02-01\n"
        "C003,Apex Fin,apex@fin.com,SMB,UK,2023-03-01\n"
    )
    db_engine.register_csv("customers", cust_csv)

    # 3. products
    prod_csv = temp_dir / "products.csv"
    prod_csv.write_text(
        "product_id,product_name,category,cost_price,list_price,stock_quantity\n"
        "P101,Ultra Pro Laptop,Electronics,700.0,1000.0,50\n"
        "P102,Wireless Mouse,Accessories,15.0,30.0,100\n"
        "P103,4K Monitor,Electronics,150.0,250.0,20\n"
    )
    db_engine.register_csv("products", prod_csv)

def test_highest_revenue_by_region():
    state = {
        "session_id": "test-session",
        "message": "Which region generated the highest revenue?",
        "table_names": ["sales_transactions"],
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
        "conversation_history": []
    }
    result = agent_graph.invoke(state)
    assert result["guardrail_status"]["passed"] is True
    assert len(result["anomalies"]) > 0
    assert any(a.explanation for a in result["anomalies"])

def test_code_generation_sql_and_pandas():
    state = {
        "session_id": "test-session",
        "message": "Generate SQL and pandas code for monthly sales trends",
        "table_names": ["sales_transactions"],
        "conversation_history": []
    }
    result = agent_graph.invoke(state)
    assert result["guardrail_status"]["passed"] is True
    assert result["sql_query"] is not None
    assert "sales_transactions" in result["sql_query"]
    assert result["python_code"] is not None
    assert "pandas" in result["python_code"]

