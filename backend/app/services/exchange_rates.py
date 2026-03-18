from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import UTC, datetime
from html import unescape

import httpx

from app.schemas.exchange_rates import (
    ExchangeRateDashboardRead,
    ExchangeRateEntryRead,
    ExchangeRateHighlightRead,
)

BCCR_EXCHANGE_RATES_URL = (
    "https://gee.bccr.fi.cr/IndicadoresEconomicos/Cuadros/frmConsultaTCVentanilla.aspx"
)

_ENTITY_TYPES = (
    "Bancos publicos",
    "Bancos privados",
    "Financieras",
    "Mutuales de Vivienda",
    "Cooperativas",
    "Casas de Cambio",
    "Puestos de Bolsa",
)

_ROW_PATTERN = re.compile(
    r"^(?P<label>.+?)\s+"
    r"(?P<buy>\d{1,3}(?:\.\d{3})*,\d{2})\s+"
    r"(?P<sell>\d{1,3}(?:\.\d{3})*,\d{2})\s+"
    r"(?P<spread>\d{1,3}(?:\.\d{3})*,\d{2})\s+"
    r"(?P<updated_at>\d{2}/\d{2}/\d{4}\s+\d{2}:\d{2}\s+[ap]\.m\.)$"
)


class ExchangeRateScrapingError(RuntimeError):
    pass


@dataclass(slots=True)
class ParsedExchangeRateEntry:
    entity_type: str
    entity: str
    buy_rate: float
    sell_rate: float
    spread: float
    updated_at: datetime


def _sanitize_html(raw_html: str) -> list[str]:
    html_without_scripts = re.sub(
        r"<script.*?</script>|<style.*?</style>",
        " ",
        raw_html,
        flags=re.IGNORECASE | re.DOTALL,
    )
    text = unescape(html_without_scripts).replace("\xa0", " ")
    text = re.sub(r"<[^>]+>", "\n", text)
    normalized_lines = [
        re.sub(r"\s+", " ", line).strip()
        for line in text.splitlines()
    ]
    return [line for line in normalized_lines if line]


def _normalize_label(value: str) -> str:
    translation_table = str.maketrans(
        {
            "á": "a",
            "é": "e",
            "í": "i",
            "ó": "o",
            "ú": "u",
            "Á": "A",
            "É": "E",
            "Í": "I",
            "Ó": "O",
            "Ú": "U",
            "°": "°",
        }
    )
    return value.translate(translation_table)


def _parse_decimal(value: str) -> float:
    return float(value.replace(".", "").replace(",", "."))


def _parse_timestamp(value: str) -> datetime:
    normalized = value.replace("a.m.", "AM").replace("p.m.", "PM")
    return datetime.strptime(normalized, "%d/%m/%Y %I:%M %p").replace(tzinfo=UTC)


def _extract_report_date(lines: list[str]) -> str:
    for line in lines:
        if re.search(r"\d{1,2} de [a-zA-Z]+ de \d{4}", line):
            return line
    raise ExchangeRateScrapingError("No se encontro la fecha del reporte del BCCR.")


def _extract_rows(lines: list[str]) -> list[str]:
    try:
        header_index = next(
            index
            for index, line in enumerate(lines)
            if "Tipo de Entidad" in line and "Entidad Autorizada" in line
        )
    except StopIteration as exc:
        raise ExchangeRateScrapingError("No se encontro el encabezado de la tabla del BCCR.") from exc

    try:
        footer_index = next(index for index, line in enumerate(lines) if line == "Enlaces")
    except StopIteration:
        footer_index = len(lines)

    return lines[header_index + 1 : footer_index]


def _parse_entries(lines: list[str]) -> list[ParsedExchangeRateEntry]:
    entries: list[ParsedExchangeRateEntry] = []
    current_entity_type = ""

    for raw_line in lines:
        line = _normalize_label(raw_line)
        match = _ROW_PATTERN.match(line)
        if not match:
            continue

        label = match.group("label").strip()
        entity_type = next(
            (candidate for candidate in _ENTITY_TYPES if label.startswith(candidate)),
            "",
        )

        if entity_type:
            entity = label[len(entity_type) :].strip()
            current_entity_type = entity_type
        else:
            entity_type = current_entity_type
            entity = label

        if not entity_type:
            continue

        entries.append(
            ParsedExchangeRateEntry(
                entity_type=entity_type,
                entity=entity,
                buy_rate=_parse_decimal(match.group("buy")),
                sell_rate=_parse_decimal(match.group("sell")),
                spread=_parse_decimal(match.group("spread")),
                updated_at=_parse_timestamp(match.group("updated_at")),
            )
        )

    if not entries:
        raise ExchangeRateScrapingError("No se pudieron extraer filas de tipo de cambio del BCCR.")

    return entries


def fetch_exchange_rate_dashboard() -> ExchangeRateDashboardRead:
    with httpx.Client(
        timeout=20.0,
        follow_redirects=True,
        headers={"User-Agent": "Elatilo/1.0 (+https://github.com/lkccomander/Estrutec)"},
    ) as client:
        response = client.get(BCCR_EXCHANGE_RATES_URL)
        response.raise_for_status()

    lines = _sanitize_html(response.text)
    report_date = _extract_report_date(lines)
    entries = _parse_entries(_extract_rows(lines))

    best_buy = max(entries, key=lambda entry: entry.buy_rate)
    best_sell = min(entries, key=lambda entry: entry.sell_rate)

    return ExchangeRateDashboardRead(
        source="Banco Central de Costa Rica",
        source_url=BCCR_EXCHANGE_RATES_URL,
        report_date=report_date,
        fetched_at=datetime.now(UTC),
        average_buy_rate=round(sum(entry.buy_rate for entry in entries) / len(entries), 4),
        average_sell_rate=round(sum(entry.sell_rate for entry in entries) / len(entries), 4),
        average_spread=round(sum(entry.spread for entry in entries) / len(entries), 4),
        best_buy=ExchangeRateHighlightRead(
            entity_type=best_buy.entity_type,
            entity=best_buy.entity,
            rate=best_buy.buy_rate,
            updated_at=best_buy.updated_at,
        ),
        best_sell=ExchangeRateHighlightRead(
            entity_type=best_sell.entity_type,
            entity=best_sell.entity,
            rate=best_sell.sell_rate,
            updated_at=best_sell.updated_at,
        ),
        entries=[
            ExchangeRateEntryRead(
                entity_type=entry.entity_type,
                entity=entry.entity,
                buy_rate=entry.buy_rate,
                sell_rate=entry.sell_rate,
                spread=entry.spread,
                updated_at=entry.updated_at,
            )
            for entry in sorted(entries, key=lambda entry: (entry.sell_rate, -entry.buy_rate, entry.entity))
        ],
    )
