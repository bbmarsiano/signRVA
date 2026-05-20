// API errors — typed HTTP errors for REST and internal routes
export class ApiHttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiHttpError";
  }
}

export function jsonApiError(error: unknown) {
  if (error instanceof ApiHttpError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return Response.json({ error: "Вътрешна грешка на сървъра." }, { status: 500 });
}
