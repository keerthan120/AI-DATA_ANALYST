import time
from typing import Any
from langgraph.graph import StateGraph, START, END
from app.agents.state import AgentState
from app.agents.data_profiler import DataProfilerAgent
from app.agents.sql_agent import SQLAgent
from app.agents.viz_agent import VisualizationAgent
from app.agents.anomaly_agent import AnomalyDetectionAgent
from app.agents.insight_agent import InsightAgent
from app.agents.forecasting_agent import ForecastingAgent
from app.agents.quality_agent import DataQualityAgent
from app.agents.cache_manager import query_cache
from app.guardrails.input_guard import InputGuardrail
from app.engine.duckdb_engine import db_engine
from app.models.schemas import ChartType, ChartConfig

# 1. Guardrail & Security Node
def input_guardrail_node(state: AgentState) -> dict[str, Any]:
    start_time = time.time()
    query = state.get("message", "")
    tables = state.get("table_names", [])

    is_safe, violations = InputGuardrail.validate_user_query(query)
    if not is_safe:
        return {
            "guardrail_status": {"passed": False, "violations": violations},
            "natural_language_answer": f"Request blocked by safety guardrails: {'; '.join(violations)}",
            "reasoning_steps": ["Input query failed security validation."],
            "execution_time_ms": round((time.time() - start_time) * 1000, 2)
        }

    return {
        "guardrail_status": {"passed": True, "violations": []},
        "reasoning_steps": ["Input query passed security validation."]
    }

# 2. Schema Profiler Node
def profiler_node(state: AgentState) -> dict[str, Any]:
    requested_tables = state.get("table_names", [])
    schema_context, active_tables = DataProfilerAgent.generate_schema_context(requested_tables)
    steps = state.get("reasoning_steps", [])
    steps.append(f"Loaded schema profiles for {len(active_tables)} active tables into working memory.")
    return {
        "schema_context": schema_context,
        "selected_tables": active_tables,
        "reasoning_steps": steps
    }

# 3. Supervisor & Router Node
def supervisor_node(state: AgentState) -> dict[str, Any]:
    query = state.get("message", "").strip().lower()
    steps = state.get("reasoning_steps", [])
    
    greetings = {"hi", "hello", "hey", "hola", "help", "who are you", "what can you do", "good morning", "good evening", "good afternoon"}
    forecast_keywords = ["forecast", "predict", "projection", "predictive", "next months", "future trend"]
    quality_keywords = ["quality", "data quality", "hygiene", "audit", "cleanliness", "duplicates", "null count"]
    anomaly_keywords = ["anomaly", "anomalies", "outlier", "outliers", "unusual", "irregular"]
    dataset_overview_keywords = ["overview", "profile dataset", "describe dataset", "summarize dataset", "what is this data", "explain the dataset", "explain this csv", "explain that csv", "dataset summary"]

    if query in greetings or any(query == g or query.startswith(g + " ") for g in greetings):
        intent = "greeting"
        steps.append("Recognized greeting; providing helpful capabilities guide.")
    elif any(k in query for k in anomaly_keywords):
        intent = "anomaly"
        steps.append("Routing query to Anomaly Detection.")
    elif any(k in query for k in forecast_keywords):
        intent = "forecast"
        steps.append("Routing query to Forecasting.")
    elif any(k in query for k in quality_keywords):
        intent = "quality"
        steps.append("Routing query to Data Quality Audit.")
    elif any(k in query for k in dataset_overview_keywords) or query.startswith("overview") or ("explain" in query and any(w in query for w in ["dataset", "csv", "table", "file", "data", "regions", "sales", "products", "customers"])):
        intent = "overview"
        steps.append("Routing query to Dataset Overview.")
    else:
        intent = "sql_analysis"
        steps.append("Routing query to Data Analysis & Visualization.")

    return {
        "intent": intent,
        "reasoning_steps": steps
    }

