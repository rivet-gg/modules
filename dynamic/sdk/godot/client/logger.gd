class_name BackendLogger

static func log(args):
	print("[Backend] ", args)

static func warning(args):
	print("[Backend] ", args)
	push_warning("[Backend] ", args)

static func error(args):
	print("[Backend] ", args)
	push_error("[Backend] ", args)

