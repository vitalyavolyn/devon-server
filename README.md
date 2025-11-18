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

# Homeassistant for updating location
# base url, access key and device name
$ yarn ts-node src/main.cli.ts init hass https://hass.example.com long-lived-access-token device_tracker.my_iphone
```

After location appears (via homeassistant, or, someday, telegram), devon also starts to pull wttr.in for min/max weather and nearest area name.

I also use an Apple Shortcut on my phone once a day to track sleep time and daily steps.
