{
  # TODO: tidy up
  description = "devon-service";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    let
      devonServerPackage = system:
        let
          pkgs = import nixpkgs { inherit system; };
          yarnBerry = pkgs.yarn-berry;
          pkgJson = builtins.fromJSON (builtins.readFile ./package.json);
          offlineCache = yarnBerry.fetchYarnBerryDeps {
            src = ./.;
            lockFile = ./yarn.lock;
            missingHashes = ./missing-hashes.json;
            hash = "sha256-Kl81/hJFzNKcs+0jfeO8vQcb2yRt3e2QUSpmVq9+9Os=";
          };
        in
        pkgs.stdenv.mkDerivation {
          pname = "devon-server";
          version = pkgJson.version;
          src = ./.;

          buildInputs = [ pkgs.nodejs yarnBerry yarnBerry.yarnBerryConfigHook ];
          nativeBuildInputs = [ pkgs.nodejs yarnBerry.yarnBerryConfigHook ];
          NODE_PATH = offlineCache;
          missingHashes = ./missing-hashes.json;
          offlineCache = offlineCache;

          env = {
            HOME = "/build";
            YARN_ENABLE_GLOBAL_CACHE = "false";
            YARN_ENABLE_TELEMETRY = "0";
          };

          buildPhase = ''
            yarn install --immutable
            yarn build
          '';

          installPhase = ''
            mkdir -p $out/app
            cp -r * $out/app
          '';
        };
    in
    flake-utils.lib.eachDefaultSystem
      (system: {
        packages.default = devonServerPackage system;
      }) // {
      nixosModules.devon-server = { config, pkgs, lib, ... }:
        let cfg = config.services.devon-server; in {
          options.services.devon-server = {
            enable = lib.mkEnableOption "Enable devon-server service";
            package = lib.mkOption {
              type = lib.types.package;
              default = devonServerPackage pkgs.system;
            };
            script = lib.mkOption {
              type = lib.types.str;
              default = "dist/main.js";
            };
            envFile = lib.mkOption {
              type = lib.types.path;
              default = null;
            };
          };

          config = lib.mkIf cfg.enable {
            systemd.services.devon-server = {
              description = "devon-server";
              after = [ "network.target" ];
              wantedBy = [ "multi-user.target" ];
              serviceConfig = {
                ExecStart = "${pkgs.nodejs}/bin/node ${cfg.package}/app/${cfg.script}";
                Restart = "always";
                WorkingDirectory = "${cfg.package}/app";
                EnvironmentFile = lib.mkIf (cfg.envFile != null) cfg.envFile;
              };
            };
          };
        };
    };
}
