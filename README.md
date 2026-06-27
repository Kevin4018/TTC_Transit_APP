# Milk Transit

This project is a TTC transit prototype with:

- Vite/React frontend
- Express API server
- local TTC GTFS SQLite database for stops and scheduled arrivals
- OpenTripPlanner 2.8 for real walking, driving, biking, TTC routing, and optional GTA/GTHA cross-agency routing
- configurable official GTFS feeds for GO Transit, Oakville Transit, MiWay, YRT/Viva, Brampton Transit, Durham Region Transit, Burlington Transit, HSR, Milton Transit, and TTC
- live place search through a geocoder for arbitrary destinations

## Current Features

- **TTC map and stop exploration**: shows nearby TTC stops on an interactive map, highlights the selected stop, and supports switching route directions.
- **Arrival prediction and delay explanation**: estimates TTC arrivals from GTFS data and explains schedule, weather, traffic, accidents, construction, events, holidays, and other delay offsets.
- **Destination search and recommendations**: supports AI-style search for TTC stops, addresses, landmarks, tourist attractions, restaurants, parks, and shopping destinations. The search page also shows location-aware recommendations and recent search history.
- **Trip planning and navigation**: supports destination routing by transit, walking, driving, and biking through OpenTripPlanner when available, with route steps, ETA, destination pins, and map centering for selected destinations.
- **Account and memory support**: users can sign up, log in, log out, and keep recent search history locally for faster repeated searches.
- **Milk Transit assistant**: answers TTC and GTA transit questions about arrivals, stops, route delays, nearby options, traffic, weather, construction, events, holidays, crowding, route terminals, and navigation.
- **Trip-planning chatbot support**: understands natural language trip requests such as planning a trip tomorrow to a destination, keeps destination context for follow-up questions, and uses Gemini for intent classification and answer verification when configured.
- **Toronto guide chatbot support**: answers broad Toronto itinerary and recommendation questions, including attractions, food, restaurants, parks, shopping, rainy-day plans, family-friendly ideas, budget plans, and follow-up adjustments.
- **Multilingual chatbot responses**: replies in the user's language for English, Chinese, and French questions, and formats longer answers with readable line breaks and numbered lists.
- **Events and holidays awareness**: considers Toronto sports games, concerts, large entertainment events, Ontario/Canadian public holidays, and holiday greetings when answering questions or explaining prediction factors.

## Prerequisites

- Node.js 20+
- npm
- Java 21+ for OpenTripPlanner

Install dependencies once:

```bash
npm install
```

Create your local env file:

```bash
cp .env.example .env
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

## Data Files

The app expects local data under `data/`.

Current expected files:

```text
data/
  gtfs.sqlite
  source/
    Complete GTFS.zip
  otp/
    otp-shaded-2.8.1.jar
    toronto.osm.pbf
    *.gtfs.zip
  construction/
    Road-reconstruction-program.geojson
