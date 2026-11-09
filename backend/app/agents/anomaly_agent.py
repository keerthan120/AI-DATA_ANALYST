from typing import Any
import numpy as np
import pandas as pd
from scipy import stats
from sklearn.ensemble import IsolationForest
from app.models.schemas import AnomalyRecord

class AnomalyDetectionAgent:
    @staticmethod
    def detect_anomalies(
        df: pd.DataFrame,
        numeric_columns: list[str] = [],
        method: str = "auto",
        z_threshold: float = 2.5,
        max_anomalies: int = 15
    ) -> list[AnomalyRecord]:
        """
        Detects anomalies in numeric columns using statistical and machine learning methods.
        Returns a list of structured AnomalyRecord items with clear explanations.
        """
        if df.empty:
            return []

        # If no numeric columns specified, auto-detect all numeric columns
        if not numeric_columns:
            numeric_columns = df.select_dtypes(include=[np.number]).columns.tolist()

        if not numeric_columns:
            return []

        anomalies: list[AnomalyRecord] = []

        # 1. IQR-based Detection (Robust Outliers)
        for col in numeric_columns:
            series = df[col].dropna()
            if len(series) < 5 or series.nunique() <= 1:
                continue

            q25, q75 = np.percentile(series, 25), np.percentile(series, 75)
            iqr = q75 - q25
            lower_bound = q25 - (1.5 * iqr)
            upper_bound = q75 + (1.5 * iqr)
            mean_val = series.mean()
            std_val = series.std() if series.std() > 0 else 1.0

            outliers = df[(df[col] < lower_bound) | (df[col] > upper_bound)]
            for idx, row in outliers.iterrows():
                val = row[col]
                z = round((val - mean_val) / std_val, 2)
                
                if val > upper_bound:
                    reason = (
                        f"Value {val} is an upper outlier exceeding upper bound {round(upper_bound, 2)} "
                        f"(Mean: {round(mean_val, 2)}, Z-Score: +{z})."
                    )
                else:
                    reason = (
                        f"Value {val} is a lower outlier falling below lower bound {round(lower_bound, 2)} "
                        f"(Mean: {round(mean_val, 2)}, Z-Score: {z})."
                    )

                anomalies.append(AnomalyRecord(
                    record_index=int(idx),
                    column_name=col,
                    value=val,
                    score=abs(z),
                    method="IQR / Z-Score",
                    explanation=reason
                ))

        # 2. Multi-column Isolation Forest (if >= 2 numeric columns and auto or isolation_forest)
        if len(numeric_columns) >= 2 and (method in ["auto", "isolation_forest"]) and len(df) >= 20:
            try:
                sub_df = df[numeric_columns].fillna(df[numeric_columns].median())
                iso = IsolationForest(contamination=0.03, random_state=42)
                preds = iso.fit_predict(sub_df)
                scores = iso.decision_function(sub_df)

                iso_outliers_idx = np.where(preds == -1)[0]
                for idx in iso_outliers_idx:
                    row = df.iloc[idx]
                    score = round(float(-scores[idx]), 3)
                    # Check if already captured by IQR
                    already_captured = any(a.record_index == int(idx) for a in anomalies)
                    if not already_captured:
                        cols_summary = ", ".join([f"{c}={row[c]}" for c in numeric_columns[:3]])
                        anomalies.append(AnomalyRecord(
                            record_index=int(idx),
                            column_name="multi_column",
                            value=f"({cols_summary})",
                            score=score,
                            method="Isolation Forest",
                            explanation=f"Multivariate outlier detected across {numeric_columns[:3]} with anomaly score {score}."
                        ))
            except Exception:
                pass

        # Sort anomalies by score descending and limit
        anomalies.sort(key=lambda x: x.score, reverse=True)
        return anomalies[:max_anomalies]
