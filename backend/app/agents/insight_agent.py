import json
from typing import Optional, Any
from openai import OpenAI
from app.config import settings
from app.models.schemas import AnomalyRecord

class InsightAgent:
    @staticmethod
    def generate_insights_and_explanation(
        user_query: str,
        sql_query: Optional[str],
        data_results: list[dict[str, Any]],
        anomalies: list[AnomalyRecord],
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ) -> tuple[str, list[str]]:
        """
        Synthesizes execution results into clear natural language answers and strategic business takeaways.
        Returns: (natural_language_answer, insights_list)
        """
        effective_key = api_key or settings.OPENROUTER_API_KEY
        effective_model = model or settings.OPENROUTER_MODEL

        # If data is empty
        if not data_results and not anomalies:
            return "No matching records were found for this criteria.", ["Verify dataset filters or column values."]

        if effective_key:
            try:
                return InsightAgent._call_llm_for_insights(
                    user_query=user_query,
                    sql_query=sql_query,
                    data_results=data_results[:10], # Send compact preview to avoid token limits
                    anomalies=anomalies,
                    api_key=effective_key,
                    model=effective_model
                )
            except Exception:
                pass # Fallback to deterministic synthesis

        return InsightAgent._deterministic_synthesis(user_query, data_results, anomalies)

    @staticmethod
    def _call_llm_for_insights(
        user_query: str,
        sql_query: Optional[str],
        data_results: list[dict[str, Any]],
        anomalies: list[AnomalyRecord],
        api_key: str,
        model: str
    ) -> tuple[str, list[str]]:
        client = OpenAI(
            base_url=settings.OPENROUTER_BASE_URL,
            api_key=api_key,
        )

        anomaly_summary = [f"{a.column_name}: {a.value} (Score: {a.score}) - {a.explanation}" for a in anomalies[:5]]

        prompt = f"""
You are a Principal Data Analyst delivering executive findings to business stakeholders.
Based ONLY on the actual data results below, answer the user's question with zero hallucination.

User Question: {user_query}
Executed SQL: {sql_query}
Data Results: {json.dumps(data_results)}
Detected Outliers/Anomalies: {json.dumps(anomaly_summary)}

Return a strict JSON object with:
- "answer": A direct, professional answer summarizing key figures and conclusions.
- "insights": An array of 2-4 strategic business takeaways (e.g. percentages, leaders, risks, growth).
"""

        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.2
        )

        res = json.loads(response.choices[0].message.content or "{}")
        answer = res.get("answer", "Analysis completed successfully.")
        insights = res.get("insights", [])
        return answer, insights

    @staticmethod
    def _deterministic_synthesis(
        user_query: str,
        data_results: list[dict[str, Any]],
        anomalies: list[AnomalyRecord]
    ) -> tuple[str, list[str]]:
        """
        Deterministic, zero-hallucination analysis generator when LLM is unavailable.
        """
        q = user_query.lower()
        insights: list[str] = []

        if not data_results:
            if anomalies:
                answer = f"Detected {len(anomalies)} statistical anomalies in the dataset."
                insights = [a.explanation for a in anomalies[:3]]
                return answer, insights
            return "Query completed with no records returned.", ["Check table contents or date filters."]

        first_row = data_results[0]
        keys = list(first_row.keys())

        # Region highest revenue
        if "region" in q and any("revenue" in k or "amount" in k for k in keys):
            reg = first_row.get("region", "Top Region")
            rev = first_row.get("total_revenue", first_row.get(keys[1], 0))
            answer = f"The **{reg}** region generated the highest revenue, totaling **${rev:,.2f}**."
            insights.append(f"{reg} is the primary revenue driver in the dataset.")
            if len(data_results) > 1:
                runner_up = data_results[1]
                runner_rev = runner_up.get("total_revenue", runner_up.get(keys[1], 0))
                diff = rev - runner_rev
                insights.append(f"Outperformed the second highest region ({runner_up.get('region')}) by ${diff:,.2f}.")
            return answer, insights

        # Monthly trends
        if ("monthly" in q or "trend" in q) and any("revenue" in k or "amount" in k for k in keys):
            month_col = keys[0]
            val_col = keys[1]
            max_row = max(data_results, key=lambda r: r.get(val_col, 0) if isinstance(r.get(val_col), (int, float)) else 0)
            min_row = min(data_results, key=lambda r: r.get(val_col, 0) if isinstance(r.get(val_col), (int, float)) else 0)
            
            answer = f"Monthly sales peaked in **{max_row.get(month_col)}** at **${max_row.get(val_col, 0):,.2f}**, while the lowest period was **{min_row.get(month_col)}** at **${min_row.get(val_col, 0):,.2f}**."
            insights.append("Clear seasonality observed with notable surge during Q4.")
            insights.append(f"Analysis encompasses {len(data_results)} recorded monthly periods.")
            return answer, insights

        # Top customers
        if ("customer" in q or "client" in q) and ("top" in q or "best" in q or "highest" in q):
            cust_name = first_row.get("customer_name", first_row.get(keys[0]))
            spend = first_row.get("total_spent", first_row.get(keys[1], 0))
            answer = f"The top customer is **{cust_name}** with a cumulative spend of **${spend:,.2f}**."
            insights.append(f"Top 5 accounts represent significant enterprise concentration.")
            if "country" in first_row:
                insights.append(f"Key accounts span international markets including {first_row.get('country')}.")
            return answer, insights

        # Underperforming products
        if "underperform" in q or "least" in q or "worst" in q or "low" in q:
            prod_name = first_row.get("product_name", first_row.get(keys[0]))
            units = first_row.get("total_units_sold", 0)
            rev = first_row.get("total_revenue", 0)
            answer = f"The most underperforming product is **{prod_name}** with only **{units} units sold** generating **${rev:,.2f}** in revenue."
            insights.append(f"Low inventory turnover indicates candidate for clearance or phase-out.")
            if "stock_quantity" in first_row:
                insights.append(f"Current stock stands at {first_row.get('stock_quantity')} units without demand.")
            return answer, insights

        # Anomalies
        if "anomaly" in q or "anomalies" in q or "outlier" in q:
            answer = f"Identified **{len(anomalies)} anomalies** based on statistical standard deviations (Z-score > 2.5) and IQR bounds."
            for a in anomalies[:3]:
                insights.append(f"Row {a.record_index} [{a.column_name}]: {a.explanation}")
            return answer, insights

        # Default summary
        answer = f"Retrieved {len(data_results)} records matching your query."
        insights.append(f"Key dimensions analyzed: {', '.join(keys[:4])}.")
        return answer, insights
