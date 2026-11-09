import time
from typing import Any
from langgraph.graph import StateGraph, START, END
from app.agents.state import AgentState
from app.agents.data_profiler import DataProfilerAgent
from app.agents.sql_agent import SQLAgent
from app.agents.viz_agent import VisualizationAgent
from app.agents.anomaly_agent import AnomalyDetectionAgent
from app.agents.insight_agent import InsightAgent
from app.guardrails.input_guard import InputGuardrail
from app.engine.duckdb_engine import db_engine
from app.models.schemas import ChartType

# 1. Guardrail & Security Node
def input_guardrail_node(state: AgentState) -> dict[str, Any]:
    start_time = time.time()
    query = state.get("message", "")

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
    steps.append(f"Loaded schema profiles for {len(active_tables)} active tables.")
    return {
        "schema_context": schema_context,
        "selected_tables": active_tables,
        "reasoning_steps": steps
    }

# 3. Supervisor & Router Node
def supervisor_node(state: AgentState) -> dict[str, Any]:
    query = state.get("message", "").strip().lower()
    steps = state.get("reasoning_steps", [])
    
    # Check for conversational greeting or general introduction
    greetings = {"hi", "hello", "hey", "hola", "help", "who are you", "what can you do", "good morning", "good evening"}
    if query in greetings or any(query.startswith(g) and len(query) <= len(g) + 3 for g in greetings):
        intent = "greeting"
        steps.append("Supervisor recognized conversational greeting; providing assistant introduction and capability guide.")
    elif any(k in query for k in ["anomaly", "anomalies", "outlier", "unusual", "irregular"]):
        intent = "anomaly"
        steps.append("Supervisor routed query to Statistical Anomaly Detection workflow.")
    elif any(k in query for k in ["trend", "highest", "underperform", "top", "sales", "revenue", "count", "average", "sql"]):
        intent = "sql_analysis"
        steps.append("Supervisor routed query to Code & SQL Generation workflow.")
    else:
        intent = "general_analysis"
        steps.append("Supervisor routed query to General Data Ingestion & Overview workflow.")

    return {
        "intent": intent,
        "reasoning_steps": steps
    }

# 3.5 Greeting Node
def greeting_node(state: AgentState) -> dict[str, Any]:
    start_time = state.get("start_time", time.time())
    steps = state.get("reasoning_steps", [])
    tables = state.get("selected_tables", [])
    table_list = ", ".join(tables) if tables else "none"

    greeting_text = (
        f"Data Analyst engine initialized. Active tables: {len(tables)} ({table_list}).\n\n"
        f"Ready to process analytical queries, aggregations, trend computations, and anomaly checks.\n\n"
        f"Supported query operations:\n"
        f"- Regional performance and revenue aggregation\n"
        f"- Monthly and temporal sales trends\n"
        f"- Top customer ranking and cross-table joins\n"
        f"- Inventory turnover and underperforming product identification\n"
        f"- Statistical anomaly detection (IQR, Z-Score, Isolation Forest)\n"
        f"- Deterministic DuckDB SQL generation"
    )
    steps.append("Prepared tailored greeting with active dataset context and suggested prompts.")
    elapsed_ms = round((time.time() - start_time) * 1000, 2)

    return {
        "natural_language_answer": greeting_text,
        "insights": [
            f"{len(tables)} table(s) ready for querying.",
            "Ask questions in natural language to generate SQL, interactive visualizations, and anomaly reports."
        ],
        "chart": None,
        "data_results": [],
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
    steps = state.get("reasoning_steps", [])

    sql, rows, total_count, error, agent_steps = SQLAgent.generate_and_execute_sql(
        user_query=query,
        schema_context=schema_ctx,
        table_names=tables,
        api_key=api_key,
        model=model
    )
    steps.extend(agent_steps)

    return {
        "sql_query": sql,
        "data_results": rows,
        "total_data_rows": total_count,
        "execution_error": error,
        "reasoning_steps": steps
    }

# 5. Anomaly Detection Node
def anomaly_node(state: AgentState) -> dict[str, Any]:
    tables = state.get("selected_tables", [])
    target_table = tables[0] if tables else None
    steps = state.get("reasoning_steps", [])
    anomalies = []

    if target_table:
        try:
            df = db_engine.get_dataframe(target_table)
            anomalies = AnomalyDetectionAgent.detect_anomalies(df)
            if anomalies:
                steps.append(f"Identified {len(anomalies)} statistical anomalies in table '{target_table}'.")
        except Exception as e:
            steps.append(f"Anomaly detection encountered an issue: {str(e)}")

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

    steps.append("Synthesizing final executive explanation and strategic insights.")
    answer, insights = InsightAgent.generate_insights_and_explanation(
        user_query=query,
        sql_query=sql,
        data_results=data,
        anomalies=anomalies,
        api_key=api_key,
        model=model
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
    if intent == "greeting":
        return "greeting"
    if intent == "anomaly":
        return "anomaly"
    return "sql"

# Build LangGraph StateGraph
def build_data_analyst_graph():
    builder = StateGraph(AgentState)

    builder.add_node("guardrail", input_guardrail_node)
    builder.add_node("profiler", profiler_node)
    builder.add_node("supervisor", supervisor_node)
    builder.add_node("greeting", greeting_node)
    builder.add_node("sql", sql_node)
    builder.add_node("anomaly", anomaly_node)
    builder.add_node("viz", viz_node)
    builder.add_node("synthesizer", insight_synthesizer_node)

    builder.add_edge(START, "guardrail")
    builder.add_conditional_edges("guardrail", route_after_guardrail, {"profiler": "profiler", END: END})
    builder.add_edge("profiler", "supervisor")
    builder.add_conditional_edges("supervisor", route_by_intent, {
        "greeting": "greeting",
        "anomaly": "anomaly",
        "sql": "sql"
    })
    
    # Greeting flow: greeting -> END
    builder.add_edge("greeting", END)

    # Anomaly flow: anomaly -> viz -> synthesizer -> END
    builder.add_edge("anomaly", "viz")
    # SQL flow: sql -> viz -> anomaly (for outlier check) -> synthesizer -> END
    builder.add_edge("sql", "anomaly")
    builder.add_edge("viz", "synthesizer")
    builder.add_edge("synthesizer", END)

    return builder.compile()

# Global compiled graph
agent_graph = build_data_analyst_graph()

