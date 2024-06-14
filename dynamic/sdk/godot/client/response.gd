extends RefCounted
class_name BackendResponse
## A response from the server. Contains the result, response code, headers, and body.
## The body is a dictionary of the JSON response.

enum Result {
	OK = 0,
	BAD_REQUEST = 1,
	INTERNAL_ERROR = 2,
	UNKNOWN_RESPONSE_CODE = 3,
	HTTP_ERROR = 4,
	JSON_PARSE_ERROR = 5,
	UNKNOWN = 6
}

var result: Result:
	get:
		if http_status != HTTPClient.Status.STATUS_DISCONNECTED:
			return Result.HTTP_ERROR
		elif response_code >= 500 and response_code < 600:
			return Result.INTERNAL_ERROR
		elif response_code >= 400 and response_code < 500:
			return Result.BAD_REQUEST
		elif response_code == 200 and response_code < 500:
			if body != null:
				return Result.OK
			else:
				return Result.JSON_PARSE_ERROR
		elif response_code > 0:
			return Result.UNKNOWN_RESPONSE_CODE
		else:
			return Result.UNKNOWN

## Low-level HTTP response status cdoe.
var http_status: HTTPClient.Status

## HTTP status code from response.
var response_code: HTTPClient.ResponseCode

## The headers from the server.
var headers: PackedStringArray

## The raw body of the response.
var body_raw: PackedByteArray

## The parsed JSON body of the response.
##
## Will be null if failed to parse.
var body: Variant

func _init(http_status: int, response_code: int, headers: PackedStringArray, response_body: PackedByteArray) -> void:
	self.http_status = http_status
	self.response_code = response_code
	self.headers = headers
	
	body_raw = response_body
	var json = JSON.new()
	var error = json.parse(response_body.get_string_from_utf8())
	if error == OK:
		body = json.get_data()

func is_ok() -> bool:
	return self.result == Result.OK

func is_error() -> bool:
	return !self.is_ok()

func _to_string() -> String:
	return "BackendResponse [Result: %s, HTTP: %s, Response: %s, Body: %s]" % [
		Result.keys()[result],
		http_status,
		response_code,
		body_raw.slice(0, 128).get_string_from_ascii()
	]

