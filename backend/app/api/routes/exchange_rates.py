import httpx
from fastapi import APIRouter, HTTPException, status

from app.schemas.exchange_rates import ExchangeRateDashboardRead
from app.services.exchange_rates import ExchangeRateScrapingError, fetch_exchange_rate_dashboard

router = APIRouter(prefix="/tipo-cambio", tags=["exchange-rates"])


@router.get(
    "/ventanilla",
    response_model=ExchangeRateDashboardRead,
    summary="Tipo de cambio de ventanilla del BCCR",
)
def read_exchange_rate_dashboard() -> ExchangeRateDashboardRead:
    try:
        return fetch_exchange_rate_dashboard()
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo consultar el sitio del BCCR.",
        ) from exc
    except ExchangeRateScrapingError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo interpretar la respuesta del BCCR.",
        ) from exc