def resolve_target_table(tables: list[str], query: str) -> str:
    q = query.lower()
    for t in tables:
        stem = t.lower().rstrip('s')
        if t.lower() in q or (len(stem) >= 4 and stem in q):
            return t
    return tables[0] if tables else ""

# 3.4 Greeting Node (Polite, helpful introduction)
def greeting_node(state: AgentState) -> dict[str, Any]:
    start_time = state.get("start_time", time.time())
    steps = state.get("reasoning_steps", [])
    tables = state.get("selected_tables", [])
    table_list = ", ".join(tables) if tables else "none"

    greeting_text = (
        f"**Hello! I am your AI Data Analyst at Digital Back Office.**\n\n"
        f"How can I help you today? Here is what you can do:\n\n"
        f"1. **Upload CSV Files:** Drag and drop one or more CSVs to automatically inspect schemas and data quality.\n"
        f"2. **Ask Questions in Plain English:** (e.g. *Which region had the lowest revenue?*, *Show monthly sales trends*, *Top 5 customers*).\n"
        f"3. **Interactive Charts:** Get Bar, Line, Pie, Area, and Scatter charts generated instantly with SQL & Python code.\n"
        f"4. **Outlier & Anomaly Detection:** Detect numeric anomalies with statistical IQR & Z-score explanations.\n"
        f"5. **Data Quality Audits:** Check missing values, completeness scores, and duplicates.\n\n"
        f"{f'**Currently Active Datasets:** {table_list}' if tables else 'Upload your first CSV file or ask a question to get started!'}"
    )
    steps.append("Prepared greeting guide.")
    elapsed_ms = round((time.time() - start_time) * 1000, 2)

    return {
        "natural_language_answer": greeting_text,
        "insights": [
            f"Active in-memory tables: {table_list if tables else 'None'}.",
            "Ready for questions, SQL analysis, charts, and anomaly audits."
        ],
        "chart": None,
        "data_results": [],
        "reasoning_steps": steps,
        "execution_time_ms": elapsed_ms
    }

# 3.5 Overview Node (Explains any uploaded CSV immediately)
def overview_node(state: AgentState) -> dict[str, Any]:
    start_time = state.get("start_time", time.time())
    steps = state.get("reasoning_steps", [])
    tables = state.get("selected_tables", [])
    query = state.get("message", "")
    q = query.lower()

    # Check which tables are mentioned in the query
    matched_tables = [
        t for t in tables
        if t.lower() in q or (len(t.rstrip('s')) >= 4 and t.rstrip('s').lower() in q)
    ]
    
    # Trigger multi-dataset overview if multiple tables match, or query asks for all/files/datasets/them
    is_multi = (
        len(matched_tables) > 1
        or any(k in q for k in ["all", "files", "datasets", "tables", "them"])
        or len(matched_tables) == 0
    )

    if len(tables) > 1 and is_multi:
        steps.append(f"Analyzing all {len(tables)} uploaded datasets in working memory...")
        profile_data = DataProfilerAgent.explain_multi_dataset_overview(tables)
        target_table = profile_data.get("table_name", tables[0])
        steps.append(f"Generated multi-dataset overview across {len(tables)} tables.")
    else:
        target_table = matched_tables[0] if matched_tables else (tables[0] if tables else "")
        steps.append(f"Analyzing schema, column distributions, and null ratios for '{target_table}'...")
        profile_data = DataProfilerAgent.explain_dataset_overview(target_table)
        steps.append(f"Generated dataset summary and analytical preview for '{target_table}'.")

    elapsed_ms = round((time.time() - start_time) * 1000, 2)
    return {
        "natural_language_answer": profile_data["markdown"],
        "insights": profile_data["insights"],
        "data_results": profile_data["preview_rows"],
        "total_data_rows": len(profile_data["preview_rows"]),
        "sql_query": f"SELECT * FROM \"{target_table}\" LIMIT 10;",
        "python_code": f"import pandas as pd\n\ndf = pd.read_csv('{target_table}.csv')\nprint(df.info())\nprint(df.describe())",
        "chart": None,
        "anomalies": [],
        "reasoning_steps": steps,
        "execution_time_ms": elapsed_ms
    }

