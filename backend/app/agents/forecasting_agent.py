import numpy as np
import pandas as pd
from typing import Optional, Any
from app.engine.duckdb_engine import db_engine
from app.models.schemas import ChartConfig, ChartType

class ForecastingAgent:
    @staticmethod
    def forecast_series(
        table_name: str,
        periods_ahead: int = 4
    ) -> tuple[list[dict[str, Any]], Optional[ChartConfig], str, list[str]]:
        """
        Detects temporal trend and projects future periods using linear regression trend analysis.
        Returns: (data_points, chart_config, explanation, insights)
        """
        all_schemas = db_engine.get_registered_tables_info()
        schema = next((s for s in all_schemas if s.table_name == table_name), None)
        if not schema:
            return [], None, "No active table available for forecasting.", []

        # Find date column and numeric column
        columns = schema.columns
        date_cols = [c.name for c in columns if any(t in c.dtype.upper() for t in ["DATE", "TIME", "TIMESTAMP"]) or "date" in c.name.lower() or "time" in c.name.lower()]
        numeric_cols = [c.name for c in columns if any(t in c.dtype.upper() for t in ["INT", "DOUBLE", "FLOAT", "DECIMAL", "HUGEINT", "BIGINT"])]

        if not date_cols or not numeric_cols:
            return [], None, "Forecasting requires at least one date column and one numeric metric column.", []

        date_col = date_cols[0]
        metric_col = numeric_cols[0]

        try:
            # Aggregate by monthly period in DuckDB
            query = f"""
                SELECT strftime('%Y-%m', CAST("{date_col}" AS DATE)) AS period,
                       ROUND(SUM("{metric_col}"), 2) AS actual_value
                FROM "{table_name}"
                WHERE "{date_col}" IS NOT NULL
                GROUP BY period
                ORDER BY period ASC;
            """
            rows, _ = db_engine.execute_query(query)
            if len(rows) < 3:
                return rows, None, "Insufficient temporal data points to establish a statistical forecast baseline (minimum 3 periods required).", []

            df = pd.DataFrame(rows)
            y = df["actual_value"].values
            n = len(y)
            x = np.arange(n)

            # Linear regression: y = m*x + c
            slope, intercept = np.polyfit(x, y, 1)

            # Generate forecast
            last_period = df["period"].iloc[-1]
            results = []
            for i, r in enumerate(rows):
                results.append({
                    "period": r["period"],
                    "actual_value": r["actual_value"],
                    "forecast_value": None,
                    "type": "Historical"
                })

            # Append future periods
            last_dt = pd.to_datetime(last_period + "-01")
            for step in range(1, periods_ahead + 1):
                future_dt = last_dt + pd.DateOffset(months=step)
                future_period = future_dt.strftime("%Y-%m")
                projected = max(round(float(slope * (n + step - 1) + intercept), 2), 0)
                results.append({
                    "period": future_period,
                    "actual_value": None,
                    "forecast_value": projected,
                    "type": "Forecast"
                })

            trend_direction = "upward growth" if slope > 0 else "downward contraction"
            growth_rate = round((slope / (y.mean() or 1)) * 100, 1)

            explanation = (
                f"### 📈 Predictive Forecast for `{metric_col}` over `{date_col}`\n\n"
                f"Statistical linear regression model fitted across {n} historical periods. "
                f"The trend indicates an **{trend_direction}** with an average period-over-period shift of "
                f"**${slope:,.2f}** ({growth_rate}% relative slope).\n\n"
                f"**Projected Next {periods_ahead} Periods:**\n"
            )

            for step in range(1, periods_ahead + 1):
                future_dt = last_dt + pd.DateOffset(months=step)
                future_p = future_dt.strftime("%Y-%m")
                proj = max(round(float(slope * (n + step - 1) + intercept), 2), 0)
                explanation += f"- **{future_p}:** ${proj:,.2f} projected\n"

            chart = ChartConfig(
                type=ChartType.LINE,
                title=f"Historical & Forecast Projection for {metric_col}",
                x_key="period",
                y_keys=["actual_value", "forecast_value"],
                x_label="Period (YYYY-MM)",
                y_label=metric_col,
                description=f"Linear trend forecast for the next {periods_ahead} periods."
            )

            insights = [
                f"Projected trend shows {trend_direction} ({growth_rate}% per period).",
                f"Baseline historical average: ${y.mean():,.2f}.",
                f"Next period projection: ${max(round(float(slope * n + intercept), 2), 0):,.2f}."
            ]

            return results, chart, explanation, insights

        except Exception as e:
            return [], None, f"Forecasting calculation error: {str(e)}", []

