import { NextResponse } from "next/server";

export type ApiSuccess<T> = { success: true; data: T };
export type ApiFailure = { success: false; message: string };

export function jsonSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data } satisfies ApiSuccess<T>, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, message } satisfies ApiFailure, { status });
}

export function isApiFailure(value: unknown): value is ApiFailure {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    (value as ApiFailure).success === false
  );
}
