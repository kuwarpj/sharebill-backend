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


export {ApiResponse}