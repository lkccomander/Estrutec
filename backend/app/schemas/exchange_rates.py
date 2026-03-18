from datetime import datetime

from pydantic import BaseModel


class ExchangeRateEntryRead(BaseModel):
    entity_type: str
    entity: str
    buy_rate: float
    sell_rate: float
    spread: float
    updated_at: datetime


class ExchangeRateHighlightRead(BaseModel):
    entity_type: str
    entity: str
    rate: float
    updated_at: datetime


class ExchangeRateDashboardRead(BaseModel):
    source: str
    source_url: str
    report_date: str
    fetched_at: datetime
    average_buy_rate: float
    average_sell_rate: float
    average_spread: float
    best_buy: ExchangeRateHighlightRead
    best_sell: ExchangeRateHighlightRead
    entries: list[ExchangeRateEntryRead]
