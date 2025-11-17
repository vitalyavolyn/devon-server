{
  description = "devon-service";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem
      (system:
        let
          pkgs = import nixpkgs { inherit system; };
        in
        {
          packages.default = pkgs.stdenv.mkDerivation {
            pname = "devon-server";
            version = (builtins.fromJSON (builtins.readFile ./package.json)).version;
            src = ./.;
            buildInputs = [ pkgs.nodejs pkgs.yarn-berry ];
            installPhase = ''
              mkdir -p $out/app
              cp -r * $out/app
            '';
            buildPhase = ''
              yarn install --immutable
              yarn build
            '';
          };
        }) // {
      nixosModules.devon-server = { config, pkgs, lib, ... }:
        let
          cfg = config.services.devon-server;
        in
        {
          options.services.devon-server = {
            enable = lib.mkEnableOption "Enable devon-server service";
            package = lib.mkOption {
              type = lib.types.package;
              default = self.packages.${config.nixpkgs.system}.default;
            };
            envFile = lib.mkOption {
              type = lib.types.path;
              default = null;
            };
            script = lib.mkOption {
              type = lib.types.str;
              example = "dist/main.js";
            };
          };

          config = lib.mkIf cfg.enable {
            systemd.services.devon-server = {
              description = "devon-server";
              after = [ "network.target" ];
              wantedBy = [ "multi-user.target" ];
              serviceConfig = {
                EnvironmentFile = lib.mkIf (cfg.envFile != null) cfg.envFile;
                ExecStart = "${pkgs.nodejs}/bin/node ${cfg.package}/app/${cfg.script}";
                Restart = "always";
                WorkingDirectory = cfg.package + "/app";
              };
            };
          };
        };
    };
}
