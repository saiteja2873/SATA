from models.predict import predict_crowd_level

def get_crowd_estimation(features: dict):
    level = predict_crowd_level(features)
    return {
        "crowd_level": level,
        "type": "predicted",
        "model": "RandomForestClassifier"
    }
