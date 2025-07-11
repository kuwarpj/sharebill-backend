class ApiError extends Error {
  constructor(
    statusCode,
    message = "Something wnet wrong",
    errors = [],
    stack = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.message = message;
    this.success = statusCode < 400;

    if (data !== null && data !== undefined) {
      this.data = data;
    }
  }
}

const asyncHandler = (func) => {
  return (req, res, next) => {
    Promise.resolve(func(req, res, next)).catch((err) => next(err));
  };
};

export { ApiError, asyncHandler, ApiResponse };
