// src/app/api/cargas/route.ts
import { connectMongoDB } from "@/lib/mongodb";
import { Carga } from "@/models/Carga";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    await connectMongoDB();
    const cargas = await Carga.find().sort({ fecha: -1 });
    return NextResponse.json(cargas);
}
