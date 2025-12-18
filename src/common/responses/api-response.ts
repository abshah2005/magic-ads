export class ApiResponse<T = any> {
  status: number;
  data: T;
  message: string;
  meta?: any;

  constructor(status: number, data: T, message = 'Success',meta?:any) {
    this.status = status;
    this.data = data;
    this.message = message;
    this.meta=meta;
  }

  static success<T>(data: T, message = 'Success', status = 200,meta?:any) {
    return new ApiResponse(status, data, message,meta);
  }
}
