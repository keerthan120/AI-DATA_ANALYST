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

        if not data_results and not anomalies:
            return "No matching records were found for this criteria in the database.", ["Verify dataset filters or column values."]

        if effective_key:
            try:
                return InsightAgent._call_llm_for_insights(
                    user_query=user_query,
                    sql_query=sql_query,
                    data_results=data_results[:10],
                    anomalies=anomalies,
                    api_key=effective_key,
                    model=effective_model
                )
            except Exception:
                pass

        return InsightAgent._dynamic_synthesis(user_query, data_results, anomalies)

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
    def _dynamic_synthesis(
        user_query: str,
        data_results: list[dict[str, Any]],
        anomalies: list[AnomalyRecord]
    ) -> tuple[str, list[str]]:
        """
        Dynamic, zero-hallucination analysis generator when LLM is unavailable.
        Inspects actual data result keys and values to explain findings for any arbitrary dataset.
        """
        q = user_query.lower()
        insights: list[str] = []

        if not data_results:
            if anomalies:
                answer = f"Identified **{len(anomalies)} statistical anomalies** in the dataset based on IQR bounds and Z-scores (|Z| > 2.5)."
                insights = [f"{a.column_name} (Row {a.record_index}): {a.explanation}" for a in anomalies[:3]]
                return answer, insights
            return "Query completed with no records returned.", ["Check table contents or filter criteria."]

        first_row = data_results[0]
        keys = list(first_row.keys())

        # Anomaly focus
        if any(k in q for k in ["anomaly", "anomalies", "outlier", "unusual"]):
            answer = f"Detected **{len(anomalies)} statistical outliers** across the dataset using IQR and Z-score distributions."
            for a in anomalies[:4]:
                insights.append(f"Row {a.record_index} [{a.column_name}]: {a.explanation}")
            return answer, insights

        # Dimension Ranking (e.g. region, customer, product)
        if len(keys) >= 2:
            dim_key = keys[0]
            val_key = keys[1]
            top_dim = first_row.get(dim_key, "Top Item")
            top_val = first_row.get(val_key, 0)

            # Currency / numeric formatting
            is_currency = any(c in val_key.lower() for c in ["revenue", "profit", "cost", "spent", "amount", "price", "inr"])
            prefix = "₹" if "inr" in val_key.lower() else ("$" if is_currency else "")
            
            val_formatted = f"{prefix}{top_val:,.2f}" if isinstance(top_val, (int, float)) else str(top_val)

            # Specific Region response
            if "region" in dim_key.lower() or "region" in q:
                answer = f"Region **{top_dim}** generated the highest {val_key.replace('_', ' ')}, totaling **{val_formatted}**."
            elif "product" in dim_key.lower() or "product" in q:
                answer = f"Product **{top_dim}** is the top performer with a total of **{val_formatted}**."
            elif "customer" in dim_key.lower() or "customer" in q:
                answer = f"Customer **{top_dim}** generated the highest total of **{val_formatted}**."
            elif "period" in dim_key.lower():
                answer = f"Period **{top_dim}** recorded the highest volume with **{val_formatted}**."
            else:
                answer = f"The leading **{dim_key}** is **{top_dim}**, with a total of **{val_formatted}**."

            # Calculate total across all returned rows
            all_vals = [r.get(val_key, 0) for r in data_results if isinstance(r.get(val_key), (int, float))]
            if all_vals:
                total_sum = sum(all_vals)
                pct_share = round((top_val / total_sum) * 100, 1) if total_sum > 0 else 0
                insights.append(f"**{top_dim}** represents **{pct_share}%** of the total {val_key.replace('_', ' ')} across all analyzed categories.")

            if len(data_results) > 1:
                runner_up = data_results[1]
                runner_dim = runner_up.get(dim_key, "Second Item")
                runner_val = runner_up.get(val_key, 0)
                if isinstance(top_val, (int, float)) and isinstance(runner_val, (int, float)):
                    diff = top_val - runner_val
                    pct = round((diff / (runner_val or 1)) * 100, 1)
                    insights.append(f"Outperformed the second highest ({runner_dim}) by {prefix}{diff:,.2f} (+{pct}%).")
            
            if anomalies:
                insights.append(f"Statistical audit: {len(anomalies)} outliers detected in numerical distributions.")

            return answer, insights

        # Single column or preview
        answer = f"Retrieved {len(data_results)} records matching your criteria."
        insights.append(f"Columns in output: {', '.join(keys)}.")
        return answer, insights
