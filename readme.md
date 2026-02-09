# bahn.guru

[Bahn-Preiskalender](https://bahn.guru) website: Find the cheapest "Sparpreise" (low-cost tickets) for the next month.

[![License](https://img.shields.io/github/license/juliuste/bahn.guru.svg?style=flat)](license)

<p align="center">
  <img src="https://github.com/EloneMusk/bahn.guru.new/blob/main/assets/screenshot.png" alt="Preview">
</p>

## See also

- [travel-price-map](https://github.com/juliuste/travel-price-map/) – Map of low-cost tickets ("Sparpreise") for several european cities
- [db-vendo-client](https://github.com/public-transport/db-vendo-client/) – Client for the current Deutsche Bahn APIs
- [link.bahn.guru](https://github.com/juliuste/link.bahn.guru) - Direct deep links to the [Deutsche Bahn shop](https://www.bahn.de).

## Configuration

This fork uses `db-vendo-client` and supports multiple DB API profiles. Configuration is loaded from `.env` using `dotenv`.

Environment variables:

- `DB_PROFILE` – one of `db`, `dbnav`, `dbweb` (default: `db`)
- `DB_USER_AGENT` – a descriptive user agent string; recommended to include an email or project URL (default: `bahn.guru-v2`)
- `BESTPRICE` – set to `1` to use the `tagesbestpreis` endpoint (default: `1`, improves price availability)
- `ALLOW_PRICELESS` – set to `1` to return journeys even if no price is available (debug)
- `ANALYTICS` – set to `true` to enable Umami analytics
- `ANALYTICS_ID` – your Umami website ID (required if `ANALYTICS=true`)

Example `.env`:

```
DB_PROFILE=db
DB_USER_AGENT=bahn.guru-v2
BESTPRICE=1
ALLOW_PRICELESS=0
ANALYTICS=false
ANALYTICS_ID=
```

## Contributing

If you found a bug or want to propose a feature, feel free to visit [the issues page](https://github.com/juliuste/bahn.guru/issues).
