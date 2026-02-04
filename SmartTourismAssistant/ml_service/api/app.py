from fastapi import FastAPI
from pydantic import BaseModel
from services.predictor import predict_from_features

app = FastAPI(title="Crowd Prediction ML Service")

class FeatureInput(BaseModel):
    Ratings: float | None
    Distance: float | None
    Distance_km: float | None
    EntryFeeFlag: int | None
    PopularityScore: float | None
    Temperature: float | None
    Rainfall: float | None
    Humidity: float | None
    HotelOccupancyRate: float | None
    TrafficIndex: float | None
    SocialMediaMentions: int | None
    HolidayImpact: int | None
    PlaceType: str | None
    BestWeatherConditions: str | None
    BestDay: str | None
    BestMonth: str | None
    BestSeason: str | None

@app.post("/predict")
def predict(features: FeatureInput):
    return predict_from_features(features.dict())
