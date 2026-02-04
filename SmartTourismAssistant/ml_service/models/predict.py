import joblib
import pandas as pd

model = joblib.load("models/crowd_classifier.pkl")
label_encoder = joblib.load("models/label_encoder.pkl")
feature_columns = joblib.load("models/feature_columns.pkl")

def predict_crowd_level(input_features: dict) -> str:
    df = pd.DataFrame([input_features])

    # One-hot encode input
    df = pd.get_dummies(df)

    # Align columns with training
    df = df.reindex(columns=feature_columns, fill_value=0)

    prediction = model.predict(df)
    return label_encoder.inverse_transform(prediction)[0]
