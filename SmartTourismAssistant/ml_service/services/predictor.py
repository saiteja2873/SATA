from models.predict import predict_crowd_level

DEFAULTS = {
    "Ratings": 4.0,
    "Distance": 10,
    "Distance_km": 5.0,
    "EntryFeeFlag": 1,
    "PopularityScore": 0.6,
    "Temperature": 28,
    "Rainfall": 1,
    "Humidity": 60,
    "HotelOccupancyRate": 0.65,
    "TrafficIndex": 0.6,
    "SocialMediaMentions": 800,
    "HolidayImpact": 0,
}

def complete_features(features: dict) -> dict:
    completed = features.copy()

    for key, default in DEFAULTS.items():
        if completed.get(key) is None:
            completed[key] = default

    return completed

def predict_from_features(features: dict):
    completed = complete_features(features)
    crowd = predict_crowd_level(completed)

    return {
        "features_used": completed,
        "crowd_level": crowd
    }
