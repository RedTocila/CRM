import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: error.flatten() }, { status: 400 });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A record with this identifier already exists" },
        { status: 409 }
      );
    }
    if (error.code === "P2011") {
      return NextResponse.json(
        { error: "Missing required field — try again or contact support" },
        { status: 400 }
      );
    }
  }
  if (error instanceof Prisma.PrismaClientValidationError) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          "Database schema out of date. Run: npx prisma db push && npx prisma generate, then restart the dev server.",
      },
      { status: 500 }
    );
  }
  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
