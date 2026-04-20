## Description

Devon is my aggregator for tracking stuff. Hugely inspired by [KrauseFx/FxLifeSheet](https://github.com/KrauseFx/FxLifeSheet)

## Project setup

```bash
$ yarn install
```

## Compile and run the project

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

Sample .env:

```
DB_URI=mongodb://localhost/devon
PORT=3000

# Telegram is the one thing that isn't stored in the configs collection. I'm fine with this.
TELEGRAM_TOKEN=
TELEGRAM_CHAT_ID=
```

Initialize integrations:

```bash
# Myshows
$ yarn ts-node src/main.cli.ts init myshows username password

# Letterboxd
$ yarn ts-node src/main.cli.ts init boxd username ../path-to-export

# Last.fm
$ yarn ts-node src/main.cli.ts init lastfm username api-key

# Retroachievements
$ yarn ts-node src/main.cli.ts init ra userrname-or-ulid api-key

# Wakatime
$ yarn ts-node src/main.cli.ts init wakatime api-key

# NYT Wordle (get cookies string by executing `document.cookie`)
$ yarn ts-node src/main.cli.ts init wordle cookie

# Homeassistant for location, steps, and sleep
# base url, access key, geocoded location sensor, optional steps sensor, optional sleep sensor
$ yarn ts-node src/main.cli.ts init hass https://hass.example.com long-lived-access-token sensor.geocoded_location sensor.device_daily_steps sensor.device_sleep_duration
```

After location appears, devon also starts to pull wttr.in for min/max weather. Town name comes from the HA geocoded location sensor.

Steps and sleep duration are synced automatically from HA every hour.