# 3.6 Forecast Node
def forecast_node(state: AgentState) -> dict[str, Any]:
    start_time = state.get("start_time", time.time())
    steps = state.get("reasoning_steps", [])
    tables = state.get("selected_tables", [])
    query = state.get("message", "")
    target_table = resolve_target_table(tables, query)

    steps.append(f"Fitting linear trend model on temporal series for table '{target_table}'...")
    results, chart, explanation, insights = ForecastingAgent.forecast_series(target_table, periods_ahead=4)
    steps.append("Projected future periods with statistical confidence trends.")

    elapsed_ms = round((time.time() - start_time) * 1000, 2)
    return {
        "natural_language_answer": explanation,
        "insights": insights,
        "data_results": results,
        "total_data_rows": len(results),
        "chart": chart,
        "sql_query": f"-- Time Series Trend Forecast\nSELECT strftime('%Y-%m', date_col) AS period, SUM(metric_col) FROM \"{target_table}\" GROUP BY period;",
        "python_code": f"import pandas as pd\nimport numpy as np\n# Linear regression forecast\n# See ForecastingAgent for implementation",
        "reasoning_steps": steps,
        "execution_time_ms": elapsed_ms
    }

# 3.7 Data Quality Node
def quality_node(state: AgentState) -> dict[str, Any]:
    start_time = state.get("start_time", time.time())
    steps = state.get("reasoning_steps", [])
    tables = state.get("selected_tables", [])
    query = state.get("message", "")
    target_table = resolve_target_table(tables, query)

    steps.append(f"Running data quality and hygiene checks on '{target_table}'...")
    report, explanation, insights = DataQualityAgent.audit_table(target_table)
    steps.append(f"Completed quality audit: Grade {report.quality_grade}, {report.completeness_score}% completeness.")

    elapsed_ms = round((time.time() - start_time) * 1000, 2)
    return {
        "natural_language_answer": explanation,
        "insights": insights,
        "data_results": [report.model_dump()],
        "total_data_rows": 1,
        "chart": None,
        "sql_query": f"SELECT COUNT(*) as total_rows, COUNT(DISTINCT *) as unique_rows FROM \"{target_table}\";",
        "python_code": f"import pandas as pd\ndf = pd.read_csv('{target_table}.csv')\nprint(df.isnull().sum())\nprint(df.duplicated().sum())",
        "reasoning_steps": steps,
        "execution_time_ms": elapsed_ms
    }

# 4. SQL Analytics & Execution Node
def sql_node(state: AgentState) -> dict[str, Any]:
    query = state.get("message", "")
    schema_ctx = state.get("schema_context", "")
    tables = state.get("selected_tables", [])
    api_key = state.get("api_key")
    model = state.get("model")
    conv_hist = state.get("conversation_history", [])
    steps = state.get("reasoning_steps", [])

    sql, python_code, rows, total_count, error, agent_steps = SQLAgent.generate_and_execute_sql(
        user_query=query,
        schema_context=schema_ctx,
        table_names=tables,
        api_key=api_key,
        model=model,
        conversation_history=conv_hist
    )
    steps.extend(agent_steps)

    return {
        "sql_query": sql,
        "python_code": python_code,
        "data_results": rows,
        "total_data_rows": total_count,
        "execution_error": error,
        "reasoning_steps": steps
    }

# 5. Anomaly Detection Node
def anomaly_node(state: AgentState) -> dict[str, Any]:
    tables = state.get("selected_tables", [])
    query = state.get("message", "")
    target_table = resolve_target_table(tables, query)
    steps = state.get("reasoning_steps", [])
    anomalies = []

    if target_table:
        try:
            df = db_engine.get_dataframe(target_table)
            anomalies = AnomalyDetectionAgent.detect_anomalies(df)
            if anomalies:
                steps.append(f"Identified {len(anomalies)} statistical anomalies in table '{target_table}'.")
        except Exception as e:
            steps.append(f"Anomaly detection note: {str(e)}")

    return {
        "anomalies": anomalies,
        "reasoning_steps": steps
    }

