## Description

Devon is my aggregator for tracking stuff.

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
