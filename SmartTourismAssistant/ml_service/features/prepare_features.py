import pandas as pd

def prepare_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Prepare features for ML by:
    - Dropping identifier/text columns
    - One-hot encoding categorical columns
    - Ensuring final dataframe is fully numeric
    """

    # Explicitly drop known non-ML columns
    drop_cols = [
        "City",
        "Place",
        "Place_desc",
        "Distance",          # contains strings like "5 km from city center"
        "Unnamed: 16",
        "Unnamed: 21"
    ]

    df = df.drop(columns=[c for c in drop_cols if c in df.columns])

    # Categorical columns to encode
    categorical_cols = [
        "PlaceType",
        "BestWeatherConditions",
        "BestDay",
        "BestMonth",
        "BestSeason"
    ]

    df = pd.get_dummies(df, columns=[c for c in categorical_cols if c in df.columns])

    # FINAL SAFETY NET:
    # Keep only numeric columns (drop any leftover strings silently)
    df = df.select_dtypes(include=["number"])

    return df
