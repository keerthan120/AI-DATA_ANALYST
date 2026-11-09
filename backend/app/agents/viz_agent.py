import re
from typing import Any
from app.models.schemas import ChartConfig, ChartType

class VisualizationAgent:
    @staticmethod
    def infer_chart_config(
        query: str,
        data: list[dict[str, Any]],
        suggested_type: str = "auto"
    ) -> ChartConfig:
        """
        Infers the most appropriate chart type and dimension keys based on query context and data schema.
        """
        if not data:
            return ChartConfig(type=ChartType.NONE)

        keys = list(data[0].keys())
        if len(keys) < 2:
            return ChartConfig(type=ChartType.NONE)

        # Separate categorical/temporal keys and numeric keys
        numeric_keys: list[str] = []
        string_or_date_keys: list[str] = []

        for k in keys:
            sample_val = next((row[k] for row in data if row.get(k) is not None), None)
            if isinstance(sample_val, (int, float)) and not isinstance(sample_val, bool):
                numeric_keys.append(k)
            else:
                string_or_date_keys.append(k)

        if not numeric_keys:
            return ChartConfig(type=ChartType.NONE)

        # Identify x key
        x_key = string_or_date_keys[0] if string_or_date_keys else keys[0]
        y_keys = [k for k in numeric_keys if k != x_key]
        if not y_keys:
            y_keys = [keys[1]]

        # Determine chart type
        q_lower = query.lower()
        is_date_col = any(term in x_key.lower() for term in ["date", "month", "year", "time", "day", "week", "period"])
        is_trend_query = any(term in q_lower for term in ["trend", "over time", "monthly", "daily", "timeline", "history"])

        # 1. Explicit user request takes highest priority
        if any(term in q_lower for term in ["bar", "barchart", "column"]):
            chosen_type = ChartType.BAR
        elif any(term in q_lower for term in ["pie", "piechart", "donut", "doughnut"]):
            chosen_type = ChartType.PIE
        elif any(term in q_lower for term in ["scatter", "scatterplot", "bubble"]):
            chosen_type = ChartType.SCATTER
            if len(numeric_keys) >= 2:
                x_key = numeric_keys[0]
                y_keys = [numeric_keys[1]]
        elif any(term in q_lower for term in ["line", "linechart"]):
            chosen_type = ChartType.LINE
        elif any(term in q_lower for term in ["area", "areachart"]):
            chosen_type = ChartType.AREA
        # 2. Heuristic inference based on temporal context
        elif is_date_col or is_trend_query:
            chosen_type = ChartType.LINE
        # 3. Composition / Share -> Pie Chart
        elif any(term in q_lower for term in ["proportion", "share", "breakdown", "percentage"]) and len(data) <= 8:
            chosen_type = ChartType.PIE
        # 4. Correlation / Relationship -> Scatter Plot
        elif any(term in q_lower for term in ["correlation", "vs", "versus", "relationship"]) and len(numeric_keys) >= 2:
            chosen_type = ChartType.SCATTER
            x_key = numeric_keys[0]
            y_keys = [numeric_keys[1]]
        else:
            chosen_type = ChartType.BAR

        title = f"{y_keys[0].replace('_', ' ').title()} by {x_key.replace('_', ' ').title()}"

        return ChartConfig(
            type=chosen_type,
            title=title,
            x_key=x_key,
            y_keys=y_keys[:3], # Cap at 3 metrics
            x_label=x_key.replace("_", " ").title(),
            y_label=y_keys[0].replace("_", " ").title(),
            description=f"Generated {chosen_type.value} chart analyzing {title}."
        )

