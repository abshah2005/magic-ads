export class ApiResponse<T = unknown, M = unknown> {
  status: number;
  data: T;
  message: string;
  meta?: M;

  constructor(status: number, data: T, message = 'Success', meta?: M) {
    this.status = status;
    this.data = data;
    this.message = message;
    this.meta = meta;
  }

  static success<T, M>(data: T, message = 'Success', status = 200, meta?: M) {
    return new ApiResponse<T, M>(status, data, message, meta);
  }
}
