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
        conversation_history: list[dict[str, Any]] = [],
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
                    model=effective_model,
                    conversation_history=conversation_history
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
        model: str,
        conversation_history: list[dict[str, Any]] = [],
    ) -> tuple[str, list[str]]:
        client = OpenAI(
            base_url=settings.OPENROUTER_BASE_URL,
            api_key=api_key,
        )

        anomaly_summary = [f"{a.column_name}: {a.value} (Score: {a.score}) - {a.explanation}" for a in anomalies[:5]]

        prompt = f"""
You are a direct, practical, and helpful Data Analyst.
Answer the user's question simply, clearly, and concisely based strictly on the query results.
Do not overcomplicate, do not write pompous essays, and do not use generic corporate buzzwords.
Provide the factual numbers, straightforward answer, and 2-3 brief practical bullet points.

User Question: {user_query}
Executed SQL: {sql_query}
Data Results: {json.dumps(data_results)}
Detected Outliers/Anomalies: {json.dumps(anomaly_summary)}

Return a strict JSON object with:
- "answer": A direct, friendly answer directly stating the answer and numbers.
- "insights": An array of 2-3 bullet points highlighting the main facts.
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

            # Check if user asked for lowest / bottom / underperforming
            is_lowest = any(k in q for k in ["lowest", "bottom", "least", "worst", "underperform", "minimum", "min"])

            # Currency / numeric formatting
            is_currency = any(c in val_key.lower() for c in ["revenue", "profit", "cost", "spent", "amount", "price", "inr"])
            prefix = "₹" if "inr" in val_key.lower() else ("$" if is_currency else "")
            
            val_formatted = f"{prefix}{top_val:,.2f}" if isinstance(top_val, (int, float)) else str(top_val)
            clean_metric = val_key.replace('_', ' ').replace('total ', '').replace('monthly ', '')

            # Derive entity type strictly from dimension key
            dim_lower = dim_key.lower()
            if "region" in dim_lower:
                entity = "Region"
            elif "product" in dim_lower:
                entity = "Product"
            elif "customer" in dim_lower:
                entity = "Customer"
            elif "period" in dim_lower or "date" in dim_lower or "month" in dim_lower:
                entity = "Period"
            elif "channel" in dim_lower:
                entity = "Channel"
            elif "manager" in dim_lower:
                entity = "Sales Manager"
            else:
                entity = dim_key.replace('_', ' ').capitalize()

            # Direct, natural language response
            if is_lowest:
                answer = f"{entity} **{top_dim}** recorded the lowest {clean_metric}, totaling **{val_formatted}**."
            else:
                answer = f"{entity} **{top_dim}** generated the highest {clean_metric}, totaling **{val_formatted}**."

            # Calculate total across all returned rows
            all_vals = [r.get(val_key, 0) for r in data_results if isinstance(r.get(val_key), (int, float))]
            if all_vals:
                total_sum = sum(all_vals)
                pct_share = round((top_val / total_sum) * 100, 1) if total_sum > 0 else 0
                insights.append(f"**{top_dim}** accounts for **{pct_share}%** of total {clean_metric} among compared {entity.lower()}s.")

            if len(data_results) > 1:
                runner_up = data_results[1]
                runner_dim = runner_up.get(dim_key, "Next Item")
                runner_val = runner_up.get(val_key, 0)
                if isinstance(top_val, (int, float)) and isinstance(runner_val, (int, float)):
                    diff = abs(top_val - runner_val)
                    insights.append(f"{'Lower than' if is_lowest else 'Ahead of'} next {entity.lower()} ({runner_dim}) by **{prefix}{diff:,.2f}**.")
            
            if anomalies:
                insights.append(f"Identified {len(anomalies)} statistical outlier(s) in this segment.")

            return answer, insights

        # Single column or preview
        answer = f"Retrieved {len(data_results)} records matching your criteria."
        insights.append(f"Columns in output: {', '.join(keys)}.")
        return answer, insights
