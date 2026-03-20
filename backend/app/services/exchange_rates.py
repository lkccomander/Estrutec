from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import UTC, datetime
from html.parser import HTMLParser
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

_TIMESTAMP_PATTERN = re.compile(r"\d{2}/\d{2}/\d{4}\s+\d{2}:\d{2}\s+[ap]\.m\.", re.IGNORECASE)


class _BccrTableParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.rows: list[list[str]] = []
        self._current_row: list[str] | None = None
        self._current_cell: list[str] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "tr":
            self._current_row = []
        elif tag in {"td", "th"} and self._current_row is not None:
            self._current_cell = []
        elif tag == "br" and self._current_cell is not None:
            self._current_cell.append(" ")

    def handle_endtag(self, tag: str) -> None:
        if tag in {"td", "th"} and self._current_row is not None and self._current_cell is not None:
            cell_text = re.sub(r"\s+", " ", "".join(self._current_cell)).strip()
            self._current_row.append(cell_text)
            self._current_cell = None
        elif tag == "tr" and self._current_row is not None:
            normalized_row = [cell for cell in self._current_row if cell]
            if normalized_row:
                self.rows.append(normalized_row)
            self._current_row = None

    def handle_data(self, data: str) -> None:
        if self._current_cell is not None:
            self._current_cell.append(unescape(data))


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


def _merge_entries(*entry_groups: list[ParsedExchangeRateEntry]) -> list[ParsedExchangeRateEntry]:
    merged: dict[tuple[str, str], ParsedExchangeRateEntry] = {}

    for entries in entry_groups:
        for entry in entries:
            key = (entry.entity_type, entry.entity)
            existing = merged.get(key)
            if existing is None or entry.updated_at >= existing.updated_at:
                merged[key] = entry

    if not merged:
        raise ExchangeRateScrapingError("No se pudieron extraer filas de tipo de cambio del BCCR.")

    return list(merged.values())


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


def _extract_table_rows(raw_html: str) -> list[list[str]]:
    parser = _BccrTableParser()
    parser.feed(raw_html)
    parser.close()
    return parser.rows


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


def _parse_entries_from_table(rows: list[list[str]]) -> list[ParsedExchangeRateEntry]:
    entries: list[ParsedExchangeRateEntry] = []
    current_entity_type = ""

    header_found = False
    for row in rows:
        normalized_first_cell = _normalize_label(row[0]) if row else ""
        if not header_found:
            if any("Tipo de Entidad" in cell for cell in row) and any("Entidad Autorizada" in cell for cell in row):
                header_found = True
            continue

        if normalized_first_cell == "Enlaces":
            break

        normalized_row = row
        if len(row) == 5 and current_entity_type:
            normalized_row = [current_entity_type, *row]

        if len(normalized_row) < 6:
            continue

        entity_type_cell, entity_cell, buy_value, sell_value, spread_value, updated_at_value = normalized_row[:6]
        entity_type = _normalize_label(entity_type_cell).strip() or current_entity_type
        entity = entity_cell.strip()

        if entity_type not in _ENTITY_TYPES or not entity or not _TIMESTAMP_PATTERN.search(updated_at_value):
            continue

        current_entity_type = entity_type
        entries.append(
            ParsedExchangeRateEntry(
                entity_type=entity_type,
                entity=entity,
                buy_rate=_parse_decimal(buy_value),
                sell_rate=_parse_decimal(sell_value),
                spread=_parse_decimal(spread_value),
                updated_at=_parse_timestamp(updated_at_value),
            )
        )

    if not entries:
        raise ExchangeRateScrapingError("No se pudieron extraer filas de tipo de cambio del BCCR.")

    return entries


def _parse_entries_from_lines(lines: list[str]) -> list[ParsedExchangeRateEntry]:
    entries: list[ParsedExchangeRateEntry] = []
    current_entity_type = ""

    for raw_line in lines:
        line = _normalize_label(raw_line)
        timestamp_match = _TIMESTAMP_PATTERN.search(line)
        if not timestamp_match:
            continue

        updated_at_value = timestamp_match.group(0)
        prefix = line[: timestamp_match.start()].strip()
        numeric_parts = re.findall(r"\d{1,3}(?:\.\d{3})*,\d{2}", prefix)
        if len(numeric_parts) < 3:
            continue

        buy_value, sell_value, spread_value = numeric_parts[-3:]
        label = prefix[: prefix.rfind(buy_value)].strip()
        entity_type = next(
            (candidate for candidate in _ENTITY_TYPES if label.startswith(candidate)),
            current_entity_type,
        )
        entity = label[len(entity_type) :].strip() if label.startswith(entity_type) else label

        if not entity_type or not entity:
            continue

        current_entity_type = entity_type
        entries.append(
            ParsedExchangeRateEntry(
                entity_type=entity_type,
                entity=entity,
                buy_rate=_parse_decimal(buy_value),
                sell_rate=_parse_decimal(sell_value),
                spread=_parse_decimal(spread_value),
                updated_at=_parse_timestamp(updated_at_value),
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
    table_rows = _extract_table_rows(response.text)

    table_entries: list[ParsedExchangeRateEntry] = []
    line_entries: list[ParsedExchangeRateEntry] = []

    try:
        table_entries = _parse_entries_from_table(table_rows)
    except ExchangeRateScrapingError:
        table_entries = []

    try:
        line_entries = _parse_entries_from_lines(lines)
    except ExchangeRateScrapingError:
        line_entries = []

    entries = _merge_entries(table_entries, line_entries)

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
