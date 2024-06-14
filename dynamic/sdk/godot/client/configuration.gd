class_name BackendConfiguration
## Backend configuration.

## Endpoint to send requests to.
var endpoint: String = "http://localhost:6420"

## The version of the game.
var game_version: String = "unknown"

func _init():
	self.endpoint = _get_backend_endpoint()
	BackendLogger.log('Endpoint: %s' % self.endpoint)
	self.game_version = _get_game_version()
	BackendLogger.log('Game version: %s' % self.game_version)

## Path of the configuration file bundled with a game from Rivet.
##
## This file is generated on deploy.
const RIVET_DEPLOYED_CONFIGURATION_FILE_PATH: String = "res://.rivet_config.gd"

## Path of the configuration file when developing locally.
##
## This file is usually gitignored.
const RIVET_LOCAL_CONFIGURATION_FILE_PATH: String = "res://.rivet/config.gd"

## Dynamically loads the configuration file with the backend endpoint.
func _get_configuration():
	if FileAccess.file_exists(RIVET_DEPLOYED_CONFIGURATION_FILE_PATH):
		var deployed_config_file = ResourceLoader.load(RIVET_DEPLOYED_CONFIGURATION_FILE_PATH)
		if deployed_config_file and 'new' in deployed_config_file:
			BackendLogger.log('Using endpoint from deployed config')
			return deployed_config_file.new()
	
	if FileAccess.file_exists(RIVET_LOCAL_CONFIGURATION_FILE_PATH):
		var deployed_config_file = ResourceLoader.load(RIVET_LOCAL_CONFIGURATION_FILE_PATH)
		if deployed_config_file and 'new' in deployed_config_file:
			BackendLogger.log('Using endpoint from local config')
			return deployed_config_file.new()

	return null

## Derive the backend endpoint in order of priority:
## - Environment variable (if running from deployed server)
## - Configuration (if running in a client)
## - Fallback to localhost
func _get_backend_endpoint():
	# Use environment variable
	var url_env = OS.get_environment("BACKEND_ENDPOINT")
	if url_env:
		BackendLogger.log('Using endpoint from env')
		return url_env

	# Use configuration shipped with game
	var config = _get_configuration()
	if config:
		return config.backend_endpoint

	# Fallback
	push_warning("Could not find backend endpoint, falling back to localhost:6420")
	BackendLogger.log('Using default endpoint')
	return "http://localhost:6420"

## Derive the backend endpoint in order of priority:
## - Environment variable (if running from deployed server)
## - Configuration (if running in a client)
## - Fallback to localhost
func _get_game_version():
	# Use environment variable
	var url_env = OS.get_environment("GAME_VERSION")
	if url_env:
		BackendLogger.log('Using game version from env')
		return url_env

	# Use configuration shipped with game
	var config = _get_configuration()
	if config:
		return config.game_version

	# Fallback
	push_warning("Could not find game version endpoint")
	return "unknown"

