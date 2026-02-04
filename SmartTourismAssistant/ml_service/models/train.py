import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from features.prepare_features import prepare_features
from utils.metrics import evaluate

DATA_PATH = "data/Places_with_final_crowdlevel.csv"
TARGET = "CrowdLevel"

# Load dataset
df = pd.read_csv(DATA_PATH)

# Safety check
if TARGET not in df.columns:
    raise ValueError(f"Target column '{TARGET}' not found. Available columns: {df.columns.tolist()}")

# Prepare features
X = prepare_features(df.drop(columns=[TARGET]))
y = df[TARGET]

# 🚫 Remove leaky features (to prevent data leakage)
LEAKY_FEATURES = [
    "PopularityScore",
    "HotelOccupancyRate",
    "TrafficIndex",
    "SocialMediaMentions"
]

X = X.drop(columns=[c for c in LEAKY_FEATURES if c in X.columns])


# Encode labels
label_encoder = LabelEncoder()
y_encoded = label_encoder.fit_transform(y)

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y_encoded,
    test_size=0.2,
    random_state=42,
)

print("Non-numeric columns (should be empty):")
print(X.select_dtypes(exclude=["number"]).columns.tolist())

# Train model
model = RandomForestClassifier(
    n_estimators=300,
    max_depth=18,
    random_state=42,
    n_jobs=-1
)

model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
evaluate(y_test, y_pred)

# Save artifacts
joblib.dump(model, "models/crowd_classifier.pkl")
joblib.dump(label_encoder, "models/label_encoder.pkl")
joblib.dump(X.columns.tolist(), "models/feature_columns.pkl")

print("✅ Model trained and saved successfully.")
