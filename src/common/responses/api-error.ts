export class ApiError {
  status: number;
  message: string;
  timestamp: string;

  constructor(
    status: number,
    message: string,
  ) {
    this.status = status;
    this.message = message;
    this.timestamp = new Date().toISOString();
  }
}