```

If `data/gtfs.sqlite` is missing but the GTFS zip is available, build it with:

```bash
npm run setup:data
```

Large database/data files are local runtime assets and may not be committed to Git.

For GTA/GTHA routing, copy the feed template and fill it with official GTFS zip URLs:

```bash
cp config/gtha-gtfs-feeds.example.json config/gtha-gtfs-feeds.json
```

Enable only feeds with real official URLs, then download them:

```bash
npm run download:gtha-gtfs
```

The script writes GTFS zips into `data/otp`, where OTP can build them into one graph together with the OSM file. It does not create mock transit data.

To enable chatbot schedule lookups for the regional agencies in `config/regional-transit-feeds.json`, build the local regional arrivals database after downloading feeds:

```bash
npm run import:regional-gtfs
```

This creates `data/regional-arrivals.sqlite` from GO Transit / UP Express, MiWay, YRT/Viva, Brampton Transit, and any other enabled non-TTC feeds. These answers are static GTFS schedule estimates; TTC remains the only agency with GTFS-Realtime arrival updates unless another live feed is added.

## Environment

Important `.env` values:

```env
PORT=3001
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash
GTFS_DB_PATH=./data/gtfs.sqlite
TTC_GTFS_RT_TRIP_UPDATES_URL=https://gtfsrt.ttc.ca/trips/update?format=text
OTP_BASE_URL=http://localhost:8080
OTP_PLAN_DATETIME=match-weekday
OTP_GTFS_SERVICE_START_DATE=2026-06-21
ROUTING_PROVIDER=otp
GTHA_GTFS_FEEDS_FILE=./config/gtha-gtfs-feeds.json
GTHA_GTFS_OUTPUT_DIR=./data/otp
REGIONAL_TRANSIT_FEEDS_FILE=./config/regional-transit-feeds.json
REGIONAL_TRANSIT_ARRIVALS_DB_PATH=./data/regional-arrivals.sqlite
TICKETMASTER_API_KEY=optional_ticketmaster_discovery_api_key
TOMTOM_API_KEY=optional_tomtom_traffic_api_key
GOOGLE_MAPS_API_KEY=optional_backend_google_maps_platform_key
```

`GEMINI_API_KEY` is used only by the Express API server for chatbot intent classification and answer verification/correction. Do not put this key in a `VITE_` variable, because Vite exposes those values to the browser bundle.

`OTP_PLAN_DATETIME=match-weekday` maps the current clock time to the same weekday inside the GTFS feed calendar. This avoids failed transit searches when today's real date is outside the downloaded TTC feed's service dates.

`TTC_GTFS_RT_TRIP_UPDATES_URL` enables real TTC GTFS-Realtime trip updates. Arrival predictions use this feed first when it contains a matching route and stop, then fall back to static GTFS schedules when live data is unavailable.

`ROUTING_PROVIDER=otp` keeps routing on self-hosted OpenTripPlanner. This is the recommended no-Google, no-paid-routing setup.

`GTHA_GTFS_FEEDS_FILE` points to your local list of official GTFS feed URLs. Use it with `npm run download:gtha-gtfs` to download real agency feeds into the OTP graph directory. The app will route across agencies only after OTP is rebuilt with those feeds.

`REGIONAL_TRANSIT_ARRIVALS_DB_PATH` points to the local static schedule database used by the chatbot for non-TTC regional ETA questions, such as MiWay, YRT/Viva, GO Transit / UP Express, and Brampton Transit. Rebuild it with `npm run import:regional-gtfs` after refreshing regional GTFS zips.

`GOOGLE_MAPS_API_KEY` is a backend-only key used by the local information retrieval layer for Google Places and Google Routes lookups, such as nearby services, ticket-info leads, distance-ranked businesses, and drive-time estimates. It is also optional for paid Google routing if you explicitly set `ROUTING_PROVIDER=google` or `ROUTING_PROVIDER=auto`. Do not put this key in a `VITE_` variable.

`TICKETMASTER_API_KEY` enables live Toronto sports, concert, festival, and entertainment event lookups through the Ticketmaster Discovery API. If it is not set, the app falls back to local major-venue pressure estimates for Toronto.

`TOMTOM_API_KEY` enables live Toronto traffic flow and incident lookups through the TomTom Traffic API. The prediction algorithm uses live road speed, free-flow speed, road closure, accident, congestion, and roadwork signals when available. If it is not set or the API request fails, the app falls back to the local time-of-day, route-demand, and downtown-pressure traffic estimate.

Holiday awareness uses the public Nager.Date holiday API for Canadian/Ontario public holidays. If that request fails, the app falls back to a small local set of fixed-date Ontario holidays.

Restart `npm run server` after changing `.env`.

## Start OpenTripPlanner

Open a terminal from the project root and run:

```bash
npm run otp:build:gtha
```

On Windows PowerShell:

```powershell
npm run otp:build:gtha
```

Keep this terminal running. OTP is ready when you see a log line like:

```text
Grizzly server running
```

The Express API calls OTP at:

```text
http://localhost:8080/otp/gtfs/v1
```

If OTP is not running, navigation routes return `Navigation unavailable.`

## Start The App

Use three terminals:

1. OpenTripPlanner:

```bash
npm run otp:build:gtha
```

2. Express API:

```bash
npm run server
```

3. Vite frontend:

```bash
npm run dev
```

For local network testing:

```bash
npm run dev -- --host 0.0.0.0
```

Then open the Vite URL shown in the frontend terminal, usually:

```text
http://localhost:5173
```

## Common Issues

- Search or navigation changes do not show up: restart `npm run server`.
- OTP says no transit route: confirm the Java OTP terminal is still running on port `8080`.
- Oakville/Mississauga/York/Durham/Hamilton routes are missing: confirm their official GTFS zips are enabled in `config/gtha-gtfs-feeds.json`, rerun `npm run download:gtha-gtfs`, and rebuild OTP.
- Transit only works on one date: keep `OTP_PLAN_DATETIME=match-weekday`.
- Browser location does not show: allow location permission for the local site in the browser.
- Arbitrary destination search needs network access because it uses an online geocoder.
