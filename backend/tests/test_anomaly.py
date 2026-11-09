import pandas as pd
import numpy as np
from app.agents.anomaly_agent import AnomalyDetectionAgent

def test_anomaly_detection_iqr_and_zscore():
    # Normal distribution with 1 extreme outlier
    data = [100.0, 102.0, 98.0, 105.0, 101.0, 99.0, 103.0, 97.0, 104.0, 10000.0]
    df = pd.DataFrame({"amount": data})

    anomalies = AnomalyDetectionAgent.detect_anomalies(df, numeric_columns=["amount"])
    assert len(anomalies) > 0
    # Outlier at index 9 with value 10000.0 should be detected
    top_anomaly = anomalies[0]
    assert top_anomaly.record_index == 9
    assert top_anomaly.value == 10000.0
    assert "upper outlier" in top_anomaly.explanation.lower()

