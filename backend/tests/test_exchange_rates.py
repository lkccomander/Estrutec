from datetime import UTC, datetime

from app.services.exchange_rates import ParsedExchangeRateEntry, _merge_entries, _parse_entries_from_table


def test_merge_entries_preserves_missing_entities_from_secondary_source() -> None:
    updated_at = datetime(2026, 3, 19, 12, 0, tzinfo=UTC)

    table_entries = [
        ParsedExchangeRateEntry(
            entity_type="Bancos privados",
            entity="Banco BAC San Jose S.A.",
            buy_rate=463.0,
            sell_rate=477.0,
            spread=14.0,
            updated_at=updated_at,
        ),
    ]

    line_entries = [
        ParsedExchangeRateEntry(
            entity_type="Bancos privados",
            entity="Banco Davivienda (Costa Rica) S.A",
            buy_rate=461.0,
            sell_rate=479.0,
            spread=18.0,
            updated_at=updated_at,
        ),
        ParsedExchangeRateEntry(
            entity_type="Casas de Cambio",
            entity="ARI Casa de Cambio Internacional S.A.",
            buy_rate=466.56,
            sell_rate=472.43,
            spread=5.87,
            updated_at=updated_at,
        ),
    ]

    merged = _merge_entries(table_entries, line_entries)
    merged_names = {entry.entity for entry in merged}

    assert "Banco Davivienda (Costa Rica) S.A" in merged_names
    assert "ARI Casa de Cambio Internacional S.A." in merged_names


def test_parse_entries_from_table_supports_rows_without_repeated_entity_type() -> None:
    rows = [
        [
            "Tipo de Entidad",
            "Entidad Autorizada",
            "Compra",
            "Venta",
            "Diferencial Cambiario",
            "Ultima Actualizacion",
        ],
        [
            "Bancos privados",
            "Banco BAC San Jose S.A.",
            "463,00",
            "477,00",
            "14,00",
            "27/02/2026 05:36 p.m.",
        ],
        [
            "Banco Davivienda (Costa Rica) S.A",
            "461,00",
            "479,00",
            "18,00",
            "27/02/2026 09:10 a.m.",
        ],
        [
            "Casas de Cambio",
            "Airpak Casa de Cambio",
            "468,00",
            "485,00",
            "17,00",
            "27/02/2026 10:36 a.m.",
        ],
        [
            "ARI Casa de Cambio Internacional S.A.",
            "466,56",
            "472,43",
            "5,87",
            "28/02/2026 07:22 a.m.",
        ],
    ]

    entries = _parse_entries_from_table(rows)
    names = {entry.entity for entry in entries}

    assert "Banco Davivienda (Costa Rica) S.A" in names
    assert "ARI Casa de Cambio Internacional S.A." in names