# 6. Visualization Node
def viz_node(state: AgentState) -> dict[str, Any]:
    query = state.get("message", "")
    data = state.get("data_results", [])
    steps = state.get("reasoning_steps", [])
    
    chart = VisualizationAgent.infer_chart_config(query, data)
    if chart.type != ChartType.NONE:
        steps.append(f"Configured interactive {chart.type.value} chart with X-axis='{chart.x_key}' and Y-axis={chart.y_keys}.")

    return {
        "chart": chart,
        "reasoning_steps": steps
    }

# 7. Insight Synthesizer Node
def insight_synthesizer_node(state: AgentState) -> dict[str, Any]:
    start_time = state.get("start_time", time.time())
    query = state.get("message", "")
    sql = state.get("sql_query")
    data = state.get("data_results", [])
    anomalies = state.get("anomalies", [])
    api_key = state.get("api_key")
    model = state.get("model")
    steps = state.get("reasoning_steps", [])

    steps.append("Synthesizing clear data analysis and key metrics.")
    answer, insights = InsightAgent.generate_insights_and_explanation(
        user_query=query,
        sql_query=sql,
        data_results=data,
        anomalies=anomalies,
        api_key=api_key,
        model=model,
        conversation_history=state.get("conversation_history", [])
    )

    elapsed_ms = round((time.time() - start_time) * 1000, 2)
    return {
        "natural_language_answer": answer,
        "insights": insights,
        "reasoning_steps": steps,
        "execution_time_ms": elapsed_ms
    }

def route_after_guardrail(state: AgentState) -> str:
    guard_status = state.get("guardrail_status", {})
    if not guard_status.get("passed", True):
        return END
    return "profiler"

def route_by_intent(state: AgentState) -> str:
    intent = state.get("intent", "sql_analysis")
    if intent == "overview":
        return "overview"
    if intent == "greeting":
        return "greeting"
    if intent == "forecast":
        return "forecast"
    if intent == "quality":
        return "quality"
    if intent == "anomaly":
        return "anomaly"
    return "sql"

# Build LangGraph StateGraph
def build_data_analyst_graph():
    builder = StateGraph(AgentState)

    builder.add_node("guardrail", input_guardrail_node)
    builder.add_node("profiler", profiler_node)
    builder.add_node("supervisor", supervisor_node)
    builder.add_node("overview", overview_node)
    builder.add_node("greeting", greeting_node)
    builder.add_node("forecast", forecast_node)
    builder.add_node("quality", quality_node)
    builder.add_node("sql", sql_node)
    builder.add_node("anomaly", anomaly_node)
    builder.add_node("viz", viz_node)
    builder.add_node("synthesizer", insight_synthesizer_node)

    builder.add_edge(START, "guardrail")
    builder.add_conditional_edges("guardrail", route_after_guardrail, {"profiler": "profiler", END: END})
    builder.add_edge("profiler", "supervisor")
    builder.add_conditional_edges("supervisor", route_by_intent, {
        "overview": "overview",
        "greeting": "greeting",
        "forecast": "forecast",
        "quality": "quality",
        "anomaly": "anomaly",
        "sql": "sql"
    })
    
    # Overview flow: overview -> END
    builder.add_edge("overview", END)
    # Greeting flow: greeting -> END
    builder.add_edge("greeting", END)
    # Forecast flow: forecast -> END
    builder.add_edge("forecast", END)
    # Quality flow: quality -> END
    builder.add_edge("quality", END)

    # Anomaly flow: anomaly -> viz -> synthesizer -> END
    builder.add_edge("anomaly", "viz")
    
    # SQL flow: sql -> anomaly -> viz -> synthesizer -> END
    builder.add_edge("sql", "anomaly")
    builder.add_edge("viz", "synthesizer")
    builder.add_edge("synthesizer", END)

    return builder.compile()

# Global compiled graph
agent_graph = build_data_analyst_graph()
